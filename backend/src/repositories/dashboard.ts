import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { DashboardAccountStat, DashboardStats } from "../types/dashboard";

interface CountRow extends RowDataPacket {
  value?: number | null;
  failed?: number | null;
  sent_today?: number | null;
  bounced?: number | null;
  unsubscribed?: number | null;
}

interface AccountRow extends RowDataPacket {
  id: number;
  email: string;
  status: string;
  daily_limit: number;
  sent_today: number;
  sent_total: number | null;
  failed_total: number | null;
  bounced_total: number | null;
}

async function singleCount(sql: string, args: unknown[] = []): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(sql, args);
  return Number(rows[0]?.value ?? 0);
}

export async function stats(userId: number): Promise<DashboardStats> {
  const [jobRows] = await pool.query<CountRow[]>(
    `SELECT
       SUM(ej.status = 'SENT') AS value,
       SUM(ej.status = 'FAILED') AS failed,
       SUM(ej.status = 'SENT' AND ej.sent_at >= CURDATE()) AS sent_today
     FROM email_jobs ej
     JOIN campaigns c ON c.id = ej.campaign_id
     WHERE c.user_id = ?`,
    [userId]
  );
  const jobRow = jobRows[0];

  const [eventRows] = await pool.query<CountRow[]>(
    `SELECT
       SUM(ee.event_type = 'BOUNCED') AS bounced,
       SUM(ee.event_type = 'UNSUBSCRIBED') AS unsubscribed
     FROM email_events ee
     JOIN email_jobs ej ON ej.id = ee.email_job_id
     JOIN campaigns c ON c.id = ej.campaign_id
     WHERE c.user_id = ?`,
    [userId]
  );
  const eventRow = eventRows[0];

  const [totalLeads, activeCampaigns, availableAccounts] = await Promise.all([
    singleCount(`SELECT COUNT(*) AS value FROM leads`),
    singleCount(`SELECT COUNT(*) AS value FROM campaigns WHERE user_id = ? AND status = 'ACTIVE'`, [
      userId,
    ]),
    singleCount(`SELECT COUNT(*) AS value FROM email_accounts WHERE user_id = ? AND status = 'active'`, [
      userId,
    ]),
  ]);

  const accounts = await accountStats(userId);

  return {
    totalLeads,
    activeCampaigns,
    emailsSent: Number(jobRow?.value ?? 0),
    emailsFailed: Number(jobRow?.failed ?? 0),
    bounces: Number(eventRow?.bounced ?? 0),
    unsubscribes: Number(eventRow?.unsubscribed ?? 0),
    availableAccounts,
    sentToday: Number(jobRow?.sent_today ?? 0),
    accounts,
  };
}

export async function accountStats(userId: number): Promise<DashboardAccountStat[]> {
  const [rows] = await pool.query<AccountRow[]>(
    `SELECT
       ea.id,
       ea.email,
       ea.status,
       ea.daily_limit,
       ea.sent_today,
       SUM(ej.status = 'SENT') AS sent_total,
       SUM(ej.status = 'FAILED') AS failed_total,
       (SELECT COUNT(*) FROM email_events ee
         JOIN email_jobs ej2 ON ej2.id = ee.email_job_id
        WHERE ej2.email_account_id = ea.id AND ee.event_type = 'BOUNCED') AS bounced_total
     FROM email_accounts ea
     LEFT JOIN email_jobs ej ON ej.email_account_id = ea.id
     WHERE ea.user_id = ?
     GROUP BY ea.id
     ORDER BY ea.email`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status,
    daily_limit: Number(row.daily_limit),
    sent_today: Number(row.sent_today),
    sent_total: Number(row.sent_total ?? 0),
    failed_total: Number(row.failed_total ?? 0),
    bounced_total: Number(row.bounced_total ?? 0),
  }));
}