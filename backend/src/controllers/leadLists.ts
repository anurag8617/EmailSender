import { z } from "zod";
import * as leadListRepository from "../repositories/leadLists";
import { asyncHandler } from "../utils/asyncHandler";

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
});

const membersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
});

const paramIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const memberIdsSchema = z.object({
  lead_ids: z.array(z.coerce.number().int().positive()).min(1),
});

export const listLeadLists = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const result = await leadListRepository.list({ userId: req.user!.userId, ...query });
  res.json(result);
});

export const getLeadList = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const list = await leadListRepository.findById(id, req.user!.userId);
  if (!list) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }
  res.json({ data: list });
});

export const createLeadList = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const id = await leadListRepository.create(req.user!.userId, input.name);
  const list = await leadListRepository.findById(id, req.user!.userId);
  res.status(201).json({ data: list });
});

export const updateLeadList = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const input = updateSchema.parse(req.body);

  const list = await leadListRepository.findById(id, req.user!.userId);
  if (!list) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }

  await leadListRepository.update(id, req.user!.userId, input.name);
  const updated = await leadListRepository.findById(id, req.user!.userId);
  res.json({ data: updated });
});

export const deleteLeadList = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const deleted = await leadListRepository.remove(id, req.user!.userId);
  if (!deleted) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }
  res.json({ ok: true });
});

export const listMembers = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const query = membersQuerySchema.parse(req.query);

  const list = await leadListRepository.findById(id, req.user!.userId);
  if (!list) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }

  const result = await leadListRepository.membersOfList(id, req.user!.userId, query);
  res.json(result);
});

export const addMembers = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const { lead_ids } = memberIdsSchema.parse(req.body);

  const list = await leadListRepository.findById(id, req.user!.userId);
  if (!list) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }

  const added = await leadListRepository.addMembers(id, req.user!.userId, lead_ids);
  if (added === -1) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }

  const updated = await leadListRepository.findById(id, req.user!.userId);
  res.json({ data: updated, added });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { id, leadId } = z
    .object({ id: z.coerce.number().int().positive(), leadId: z.coerce.number().int().positive() })
    .parse(req.params);

  const list = await leadListRepository.findById(id, req.user!.userId);
  if (!list) {
    res.status(404).json({ message: "Lead list not found" });
    return;
  }

  const removed = await leadListRepository.removeMember(id, req.user!.userId, leadId);
  if (!removed) {
    res.status(404).json({ message: "Lead is not in this list" });
    return;
  }

  const updated = await leadListRepository.findById(id, req.user!.userId);
  res.json({ data: updated });
});