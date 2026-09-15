import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { Lead, LeadInput } from "../types/leads";

interface LeadRow extends RowDataPacket, Omit<Lead, "custom_data"> {
  custom_data: string | null;
}

function mapRow(row: LeadRow): Lead {
  return {
    ...row,
    custom_data: row.custom_data
      ? typeof row.custom_data === "string"
        ? JSON.parse(row.custom_data)
        : row.custom_data
      : null,
  };
}

const SELECT_COLUMNS = `id, first_name, last_name, company, email, website, phone, subject, message, custom_data, status, created_at, updated_at`;

export interface LeadListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface LeadListResult {
  rows: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function list(params: LeadListParams): Promise<LeadListResult> {
  const where: string[] = [];
  const args: unknown[] = [];

  if (params.search?.trim()) {
    where.push("(email LIKE ? OR company LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR message LIKE ?)");
    const term = `%${params.search.trim()}%`;
    args.push(term, term, term, term, term);
  }
  if (params.status?.trim()) {
    where.push("status = ?");
    args.push(params.status.trim());
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM leads ${whereSql}`,
    args
  );
  const total = Number(countRows[0]?.total ?? 0);

  const offset = (params.page - 1) * params.pageSize;
  const [rows] = await pool.query<LeadRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM leads ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...args, params.pageSize, offset]
  );

  return {
    rows: rows.map(mapRow),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function findById(id: number): Promise<Lead | null> {
  const [rows] = await pool.query<LeadRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM leads WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findByEmails(emails: string[]): Promise<Map<string, number>> {
  if (emails.length === 0) return new Map();
  const placeholders = emails.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, email FROM leads WHERE email IN (${placeholders})`,
    emails
  );
  return new Map(rows.map((r) => [r.email, r.id]));
}

export async function create(input: LeadInput): Promise<number> {
  const [result] = await pool.query(
    `INSERT INTO leads (first_name, last_name, company, email, website, phone, subject, message, custom_data, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.first_name ?? null,
      input.last_name ?? null,
      input.company ?? null,
      input.email,
      input.website ?? null,
      input.phone ?? null,
      input.subject ?? null,
      input.message ?? null,
      input.custom_data && Object.keys(input.custom_data).length > 0
        ? JSON.stringify(input.custom_data)
        : null,
      input.status ?? "new",
    ]
  );
  return (result as { insertId: number }).insertId;
}

export async function bulkCreate(rows: LeadInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
  const args: unknown[] = [];
  for (const input of rows) {
    args.push(
      input.first_name ?? null,
      input.last_name ?? null,
      input.company ?? null,
      input.email,
      input.website ?? null,
      input.phone ?? null,
      input.subject ?? null,
      input.message ?? null,
      input.custom_data && Object.keys(input.custom_data).length > 0
        ? JSON.stringify(input.custom_data)
        : null,
      input.status ?? "new"
    );
  }
  const [result] = await pool.query(
    `INSERT INTO leads (first_name, last_name, company, email, website, phone, subject, message, custom_data, status)
     VALUES ${placeholders}`,
    args
  );
  return (result as { affectedRows: number }).affectedRows;
}

export async function update(id: number, input: Partial<LeadInput>): Promise<boolean> {
  const sets: string[] = [];
  const args: unknown[] = [];

  const assignIf = (field: string, value: unknown) => {
    if (value !== undefined) {
      sets.push(`${field} = ?`);
      args.push(value);
    }
  };

  assignIf("first_name", input.first_name ?? null);
  assignIf("last_name", input.last_name ?? null);
  assignIf("company", input.company ?? null);
  assignIf("email", input.email);
  assignIf("website", input.website ?? null);
  assignIf("phone", input.phone ?? null);
  assignIf("subject", input.subject ?? null);
  assignIf("message", input.message ?? null);
  assignIf("status", input.status);
  if (input.custom_data !== undefined) {
    sets.push("custom_data = ?");
    args.push(
      input.custom_data && Object.keys(input.custom_data).length > 0
        ? JSON.stringify(input.custom_data)
        : null
    );
  }

  if (sets.length === 0) return true;

  args.push(id);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = ?`,
    args
  );
  return result.affectedRows > 0;
}

export async function remove(id: number): Promise<boolean> {
  await pool.query(`DELETE FROM lead_list_members WHERE lead_id = ?`, [id]);
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM leads WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function createImportHistory(entry: {
  userId: number;
  filename: string;
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
}): Promise<number> {
  const [result] = await pool.query(
    `INSERT INTO lead_imports (user_id, filename, total_rows, imported, duplicates, invalid)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.userId,
      entry.filename,
      entry.totalRows,
      entry.imported,
      entry.duplicates,
      entry.invalid,
    ]
  );
  return (result as { insertId: number }).insertId;
}