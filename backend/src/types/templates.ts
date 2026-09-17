export interface Template {
  id: number;
  user_id: number;
  name: string;
  subject: string;
  body: string;
  footer: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateInput {
  name: string;
  subject?: string;
  body: string;
  footer?: string | null;
}

export type TemplateUpdate = Partial<TemplateInput>;

export interface RenderResult {
  subject: string;
  body: string;
  footer: string;
  variables: string[];
  custom: string[];
  missing: string[];
}

export const SUPPORTED_VARIABLES: Record<string, string> = {
  first_name: "Alex",
  last_name: "Morgan",
  company: "Acme Widgets",
  email: "alex@acmewidgets.com",
  website: "acmewidgets.com",
  phone: "555-0100",
  sender: "Your Name",
  sender_name: "Your Name",
  unsubscribe_url: "https://app.example.com/unsubscribe",
};

export const VARIABLE_NAMES = Object.keys(SUPPORTED_VARIABLES);

const VARIABLE_RE = /\{\{\s*([\w_.-]+)\s*\}\}/g;

export function extractVariables(text: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  VARIABLE_RE.lastIndex = 0;
  while ((match = VARIABLE_RE.exec(text)) !== null) {
    vars.add(match[1]);
  }
  return [...vars];
}

export function replaceVariables(text: string, values: Record<string, string>): string {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    const val = String(v ?? "");
    normalized[k.toLowerCase()] = val;
    normalized[k.toLowerCase().replace(/[_-]/g, "")] = val;
  }

  // Aliases
  if (normalized.sender_name && !normalized.sender) {
    normalized.sender = normalized.sender_name;
  }
  if (normalized.sender && !normalized.sender_name) {
    normalized.sender_name = normalized.sender;
  }
  if (normalized.first_name && !normalized.name) {
    normalized.name = normalized.first_name;
  }

  return text.replace(VARIABLE_RE, (_full, raw: string) => {
    const key = String(raw).trim().toLowerCase();
    const stripped = key.replace(/[_-]/g, "");
    if (key in normalized) return normalized[key];
    if (stripped in normalized) return normalized[stripped];
    // If unknown variable, do NOT leave raw {{tag}} which triggers spam filters
    return "";
  });
}

export function renderTemplate(
  subject: string,
  body: string,
  footer?: string | null,
  values?: Record<string, string>
): RenderResult {
  const footerText = footer?.trim() ?? "";
  const source = [subject, body, footerText].filter(Boolean).join("\n");
  const variables = extractVariables(source);
  const sample = values ?? SUPPORTED_VARIABLES;
  const custom = variables.filter((variable) => !(variable in SUPPORTED_VARIABLES));
  const missing = variables.filter((variable) => !(variable in sample));
  return {
    subject: replaceVariables(subject, sample),
    body: replaceVariables(body, sample),
    footer: footerText ? replaceVariables(footerText, sample) : "",
    variables,
    custom,
    missing,
  };
}