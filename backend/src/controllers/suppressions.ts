import { z } from "zod";
import * as suppressionRepository from "../repositories/suppressions";
import { asyncHandler } from "../utils/asyncHandler";

const SUPPRESSION_REASONS = ["UNSUBSCRIBED", "BOUNCED", "COMPLAINT", "MANUALLY_BLOCKED"] as const;

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  reason: z.enum(SUPPRESSION_REASONS).default("MANUALLY_BLOCKED"),
  source: z.string().trim().max(100).default("manual"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  reason: z.enum(SUPPRESSION_REASONS).optional(),
});

const paramIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listSuppressions = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const result = await suppressionRepository.list(query);
  res.json(result);
});

export const createSuppression = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);

  const existing = await suppressionRepository.findByEmail(input.email);
  if (existing) {
    res.status(409).json({ message: `${input.email} is already on the suppression list` });
    return;
  }

  await suppressionRepository.addSuppression(input.email, input.reason, input.source);
  const suppression = await suppressionRepository.findByEmail(input.email);
  res.status(201).json({ data: suppression });
});

export const removeSuppression = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const removed = await suppressionRepository.remove(id);
  if (!removed) {
    res.status(404).json({ message: "Suppression not found" });
    return;
  }
  res.json({ ok: true });
});