import { Lead } from "./leads";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  status: CampaignStatus;
  start_at: string | null;
  end_at: string | null;
  daily_limit: number;
  hourly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignCounts {
  leads: number;
  sent: number;
  failed: number;
  bounced: number;
  unsubscribed: number;
}

export interface CampaignSummary extends Campaign {
  counts: CampaignCounts;
  progress: number;
}

export interface CampaignInput {
  name: string;
  start_at?: string | null;
  end_at?: string | null;
  daily_limit?: number;
  hourly_limit?: number;
}

export interface CampaignStats {
  counts: CampaignCounts;
  progress: number;
}

export interface CampaignDetail extends Campaign {
  counts: CampaignCounts;
  progress: number;
  template_id: number | null;
  template_name: string | null;
  leads: CampaignRecipient[];
  accounts: {
    id: number;
    email: string;
    status: string;
  }[];
}

export interface CampaignRecipient extends Lead {
  job_id: number | null;
  job_status: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  attempts: number;
  error_message: string | null;
}

export function computeProgress(counts: CampaignCounts): number {
  if (counts.leads === 0) return 0;
  return Math.min(100, Math.round((counts.sent / counts.leads) * 100));
}

export const VALID_TRANSITIONS: Record<string, CampaignStatus[]> = {
  start: ["DRAFT"],
  resume: ["PAUSED"],
  pause: ["ACTIVE"],
  cancel: ["DRAFT", "ACTIVE", "PAUSED"],
};