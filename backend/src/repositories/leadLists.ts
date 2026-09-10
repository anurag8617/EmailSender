import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { Lead } from "../types/leads";

export interface LeadListRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LeadListSummary extends LeadListRow {
  lead_count: number;
}

export interface LeadListParams {
  userId: number;
  page: number;
  pageSize: number;
  search?: string;
}

export interface LeadListResult {
  rows: LeadListSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface LeadRow extends RowDataPacket, Omit<Lead, "custom_data"> {
  custom_data: string | null;
}

function mapLeadRow(row: LeadRow): Lead {
  return {
    ...row,
    custom_data: row.custom_data
      ? typeof row.custom_data === "string"
        ? JSON.parse(row.custom_data)
        : row.custom_data
      : null,
  };
}

export async function list(params: LeadListParams): Promise<LeadListResult> {
  const where: string[] = ["ll.user_id = ?"];
  const args: unknown[] = [params.userId];

  if (params.search?.trim()) {
    where.push("ll.name LIKE ?");
    args.push(`%${params.search.trim()}%`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM lead_lists ll ${whereSql}`,
    args
  );
  const total = Number(countRows[0]?.total ?? 0);

  const offset = (params.page - 1) * params.pageSize;
  const [rows] = await pool.query<LeadListSummary[]>(
    `SELECT ll.id, ll.user_id, ll.name, ll.created_at, ll.updated_at,
            COUNT(llm.id) AS lead_count
     FROM lead_lists ll
     LEFT JOIN lead_list_members llm ON llm.lead_list_id = ll.id
     ${whereSql}
     GROUP BY ll.id, ll.user_id, ll.name, ll.created_at, ll.updated_at
     ORDER BY ll.created_at DESC, ll.id DESC
     LIMIT ? OFFSET ?`,
    [...args, params.pageSize, offset]
  );

  return {
    rows: rows.map((row) => ({ ...row, lead_count: Number(row.lead_count) })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function findById(id: number, userId: number): Promise<LeadListSummary | null> {
  const [rows] = await pool.query<LeadListSummary[]>(
    `SELECT ll.id, ll.user_id, ll.name, ll.created_at, ll.updated_at,
            COUNT(llm.id) AS lead_count
     FROM lead_lists ll
     LEFT JOIN lead_list_members llm ON llm.lead_list_id = ll.id
     WHERE ll.id = ? AND ll.user_id = ?
     GROUP BY ll.id, ll.user_id, ll.name, ll.created_at, ll.updated_at
     LIMIT 1`,
    [id, userId]
  );
  const row = rows[0];
  return row ? { ...row, lead_count: Number(row.lead_count) } : null;
}

export async function create(userId: number, name: string): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO lead_lists (user_id, name) VALUES (?, ?)`,
    [userId, name]
  );
  return result.insertId;
}

export async function update(id: number, userId: number, name: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE lead_lists SET name = ? WHERE id = ? AND user_id = ?`,
    [name, id, userId]
  );
  return result.affectedRows > 0;
}

export async function remove(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM lead_lists WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

export async function existingLeadIdsInList(
  listId: number,
  leadIds: number[]
): Promise<Set<number>> {
  if (leadIds.length === 0) return new Set();
  const placeholders = leadIds.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT lead_id FROM lead_list_members WHERE lead_list_id = ? AND lead_id IN (${placeholders})`,
    [listId, ...leadIds]
  );
  return new Set(rows.map((r) => Number(r.lead_id)));
}

export async function replaceMembers(listId: number, leadIds: number[]): Promise<void> {
  await pool.query(`DELETE FROM lead_list_members WHERE lead_list_id = ?`, [listId]);
  if (leadIds.length > 0) {
    const placeholders = leadIds.map(() => "(?, ?)").join(",");
    const args: unknown[] = [];
    for (const leadId of leadIds) {
      args.push(listId, leadId);
    }
    await pool.query(
      `INSERT INTO lead_list_members (lead_list_id, lead_id) VALUES ${placeholders}`,
      args
    );
  }
}

export async function addMembers(listId: number, userId: number, leadIds: number[]): Promise<number> {
  if (leadIds.length === 0) return 0;

  const [listRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM lead_lists WHERE id = ? AND user_id = ? LIMIT 1`,
    [listId, userId]
  );
  if (listRows.length === 0) return -1;

  const [leadRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM leads WHERE id IN (${leadIds.map(() => "?").join(",")})`,
    leadIds
  );
  const validIds = leadRows.map((r) => Number(r.id));
  if (validIds.length === 0) return 0;

  const existing = await existingLeadIdsInList(listId, validIds);

  let added = 0;
  for (const leadId of validIds) {
    if (existing.has(leadId)) continue;
    await pool.query<ResultSetHeader>(
      `INSERT INTO lead_list_members (lead_list_id, lead_id) VALUES (?, ?)`,
      [listId, leadId]
    );
    added++;
  }
  return added;
}

export async function removeMember(listId: number, userId: number, leadId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE llm FROM lead_list_members llm
     JOIN lead_lists ll ON ll.id = llm.lead_list_id
     WHERE llm.lead_list_id = ? AND ll.user_id = ? AND llm.lead_id = ?`,
    [listId, userId, leadId]
  );
  return result.affectedRows > 0;
}

export async function membersOfList(
  listId: number,
  userId: number,
  params: { page: number; pageSize: number; search?: string }
): Promise<{ rows: Lead[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const where: string[] = ["ll.id = ?", "ll.user_id = ?"];
  const args: unknown[] = [listId, userId];

  if (params.search?.trim()) {
    where.push("(le.email LIKE ? OR le.company LIKE ? OR le.first_name LIKE ? OR le.last_name LIKE ?)");
    const term = `%${params.search.trim()}%`;
    args.push(term, term, term, term);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM lead_list_members llm
     JOIN lead_lists ll ON ll.id = llm.lead_list_id
     JOIN leads le ON le.id = llm.lead_id
     ${whereSql}`,
    args
  );
  const total = Number(countRows[0]?.total ?? 0);

  const offset = (params.page - 1) * params.pageSize;
  const [rows] = await pool.query<LeadRow[]>(
    `SELECT le.id, le.first_name, le.last_name, le.company, le.email, le.website,
            le.phone, le.custom_data, le.status, le.created_at, le.updated_at
     FROM lead_list_members llm
     JOIN lead_lists ll ON ll.id = llm.lead_list_id
     JOIN leads le ON le.id = llm.lead_id
     ${whereSql}
     ORDER BY le.created_at DESC, le.id DESC
     LIMIT ? OFFSET ?`,
    [...args, params.pageSize, offset]
  );

  return {
    rows: rows.map(mapLeadRow),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}