import { z } from "zod";
import * as templateRepository from "../repositories/templates";
import { renderTemplate, SUPPORTED_VARIABLES } from "../types/templates";
import { asyncHandler } from "../utils/asyncHandler";

const templateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1),
});

const templateUpdateSchema = templateSchema.partial();

const renderSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
  variables: z.record(z.string(), z.string()).optional(),
});

const paramIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listTemplates = asyncHandler(async (req, res) => {
  const templates = await templateRepository.list(req.user!.userId);
  res.json({ data: templates });
});

export const getTemplate = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const template = await templateRepository.findById(id, req.user!.userId);
  if (!template) {
    res.status(404).json({ message: "Template not found" });
    return;
  }
  res.json({ data: template });
});

export const previewTemplate = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const template = await templateRepository.findById(id, req.user!.userId);
  if (!template) {
    res.status(404).json({ message: "Template not found" });
    return;
  }
  res.json({ data: renderTemplate(template.subject, template.body) });
});

export const renderTemplateText = asyncHandler(async (req, res) => {
  const input = renderSchema.parse(req.body);
  res.json({
    data: renderTemplate(input.subject ?? "", input.body, input.variables ?? undefined),
  });
});

export const createTemplate = asyncHandler(async (req, res) => {
  const input = templateSchema.parse(req.body);
  const id = await templateRepository.create(req.user!.userId, input);
  const template = await templateRepository.findById(id, req.user!.userId);
  res.status(201).json({ data: template });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const input = templateUpdateSchema.parse(req.body);
  const userId = req.user!.userId;

  const existing = await templateRepository.findById(id, userId);
  if (!existing) {
    res.status(404).json({ message: "Template not found" });
    return;
  }

  await templateRepository.update(id, userId, input);
  const template = await templateRepository.findById(id, userId);
  res.json({ data: template });
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const deleted = await templateRepository.remove(id, req.user!.userId);
  if (!deleted) {
    res.status(404).json({ message: "Template not found" });
    return;
  }
  res.json({ ok: true });
});

export const listSupportedVariables = asyncHandler(async (_req, res) => {
  res.json({ data: Object.keys(SUPPORTED_VARIABLES) });
});