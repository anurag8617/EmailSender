export type JobStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED" | "SKIPPED";

export interface EmailJob {
  id: number;
  campaign_id: number;
  lead_id: number;
  email_account_id: number | null;
  template_id: number | null;
  scheduled_at: string | null;
  status: JobStatus;
  attempts: number;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const MAX_ATTEMPTS = 3;

export function retryDelayMs(attempts: number): number {
  const minutes = Math.min(60, 5 * 2 ** Math.max(0, attempts - 1));
  return minutes * 60 * 1000;
}