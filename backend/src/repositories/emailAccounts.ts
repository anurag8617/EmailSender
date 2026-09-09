import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import {
  AccountStatus,
  AccountStats,
  EmailAccountRow,
  EmailServerCredentials,
} from "../types/emailAccounts";
import { decryptText, encryptText } from "../services/crypto";

interface EmailAccountQueryRow extends RowDataPacket {
  id: number;
  user_id: number;
  email: string;
  provider: string;
  auth_type: string;
  credentials_reference: string;
  daily_limit: number;
  hourly_limit: number;
  sent_today: number;
  last_sent_at: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS = `id, user_id, email, provider, auth_type, credentials_reference,
  daily_limit, hourly_limit, sent_today, last_sent_at, status, created_at, updated_at`;

function mapRow(row: EmailAccountQueryRow): EmailAccountRow {
  return {
    id: row.id,
    user_id: row.user_id,
    email: row.email,
    provider: row.provider,
    auth_type: row.auth_type,
    credentials_reference: row.credentials_reference,
    daily_limit: row.daily_limit,
    hourly_limit: row.hourly_limit,
    sent_today: row.sent_today,
    last_sent_at: row.last_sent_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeCredentials(credentials: EmailServerCredentials): string {
  return encryptText(JSON.stringify(credentials));
}

export function deserializeCredentials(reference: string): EmailServerCredentials {
  return JSON.parse(decryptText(reference)) as EmailServerCredentials;
}

export interface EmailAccountCreateInput {
  userId: number;
  email: string;
  provider: string;
  auth_type: string;
  credentialsReference: string;
  daily_limit: number;
  hourly_limit: number;
  status: AccountStatus;
}

export async function list(userId: number): Promise<EmailAccountRow[]> {
  const [rows] = await pool.query<EmailAccountQueryRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM email_accounts WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows.map(mapRow);
}

export async function findById(id: number, userId: number): Promise<EmailAccountRow | null> {
  const [rows] = await pool.query<EmailAccountQueryRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM email_accounts WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function accountById(id: number): Promise<EmailAccountRow | null> {
  const [rows] = await pool.query<EmailAccountQueryRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM email_accounts WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function setStatusById(id: number, status: AccountStatus): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_accounts SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, id]
  );
}

export async function findByEmail(userId: number, email: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM email_accounts WHERE user_id = ? AND email = ? LIMIT 1`,
    [userId, email]
  );
  return rows.length > 0;
}

export async function create(input: EmailAccountCreateInput): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO email_accounts
       (user_id, email, provider, auth_type, credentials_reference, daily_limit, hourly_limit, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.email,
      input.provider,
      input.auth_type,
      input.credentialsReference,
      input.daily_limit,
      input.hourly_limit,
      input.status,
    ]
  );
  return result.insertId;
}

export interface EmailAccountUpdateFields {
  email?: string;
  provider?: string;
  auth_type?: string;
  credentialsReference?: string;
  daily_limit?: number;
  hourly_limit?: number;
  status?: AccountStatus;
}

export async function update(
  id: number,
  userId: number,
  fields: EmailAccountUpdateFields
): Promise<boolean> {
  const sets: string[] = [];
  const args: unknown[] = [];

  const assignIf = (column: string, value: unknown) => {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      args.push(value);
    }
  };

  assignIf("email", fields.email);
  assignIf("provider", fields.provider);
  assignIf("auth_type", fields.auth_type);
  assignIf("credentials_reference", fields.credentialsReference);
  assignIf("daily_limit", fields.daily_limit);
  assignIf("hourly_limit", fields.hourly_limit);
  assignIf("status", fields.status);

  if (sets.length === 0) return true;

  args.push(id, userId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE email_accounts SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args
  );
  return result.affectedRows > 0;
}

export async function setStatus(
  id: number,
  userId: number,
  status: AccountStatus
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE email_accounts SET status = ? WHERE id = ? AND user_id = ?`,
    [status, id, userId]
  );
  return result.affectedRows > 0;
}

export async function remove(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM email_accounts WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

interface StatsCountRow extends RowDataPacket {
  sent_today: number;
  sent_this_hour: number;
  sent_total: number;
  failed_total: number;
  bounced_total: number;
}

export async function stats(id: number, userId: number): Promise<AccountStats> {
  const [rows] = await pool.query<StatsCountRow[]>(
    `SELECT
       SUM(ej.status = 'SENT' AND ej.sent_at IS NOT NULL AND ej.sent_at >= CURDATE()) AS sent_today,
       SUM(ej.status = 'SENT' AND ej.sent_at IS NOT NULL AND ej.sent_at >= DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')) AS sent_this_hour,
       SUM(ej.status = 'SENT') AS sent_total,
       SUM(ej.status = 'FAILED') AS failed_total,
       SUM(ee.event_type = 'BOUNCED') AS bounced_total
     FROM email_accounts ea
     LEFT JOIN email_jobs ej ON ej.email_account_id = ea.id
     LEFT JOIN email_events ee ON ee.email_job_id = ej.id AND ee.event_type = 'BOUNCED'
     WHERE ea.id = ? AND ea.user_id = ?
     GROUP BY ea.id`,
    [id, userId]
  );
  const row = rows[0];
  return {
    sentToday: Number(row?.sent_today ?? 0),
    sentThisHour: Number(row?.sent_this_hour ?? 0),
    sentTotal: Number(row?.sent_total ?? 0),
    failedTotal: Number(row?.failed_total ?? 0),
    bouncedTotal: Number(row?.bounced_total ?? 0),
  };
}