import { z } from "zod";
import * as campaignRepository from "../repositories/campaigns";
import * as templateRepository from "../repositories/templates";
import {
  Campaign,
  CampaignCounts,
  CampaignDetail,
  CampaignSummary,
  computeProgress,
  VALID_TRANSITIONS,
} from "../types/campaigns";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const EMPTY_COUNTS: CampaignCounts = { leads: 0, sent: 0, failed: 0, bounced: 0, unsubscribed: 0 };

function normalizeDateTime(value: string): string {
  const normalized = value.includes("T") ? value.replace("T", " ") : value;
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

const optionalDateTime = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const normalized = normalizeDateTime(value);
    if (Number.isNaN(Date.parse(normalized))) {
      throw new Error("Invalid date-time");
    }
    return normalized;
  });

const campaignSchema = z.object({
  name: z.string().trim().min(1).max(255),
  start_at: optionalDateTime,
  end_at: optionalDateTime,
  daily_limit: z.coerce.number().int().min(1).max(100000).optional(),
  hourly_limit: z.coerce.number().int().min(1).max(1000).optional(),
  template_id: z.coerce.number().int().positive().nullable().optional(),
  lead_ids: z.array(z.coerce.number().int().positive()).optional(),
  account_ids: z.array(z.coerce.number().int().positive()).optional(),
});

const campaignUpdateSchema = campaignSchema.optional().refine((value) => value !== undefined, {
  message: "At least one updatable field is required",
});

const paramIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function buildSummary(campaign: Campaign): Promise<CampaignSummary> {
  const countsMap = await campaignRepository.statsFor([campaign.id]);
  const counts = countsMap.get(campaign.id) ?? EMPTY_COUNTS;
  return { ...campaign, counts, progress: computeProgress(counts) };
}

async function buildDetail(campaign: Campaign): Promise<CampaignDetail> {
  const [countsMap, leads, accounts, template] = await Promise.all([
    campaignRepository.statsFor([campaign.id]),
    campaignRepository.leadsOfCampaign(campaign.id),
    campaignRepository.accountsOfCampaign(campaign.id),
    campaignRepository.templateForCampaign(campaign.id),
  ]);
  const counts = countsMap.get(campaign.id) ?? EMPTY_COUNTS;
  return {
    ...campaign,
    counts,
    progress: computeProgress(counts),
    template_id: template?.id ?? null,
    template_name: template?.name ?? null,
    leads,
    accounts,
  };
}

async function validateAccounts(userId: number, accountIds: number[]): Promise<number[]> {
  if (accountIds.length === 0) return [];
  const owned = await campaignRepository.ownedAccountIds(userId, accountIds);
  if (owned.length !== accountIds.length) {
    throw new AppError("Some selected sender accounts do not exist", 400);
  }
  return owned;
}

async function validateLeads(leadIds: number[]): Promise<number[]> {
  if (leadIds.length === 0) return [];
  const existing = await campaignRepository.existingLeadIds(leadIds);
  if (existing.length !== leadIds.length) {
    throw new AppError("Some selected leads do not exist", 400);
  }
  return existing;
}

async function validateTemplate(userId: number, templateId: number): Promise<number> {
  const template = await templateRepository.findById(templateId, userId);
  if (!template) {
    throw new AppError("Selected email template does not exist", 400);
  }
  return template.id;
}

async function transitionCampaign(
  campaignId: number,
  userId: number,
  action: "start" | "pause" | "resume" | "cancel"
): Promise<CampaignSummary> {
  const campaign = await campaignRepository.findById(campaignId, userId);
  if (!campaign) {
    throw new AppError("Campaign not found", 404);
  }

  const allowed = VALID_TRANSITIONS[action];
  if (!allowed.includes(campaign.status)) {
    throw new AppError(
      `Cannot ${action} a ${campaign.status} campaign (allowed from: ${allowed.join(", ")})`,
      409
    );
  }

  if (action === "start" || action === "resume") {
    const [leads, accounts, template] = await Promise.all([
      campaignRepository.campaignLeadCount(campaignId),
      campaignRepository.campaignAccountCount(campaignId),
      campaignRepository.templateForCampaign(campaignId),
    ]);
    if (leads === 0) {
      throw new AppError("Add at least one lead before starting the campaign", 400);
    }
    if (accounts === 0) {
      throw new AppError("Select at least one sender account before starting the campaign", 400);
    }
    if (!template) {
      throw new AppError("Select an email template before starting the campaign", 400);
    }
  }

  const updated = await campaignRepository.transition(campaignId, userId, action);
  return buildSummary(updated!);
}

export const listCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await campaignRepository.list(req.user!.userId);
  const countsMap = await campaignRepository.statsFor(campaigns.map((c) => c.id));
  const data: CampaignSummary[] = campaigns.map((campaign) => {
    const counts = countsMap.get(campaign.id) ?? EMPTY_COUNTS;
    return { ...campaign, counts, progress: computeProgress(counts) };
  });
  res.json({ data });
});

export const getCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const campaign = await campaignRepository.findById(id, req.user!.userId);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  res.json({ data: await buildDetail(campaign) });
});

export const getCampaignStats = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const campaign = await campaignRepository.findById(id, req.user!.userId);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  const summary = await buildSummary(campaign);
  res.json({ data: { counts: summary.counts, progress: summary.progress } });
});

export const createCampaign = asyncHandler(async (req, res) => {
  const input = campaignSchema.parse(req.body);
  const userId = req.user!.userId;

  const accountIds = await validateAccounts(userId, input.account_ids ?? []);
  const leadIds = await validateLeads(input.lead_ids ?? []);
  const templateId = input.template_id
    ? await validateTemplate(userId, input.template_id)
    : null;
  const id = await campaignRepository.create(userId, input);

  if (templateId) {
    await campaignRepository.setTemplateStep(id, templateId);
  }
  if (leadIds.length > 0) {
    await campaignRepository.replaceLeads(id, leadIds);
  }
  if (accountIds.length > 0) {
    await campaignRepository.replaceAccounts(id, accountIds);
  }

  const campaign = await campaignRepository.findById(id, userId);
  res.status(201).json({ data: await buildDetail(campaign!) });
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const input = campaignUpdateSchema.parse(req.body);
  const userId = req.user!.userId;

  const campaign = await campaignRepository.findById(id, userId);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  if (campaign.status === "ACTIVE") {
    res.status(409).json({ message: "Pause the campaign before making changes" });
    return;
  }

  await campaignRepository.update(id, userId, input);

  if (input.lead_ids) {
    const leadIds = await validateLeads(input.lead_ids);
    await campaignRepository.replaceLeads(id, leadIds);
  }
  if (input.account_ids) {
    const accountIds = await validateAccounts(userId, input.account_ids);
    await campaignRepository.replaceAccounts(id, accountIds);
  }
  if (input.template_id) {
    const templateId = await validateTemplate(userId, input.template_id);
    await campaignRepository.setTemplateStep(id, templateId);
  }

  const updated = await campaignRepository.findById(id, userId);
  res.json({ data: await buildDetail(updated!) });
});

export const deleteCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  const userId = req.user!.userId;

  const campaign = await campaignRepository.findById(id, userId);
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return;
  }
  if (campaign.status === "ACTIVE" || campaign.status === "PAUSED") {
    res.status(409).json({ message: "Cancel the campaign before deleting it" });
    return;
  }

  await campaignRepository.remove(id, userId);
  res.json({ ok: true });
});

export const startCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  res.json({ data: await transitionCampaign(id, req.user!.userId, "start") });
});

export const pauseCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  res.json({ data: await transitionCampaign(id, req.user!.userId, "pause") });
});

export const resumeCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  res.json({ data: await transitionCampaign(id, req.user!.userId, "resume") });
});

export const cancelCampaign = asyncHandler(async (req, res) => {
  const { id } = paramIdSchema.parse(req.params);
  res.json({ data: await transitionCampaign(id, req.user!.userId, "cancel") });
});