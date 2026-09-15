import { z } from "zod";
import * as leadRepository from "../repositories/leads";
import * as leadListRepository from "../repositories/leadLists";
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
  subject: nullableString(255),
  message: nullableString(5000),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  status: z.string().trim().min(1).max(20).optional(),
  list_id: z.coerce.number().int().positive().optional(),
  list_name: z.string().trim().min(1).max(255).optional(),
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

  const { list_id, list_name, ...leadInput } = input;

  let slotId: number | null = null;
  let slotName: string | null = null;
  if (list_id) {
    const list = await leadListRepository.findById(list_id, req.user!.userId);
    if (!list) {
      res.status(400).json({ message: "Lead list not found or does not belong to you" });
      return;
    }
    slotId = list.id;
    slotName = list.name;
  } else if (list_name) {
    slotId = await leadListRepository.create(req.user!.userId, list_name);
    slotName = list_name;
  }

  const id = await leadRepository.create(leadInput);
  const lead = await leadRepository.findById(id);

  if (slotId !== null) {
    const added = await leadListRepository.addMembers(slotId, req.user!.userId, [id]);
    if (added === -1) {
      res.status(400).json({ message: "Lead list not found or does not belong to you" });
      return;
    }
  }

  res.status(201).json({ data: lead, slot: slotId !== null ? { id: slotId, name: slotName } : null });
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

  let targetList: { id?: number; name?: string } | null = null;
  const listIdRaw = req.body.list_id;
  const listName = typeof req.body.list_name === "string" ? req.body.list_name.trim() : "";
  if (listName) {
    targetList = { name: listName };
  } else if (listIdRaw !== undefined && listIdRaw !== null && listIdRaw !== "") {
    const listId = Number(listIdRaw);
    if (!Number.isInteger(listId) || listId <= 0) {
      res.status(400).json({ message: "Invalid lead list id" });
      return;
    }
    targetList = { id: listId };
  }

  const summary = await runImport({
    buffer: req.file.buffer,
    mapping,
    userId: req.user!.userId,
    filename: req.file.originalname,
    targetList,
  });

  res.json({ summary });
});