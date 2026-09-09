export type SuppressionReason =
  | "UNSUBSCRIBED"
  | "BOUNCED"
  | "COMPLAINT"
  | "MANUALLY_BLOCKED";

export type Suppression = {
  id: number;
  email: string;
  reason: SuppressionReason;
  source: string | null;
  created_at: string;
};

export interface SuppressionListParams {
  page: number;
  pageSize: number;
  search?: string;
  reason?: string;
}

export interface SuppressionListResult {
  rows: Suppression[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}