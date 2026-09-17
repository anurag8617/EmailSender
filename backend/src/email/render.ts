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

function stripUnsubscribeLines(value: string): string {
  return value
    .split("\n")
    .filter((line) => !/\{\{\s*unsubscribe_url\s*\}\}/i.test(line))
    .join("\n");
}

function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
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
  const body = replaceVariables(stripUnsubscribeLines(template.body), values).trim();
  const footer = template.footer
    ? replaceVariables(stripUnsubscribeLines(template.footer), values).trim()
    : "";

  const text = [body, footer].filter(Boolean).join("\n\n");
  const htmlBody = `<div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.5;">${textToHtml(
    text
  )}</div>`;

  return { subject, text, html: htmlBody, unsubscribeUrl };
}