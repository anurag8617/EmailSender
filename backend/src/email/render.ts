import { env } from "../config/env";
import { replaceVariables } from "../types/templates";

export interface RenderTemplateSource {
  subject: string;
  body: string;
  footer?: string | null;
}

export interface RenderLead {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string;
  website: string | null;
  phone?: string | null;
  custom_data?: Record<string, unknown> | null;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(
  template: RenderTemplateSource,
  lead: RenderLead,
  senderName: string | null,
  campaignId: number
): RenderedEmail {
  const unsubscribeUrl = `${env.publicUrl}/api/unsubscribe?email=${encodeURIComponent(
    lead.email
  )}&campaign_id=${campaignId}`;

  const values: Record<string, string> = {
    first_name: lead.first_name ?? "",
    last_name: lead.last_name ?? "",
    company: lead.company ?? "",
    email: lead.email,
    website: lead.website ?? "",
    phone: lead.phone ?? "",
    sender_name: senderName ?? "",
    unsubscribe_url: unsubscribeUrl,
  };

  if (lead.custom_data) {
    for (const [key, value] of Object.entries(lead.custom_data)) {
      if (key in values || value == null) continue;
      values[key] = String(value);
    }
  }

  const subject = replaceVariables(template.subject, values).trim();
  const body = replaceVariables(template.body, values).trim();
  const footer = template.footer ? replaceVariables(template.footer, values).trim() : "";

  const text = [body, footer].filter(Boolean).join("\n\n");
  const html = text
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");
  const htmlBody = `<div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.5;">${html}</div>`;

  return { subject, text, html: htmlBody, unsubscribeUrl };
}