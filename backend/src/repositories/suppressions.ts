import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import {
  Suppression,
  SuppressionListParams,
  SuppressionListResult,
} from "../types/suppressions";

interface SuppressionRow extends RowDataPacket, Suppression {}

const SELECT_COLUMNS = `id, email, reason, source, created_at`;

export async function isSuppressed(email: string): Promise<boolean> {
  const [rows] = await pool.query<SuppressionRow[]>(
    `SELECT id FROM suppressions WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows.length > 0;
}

export async function addSuppression(
  email: string,
  reason: string,
  source: string | null = null
): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO suppressions (email, reason, source)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason), source = VALUES(source)`,
    [email, reason, source]
  );
}

export async function findByEmail(email: string): Promise<Suppression | null> {
  const [rows] = await pool.query<SuppressionRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM suppressions WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function list(params: SuppressionListParams): Promise<SuppressionListResult> {
  const where: string[] = [];
  const args: unknown[] = [];

  if (params.search?.trim()) {
    where.push("email LIKE ?");
    args.push(`%${params.search.trim()}%`);
  }
  if (params.reason?.trim()) {
    where.push("reason = ?");
    args.push(params.reason.trim());
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM suppressions ${whereSql}`,
    args
  );
  const total = Number(countRows[0]?.total ?? 0);

  const offset = (params.page - 1) * params.pageSize;
  const [rows] = await pool.query<SuppressionRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM suppressions ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...args, params.pageSize, offset]
  );

  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function remove(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM suppressions WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}