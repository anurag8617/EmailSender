export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
};

export type Lead = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
  website: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  custom_data: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type LeadList = {
  rows: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LeadGroup = {
  id: number;
  user_id: number;
  name: string;
  lead_count: number;
  created_at: string;
  updated_at: string;
};

export type LeadGroupList = {
  rows: LeadGroup[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ImportSummary = {
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  importId?: number;
  slotId?: number | null;
  slotName?: string | null;
};

export type ImportPreview = {
  columns: string[];
  sample: Record<string, string>[];
  rowCount: number;
  suggestedMapping: Record<string, string | null>;
};

export type AccountStatus = "active" | "disabled";

export type EmailAccountServer = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
};

export type EmailAccount = {
  id: number;
  email: string;
  provider: string;
  auth_type: string;
  daily_limit: number;
  hourly_limit: number;
  sent_today: number;
  last_sent_at: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
  server: EmailAccountServer;
};

export type AccountStats = {
  sentToday: number;
  sentThisHour: number;
  sentTotal: number;
  failedTotal: number;
  bouncedTotal: number;
};

export type AccountFormValues = {
  email: string;
  host: string;
  port: string;
  secure: string;
  username: string;
  password: string;
  daily_limit: string;
  hourly_limit: string;
};

export type Template = {
  id: number;
  user_id: number;
  name: string;
  subject: string;
  body: string;
  footer: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateRender = {
  subject: string;
  body: string;
  footer: string;
  variables: string[];
  custom: string[];
  missing: string[];
};

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type CampaignCounts = {
  leads: number;
  sent: number;
  failed: number;
  bounced: number;
  unsubscribed: number;
};

export type CampaignSummary = {
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
  counts: CampaignCounts;
  progress: number;
};

export type CampaignRecipient = Lead & {
  job_id: number | null;
  job_status: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  attempts: number;
  error_message: string | null;
};

export type CampaignDetail = CampaignSummary & {
  template_id: number | null;
  template_name: string | null;
  leads: CampaignRecipient[];
  accounts: { id: number; email: string; status: string }[];
};

export type CampaignFormValues = {
  name: string;
  start_at: string;
  end_at: string;
  daily_limit: string;
  hourly_limit: string;
  template_id: number | null;
  lead_ids: number[];
  account_ids: number[];
};

export type SuppressionReason = "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINT" | "MANUALLY_BLOCKED";

export type Suppression = {
  id: number;
  email: string;
  reason: SuppressionReason;
  source: string | null;
  created_at: string;
};

export type SuppressionList = {
  rows: Suppression[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DashboardAccountStat = {
  id: number;
  email: string;
  status: string;
  daily_limit: number;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  bounced_total: number;
};

export type DashboardStats = {
  totalLeads: number;
  activeCampaigns: number;
  emailsSent: number;
  emailsFailed: number;
  bounces: number;
  unsubscribes: number;
  availableAccounts: number;
  sentToday: number;
  accounts: DashboardAccountStat[];
};

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });

    if (res.status === 204) {
      return { ok: true, status: res.status, data: null };
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: typeof data?.message === "string" ? data.message : "Request failed",
      };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Could not reach the API server",
    };
  }
}

export async function apiUpload<T = unknown>(
  path: string,
  file: File,
  fields?: Record<string, string>
): Promise<ApiResult<T>> {
  try {
    const form = new FormData();
    form.append("file", file);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, value);
      }
    }

    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: typeof data?.message === "string" ? data.message : "Upload failed",
      };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Could not reach the API server",
    };
  }
}