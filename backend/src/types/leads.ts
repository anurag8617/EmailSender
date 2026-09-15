export interface Lead {
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
}

export interface LeadInput {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email: string;
  website?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  custom_data?: Record<string, unknown> | null;
  status?: string;
}

export interface ImportField {
  key: keyof Omit<Lead, "id" | "created_at" | "updated_at" | "custom_data" | "status">;
  label: string;
  required?: boolean;
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  importId?: number;
  slotId?: number | null;
  slotName?: string | null;
}

export interface PreviewRow {
  columns: string[];
  sample: Record<string, string>[];
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: "email", label: "Email", required: true },
  { key: "message", label: "Email message" },
];

export const FIELD_ALIASES: Record<string, string[]> = {
  email: ["email", "e-mail", "e-mail address", "email address"],
  message: ["message", "email message", "email", "e-mail", "mail", "body", "content", "message text"],
};