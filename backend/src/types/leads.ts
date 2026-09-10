export interface Lead {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
  website: string | null;
  phone: string | null;
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
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "company", label: "Company" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
];

export const FIELD_ALIASES: Record<string, string[]> = {
  email: ["email", "e-mail", "e-mail address", "email address"],
  first_name: ["first_name", "firstname", "first name", "first"],
  last_name: ["last_name", "lastname", "last name", "last"],
  company: ["company", "company name", "organization", "organisation", "org"],
  website: ["website", "site", "web", "url", "domain"],
  phone: ["phone", "phone number", "tel", "telephone", "mobile", "contact number"],
};