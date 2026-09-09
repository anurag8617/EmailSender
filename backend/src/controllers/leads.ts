import { z } from "zod";
import * as leadRepository from "../repositories/leads";
import { previewCsv, runImport, suggestMapping } from "../services/leads";
import { asyncHandler } from "../utils/asyncHandler";

const nullableString = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "" ? null : value));

const leadSchema = z.object({
  first_name: nullableString(255),
  last_name: nullableString(255),
  company: nullableString(255),
  email: z.string().trim().toLowerCase().email().max(255),
  website: nullableString(255),
  phone: nullableString(100),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  status: z.string().trim().min(1).max(20).optional(),
});

const leadUpdateSchema = leadSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  status: z.string().trim().max(20).optional(),
});

const paramIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listLeads = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const result = await leadRepository.list(query);
  res.json(result);
});

export const getLead = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const lead = await leadRepository.findById(id);
  if (!lead) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }
  res.json({ data: lead });
});

export const createLead = asyncHandler(async (req, res) => {
  const input = leadSchema.parse(req.body);
  const existing = await leadRepository.findByEmails([input.email]);
  if (existing.has(input.email)) {
    res.status(409).json({ message: "A lead with this email already exists" });
    return;
  }
  const id = await leadRepository.create(input);
  const lead = await leadRepository.findById(id);
  res.status(201).json({ data: lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const input = leadUpdateSchema.parse(req.body);

  const lead = await leadRepository.findById(id);
  if (!lead) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }

  if (input.email && input.email !== lead.email) {
    const existing = await leadRepository.findByEmails([input.email]);
    if (existing.has(input.email)) {
      res.status(409).json({ message: "A lead with this email already exists" });
      return;
    }
  }

  await leadRepository.update(id, input);
  const updated = await leadRepository.findById(id);
  res.json({ data: updated });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const deleted = await leadRepository.remove(id);
  if (!deleted) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }
  res.json({ ok: true });
});

export const previewImport = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "CSV file is required" });
    return;
  }
  const { columns, sample, rowCount } = previewCsv(req.file.buffer);
  if (columns.length === 0) {
    res.status(400).json({ message: "The CSV file has no columns or is empty" });
    return;
  }
  res.json({
    columns,
    sample,
    rowCount,
    suggestedMapping: suggestMapping(columns),
  });
});

export const importLeads = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "CSV file is required" });
    return;
  }

  let mapping: Record<string, string | null> = {};
  if (typeof req.body.mapping === "string" && req.body.mapping.length > 0) {
    try {
      mapping = JSON.parse(req.body.mapping);
    } catch {
      res.status(400).json({ message: "Invalid column mapping payload" });
      return;
    }
  }

  const summary = await runImport({
    buffer: req.file.buffer,
    mapping,
    userId: req.user!.userId,
    filename: req.file.originalname,
  });

  res.json({ summary });
});