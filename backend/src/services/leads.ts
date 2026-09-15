import { parse } from "csv-parse/sync";
import * as leadRepository from "../repositories/leads";
import * as leadListRepository from "../repositories/leadLists";
import {
  FIELD_ALIASES,
  IMPORT_FIELDS,
  ImportSummary,
  LeadInput,
} from "../types/leads";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValid(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function splitEmailText(
  text: string | null
): { subject: string | null; body: string | null } {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { subject: null, body: null };
  const subjectMatch = trimmed.match(/^[Ss]ubject\s*:\s*(.*?)\r?\n([\s\S]*)$/);
  if (subjectMatch) {
    const subject = subjectMatch[1].trim();
    const body = subjectMatch[2].trim();
    return { subject: subject || null, body: body || null };
  }
  const lineEnd = trimmed.indexOf("\n");
  if (lineEnd === -1) {
    return { subject: trimmed, body: null };
  }
  const subject = trimmed.slice(0, lineEnd).trim();
  const body = trimmed.slice(lineEnd + 1).trim();
  return { subject: subject || null, body: body || null };
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

export function getCell(row: Record<string, unknown>, header: string): string | null {
  if (!header) return null;
  if (Object.prototype.hasOwnProperty.call(row, header)) {
    const value = row[header];
    if (value == null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }
  // Case-insensitive fallback for headers whose exact case differs.
  const key = Object.keys(row).find((k) => normalizeHeader(k) === normalizeHeader(header));
  if (key) {
    const value = row[key];
    if (value == null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

export function suggestMapping(columns: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  for (const field of IMPORT_FIELDS) {
    const aliases = FIELD_ALIASES[field.key];
    const hit = columns.find((column) => aliases.includes(normalizeHeader(column)));
    mapping[field.key] = hit ?? null;
  }
  return mapping;
}

export function parseCsv(buffer: Buffer): Record<string, unknown>[] {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    bom: true,
  }) as Record<string, unknown>[];
}

export function previewCsv(buffer: Buffer, sampleSize = 5) {
  const rows = parseCsv(buffer);
  if (rows.length === 0) {
    return { columns: [] as string[], sample: [] as Record<string, string>[], rowCount: 0 };
  }
  const columns = Object.keys(rows[0]);
  const sample = rows.slice(0, sampleSize).map((row) => {
    const out: Record<string, string> = {};
    for (const column of columns) {
      out[column] = getCell(row, column) ?? "";
    }
    return out;
  });
  return { columns, sample, rowCount: rows.length };
}

export async function resolveSlot(
  listRepository: typeof leadListRepository,
  userId: number,
  targetList: { id?: number; name?: string } | null
): Promise<{ id: number; name: string } | null> {
  if (!targetList) return null;
  if (targetList.id) {
    const list = await listRepository.findById(targetList.id, userId);
    return list ? { id: list.id, name: list.name } : null;
  }
  if (targetList.name) {
    const id = await listRepository.create(userId, targetList.name);
    return { id, name: targetList.name };
  }
  return null;
}

export async function assignLeadsToSlot(
  listRepository: typeof leadListRepository,
  userId: number,
  slot: { id: number; name: string },
  leadIds: number[]
): Promise<void> {
  await listRepository.addMembers(slot.id, userId, leadIds);
}

export async function runImport(input: {
  buffer: Buffer;
  mapping: Record<string, string | null>;
  userId: number;
  filename: string;
  targetList?: { id?: number; name?: string } | null;
}): Promise<ImportSummary> {
  const rows = parseCsv(input.buffer);
  const totalRows = rows.length;

  let imported = 0;
  let duplicates = 0;
  let invalid = 0;

  if (totalRows === 0) {
    const importId = await leadRepository.createImportHistory({
      userId: input.userId,
      filename: input.filename,
      totalRows,
      imported,
      duplicates,
      invalid,
    });
    return { totalRows, imported, duplicates, invalid, importId };
  }

  const columns = Object.keys(rows[0]);
  const mapping =
    input.mapping && Object.values(input.mapping).some(Boolean)
      ? input.mapping
      : suggestMapping(columns);

  const toInsert: LeadInput[] = [];
  const seenInFile = new Set<string>();
  const existingEmails = await leadRepository.findByEmails(
    rows
      .map((row) => getCell(row, mapping["email"] ?? "") ?? "")
      .filter((email) => isEmailValid(email))
      .map((email) => email.toLowerCase())
  );

  for (const row of rows) {
    const email = getCell(row, mapping["email"] ?? "");
    const emailLower = email?.toLowerCase() ?? "";

    if (!email || !isEmailValid(emailLower)) {
      invalid++;
      continue;
    }
    if (seenInFile.has(emailLower) || existingEmails.has(emailLower)) {
      duplicates++;
      existingEmails.set(emailLower, existingEmails.get(emailLower) ?? -1);
      continue;
    }
    seenInFile.add(emailLower);

    const customData: Record<string, unknown> = {};
    const mappedHeaders = new Set(Object.values(mapping).filter(Boolean) as string[]);
    for (const column of columns) {
      if (mappedHeaders.has(column)) continue;
      const value = getCell(row, column);
      if (value !== null) customData[column.trim()] = value;
    }

    const message = getCell(row, mapping["message"] ?? "");
    const { subject, body } = splitEmailText(message);

    toInsert.push({
      email: emailLower,
      subject,
      message: body,
      first_name: null,
      last_name: null,
      company: null,
      website: null,
      phone: null,
      custom_data: Object.keys(customData).length > 0 ? customData : null,
    });
  }

  if (toInsert.length > 0) {
    imported = await leadRepository.bulkCreate(toInsert);
  }

  let slotId: number | null = null;
  let slotName: string | null = null;

  if (toInsert.length > 0) {
    const slot = await resolveSlot(leadListRepository, input.userId, input.targetList ?? null);
    if (slot) {
      const byEmail = await leadRepository.findByEmails(toInsert.map((lead) => lead.email));
      const leadIds = toInsert
        .map((lead) => byEmail.get(lead.email))
        .filter((id): id is number => id !== undefined);
      if (leadIds.length > 0) {
        await assignLeadsToSlot(leadListRepository, input.userId, slot, leadIds);
        slotId = slot.id;
        slotName = slot.name;
      }
    }
  }

  const importId = await leadRepository.createImportHistory({
    userId: input.userId,
    filename: input.filename,
    totalRows,
    imported,
    duplicates,
    invalid,
  });

  return { totalRows, imported, duplicates, invalid, importId, slotId, slotName };
}