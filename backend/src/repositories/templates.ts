import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { Template, TemplateInput, TemplateUpdate } from "../types/templates";

interface TemplateRow extends RowDataPacket, Template {}

const SELECT_COLUMNS = `id, user_id, name, subject, body, footer, created_at, updated_at`;

export async function list(userId: number): Promise<Template[]> {
  const [rows] = await pool.query<TemplateRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM email_templates WHERE user_id = ? ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
  return rows;
}

export async function findById(id: number, userId: number): Promise<Template | null> {
  const [rows] = await pool.query<TemplateRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM email_templates WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function create(userId: number, input: TemplateInput): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO email_templates (user_id, name, subject, body, footer) VALUES (?, ?, ?, ?, ?)`,
    [userId, input.name, input.subject ?? "", input.body, input.footer ?? null]
  );
  return result.insertId;
}

export async function update(
  id: number,
  userId: number,
  input: TemplateUpdate
): Promise<boolean> {
  const sets: string[] = [];
  const args: unknown[] = [];

  const assignIf = (column: string, value: unknown) => {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      args.push(value);
    }
  };

  assignIf("name", input.name);
  assignIf("subject", input.subject);
  assignIf("body", input.body);
  assignIf("footer", input.footer);

  if (sets.length === 0) return true;

  args.push(id, userId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE email_templates SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args
  );
  return result.affectedRows > 0;
}

export async function remove(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM email_templates WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}