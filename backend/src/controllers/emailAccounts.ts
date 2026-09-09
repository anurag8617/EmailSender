import { z } from "zod";
import * as emailAccountRepository from "../repositories/emailAccounts";
import { testSmtpConnection, TestConnectionError, toPublic } from "../services/emailAccounts";
import { asyncHandler } from "../utils/asyncHandler";
import { resolveSecureCredentials } from "../utils/smtp";

const credentialsSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.coerce.boolean().default(true),
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(512),
});

const baseAccountSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).email(),
  provider: z.string().trim().min(1).max(100).default("smtp"),
  auth_type: z.string().trim().min(1).max(50).default("password"),
  daily_limit: z.coerce.number().int().min(1).max(100000).default(50),
  hourly_limit: z.coerce.number().int().min(1).max(1000).default(10),
  status: z.enum(["active", "disabled"]).optional(),
});

const createAccountSchema = baseAccountSchema.extend({
  credentials: credentialsSchema,
});

const updateAccountSchema = baseAccountSchema.partial().extend({
  credentials: credentialsSchema.optional(),
});

const paramIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

function publicAccount(id: number, userId: number) {
  return emailAccountRepository.findById(id, userId).then((row) => (row ? toPublic(row) : null));
}

export const listAccounts = asyncHandler(async (req, res) => {
  const rows = await emailAccountRepository.list(req.user!.userId);
  res.json({ data: rows.map(toPublic) });
});

export const getAccount = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const account = await publicAccount(id, req.user!.userId);
  if (!account) {
    res.status(404).json({ message: "Email account not found" });
    return;
  }
  res.json({ data: account });
});

export const createAccount = asyncHandler(async (req, res) => {
  const input = createAccountSchema.parse(req.body);
  const userId = req.user!.userId;

  if (await emailAccountRepository.findByEmail(userId, input.email)) {
    res.status(409).json({ message: "An account with this email already exists" });
    return;
  }

  const id = await emailAccountRepository.create({
    userId,
    email: input.email,
    provider: input.provider,
    auth_type: input.auth_type,
    credentialsReference: emailAccountRepository.serializeCredentials(
      resolveSecureCredentials(input.credentials)
    ),
    daily_limit: input.daily_limit,
    hourly_limit: input.hourly_limit,
    status: input.status ?? "active",
  });

  const account = await publicAccount(id, userId);
  res.status(201).json({ data: account });
});

export const updateAccount = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const input = updateAccountSchema.parse(req.body);
  const userId = req.user!.userId;

  const existing = await emailAccountRepository.findById(id, userId);
  if (!existing) {
    res.status(404).json({ message: "Email account not found" });
    return;
  }

  if (input.email && input.email !== existing.email) {
    if (await emailAccountRepository.findByEmail(userId, input.email)) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }
  }

  await emailAccountRepository.update(id, userId, {
    email: input.email,
    provider: input.provider,
    auth_type: input.auth_type,
    status: input.status,
    daily_limit: input.daily_limit,
    hourly_limit: input.hourly_limit,
    credentialsReference: input.credentials
      ? emailAccountRepository.serializeCredentials(resolveSecureCredentials(input.credentials))
      : undefined,
  });

  const account = await publicAccount(id, userId);
  res.json({ data: account });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const deleted = await emailAccountRepository.remove(id, req.user!.userId);
  if (!deleted) {
    res.status(404).json({ message: "Email account not found" });
    return;
  }
  res.json({ ok: true });
});

export const setAccountStatus = (status: "active" | "disabled") =>
  asyncHandler(async (req, res) => {
    const { id } = paramIdSchema.parse(req.params);
    const userId = req.user!.userId;
    const updated = await emailAccountRepository.setStatus(id, userId, status);
    if (!updated) {
      res.status(404).json({ message: "Email account not found" });
      return;
    }
    const account = await publicAccount(id, userId);
    res.json({ data: account });
  });

export const testAccount = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const userId = req.user!.userId;

  const existing = await emailAccountRepository.findById(id, userId);
  if (!existing) {
    res.status(404).json({ message: "Email account not found" });
    return;
  }

  const credentials = emailAccountRepository.deserializeCredentials(existing.credentials_reference);
  try {
    await testSmtpConnection(credentials);
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof TestConnectionError) {
      if (error.authFailure) {
        await emailAccountRepository.setStatus(id, userId, "disabled");
      }
      res.status(400).json({ message: error.message, authFailure: error.authFailure });
      return;
    }
    throw error;
  }
});

export const getAccountStats = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const userId = req.user!.userId;

  const existing = await emailAccountRepository.findById(id, userId);
  if (!existing) {
    res.status(404).json({ message: "Email account not found" });
    return;
  }

  const stats = await emailAccountRepository.stats(id, userId);
  res.json({ data: stats });
});