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
  return text.replace(VARIABLE_RE, (full, raw: string) => {
    const key = String(raw).trim();
    return key in values ? values[key] : full;
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