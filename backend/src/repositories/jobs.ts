import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { EmailJob, JobStatus } from "../types/jobs";

export interface NewJobRow {
  campaign_id: number;
  lead_id: number;
  email_account_id: number | null;
  template_id: number | null;
  scheduled_at: Date | null;
  status: JobStatus;
  error_message?: string | null;
}

export function insertJobs(rows: NewJobRow[]): Promise<void> {
  if (rows.length === 0) return Promise.resolve();
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(",");
  const args: unknown[] = [];
  for (const row of rows) {
    args.push(
      row.campaign_id,
      row.lead_id,
      row.email_account_id,
      row.template_id,
      row.scheduled_at,
      row.status,
      row.error_message ?? null
    );
  }
  return pool
    .query<ResultSetHeader>(
      `INSERT INTO email_jobs
         (campaign_id, lead_id, email_account_id, template_id, scheduled_at, status, error_message)
       VALUES ${placeholders}`,
      args
    )
    .then(() => undefined);
}

export async function hasJob(campaignId: number, leadId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM email_jobs WHERE campaign_id = ? AND lead_id = ? LIMIT 1`,
    [campaignId, leadId]
  );
  return rows.length > 0;
}

export interface DueJobRow extends RowDataPacket {
  id: number;
}

export async function dueJobIds(accountId: number, limit: number): Promise<number[]> {
  const [rows] = await pool.query<DueJobRow[]>(
    `SELECT id
       FROM email_jobs
      WHERE email_account_id = ? AND status = 'PENDING' AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC, id ASC
      LIMIT ?`,
    [accountId, limit]
  );
  return rows.map((row) => Number(row.id));
}

export async function claim(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE email_jobs SET status = 'PROCESSING', updated_at = NOW()
      WHERE id IN (${placeholders}) AND status = 'PENDING'`,
    ids
  );
  return result.affectedRows;
}

export interface PendingAccountRow extends RowDataPacket {
  email_account_id: number;
}

export async function accountsWithDueJobs(): Promise<number[]> {
  const [rows] = await pool.query<PendingAccountRow[]>(
    `SELECT DISTINCT email_account_id
       FROM email_jobs
      WHERE status = 'PENDING' AND scheduled_at <= NOW() AND email_account_id IS NOT NULL`
  );
  return rows.map((row) => Number(row.email_account_id));
}

export interface ProcessingJob extends EmailJob {
  campaign_status: string;
  campaign_user_id: number;
  campaign_start_at: string | null;
  campaign_end_at: string | null;
  lead_email: string;
  lead_first_name: string | null;
  lead_last_name: string | null;
  lead_company: string | null;
  lead_website: string | null;
  lead_phone: string | null;
  lead_custom_data: string | null;
  lead_subject: string | null;
  lead_message: string | null;
  template_id: number | null;
  template_name: string | null;
  template_subject: string | null;
  template_body: string | null;
  template_footer: string | null;
  account_email: string | null;
}

interface ProcessingJobRow extends RowDataPacket, ProcessingJob {}

export async function processingById(jobId: number): Promise<ProcessingJob | null> {
  const [rows] = await pool.query<ProcessingJobRow[]>(
    `SELECT ej.id, ej.campaign_id, ej.lead_id, ej.email_account_id, ej.template_id,
            ej.scheduled_at, ej.status, ej.attempts, ej.provider_message_id, ej.error_message,
            ej.sent_at, ej.failed_at, ej.created_at, ej.updated_at,
            c.status AS campaign_status, c.user_id AS campaign_user_id,
            c.start_at AS campaign_start_at, c.end_at AS campaign_end_at,
            l.email AS lead_email, l.first_name AS lead_first_name, l.last_name AS lead_last_name,
            l.company AS lead_company, l.website AS lead_website, l.phone AS lead_phone,
            l.custom_data AS lead_custom_data,
            l.subject AS lead_subject, l.message AS lead_message,
            t.subject AS template_subject, t.body AS template_body, t.footer AS template_footer, t.name AS template_name,
            ea.email AS account_email
       FROM email_jobs ej
       JOIN campaigns c ON c.id = ej.campaign_id
       JOIN leads l ON l.id = ej.lead_id
       LEFT JOIN email_templates t ON t.id = ej.template_id
       LEFT JOIN email_accounts ea ON ea.id = ej.email_account_id
      WHERE ej.id = ? LIMIT 1`,
    [jobId]
  );
  return rows[0] ?? null;
}

export async function markSent(jobId: number, messageId: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_jobs
        SET status = 'SENT', provider_message_id = ?, sent_at = NOW(), failed_at = NULL,
            error_message = NULL, attempts = attempts + 1, updated_at = NOW()
      WHERE id = ?`,
    [messageId, jobId]
  );
}

export async function markFailed(jobId: number, error: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_jobs
        SET status = 'FAILED', error_message = ?, failed_at = NOW(), attempts = attempts + 1, updated_at = NOW()
      WHERE id = ?`,
    [error, jobId]
  );
}

export async function requeue(jobId: number, scheduledAt: Date, error?: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_jobs
        SET status = 'PENDING', scheduled_at = ?, error_message = ?,
            attempts = attempts + 1, updated_at = NOW()
      WHERE id = ?`,
    [scheduledAt, error ?? null, jobId]
  );
}

export async function cancel(jobId: number): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_jobs SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`,
    [jobId]
  );
}

export async function skip(jobId: number, error: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_jobs
        SET status = 'SKIPPED', error_message = ?, attempts = attempts + 1, updated_at = NOW()
      WHERE id = ?`,
    [error, jobId]
  );
}

export async function attemptsForJob(jobId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT attempts FROM email_jobs WHERE id = ? LIMIT 1`,
    [jobId]
  );
  return Number(rows[0]?.attempts ?? 0);
}

export async function incrementAccountSentToday(accountId: number): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_accounts SET sent_today = sent_today + 1, last_sent_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [accountId]
  );
}

export async function resetSentTodayCounters(): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_accounts SET sent_today = 0, updated_at = NOW()
      WHERE sent_today <> 0 AND last_sent_at < CURDATE()`
  );
}

interface CountRow extends RowDataPacket {
  count: number;
}

export async function sentTodayForAccount(accountId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM email_jobs
      WHERE email_account_id = ? AND status = 'SENT' AND sent_at >= CURDATE()`,
    [accountId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function sentThisHourForAccount(accountId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM email_jobs
      WHERE email_account_id = ? AND status = 'SENT'
        AND sent_at >= DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')`,
    [accountId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function sentTodayForCampaign(campaignId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM email_jobs
      WHERE campaign_id = ? AND status = 'SENT' AND sent_at >= CURDATE()`,
    [campaignId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function sentThisHourForCampaign(campaignId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM email_jobs
      WHERE campaign_id = ? AND status = 'SENT'
        AND sent_at >= DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')`,
    [campaignId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function unfinishedJobCount(campaignId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM email_jobs
      WHERE campaign_id = ? AND status IN ('PENDING', 'PROCESSING')`,
    [campaignId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function canceledPending(campaignId: number): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE email_jobs SET status = 'CANCELLED', updated_at = NOW()
      WHERE campaign_id = ? AND status IN ('PENDING', 'PROCESSING')`,
    [campaignId]
  );
  return result.affectedRows;
}

export async function mostUsedAccountForCampaign(campaignId: number, accountIds: number[]): Promise<number | null> {
  if (accountIds.length === 0) return null;
  const placeholders = accountIds.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ea.id, (SELECT COUNT(*) FROM email_jobs ej
                     WHERE ej.campaign_id = ? AND ej.email_account_id = ea.id) AS jobs
       FROM email_accounts ea
      WHERE ea.id IN (${placeholders})
      ORDER BY jobs ASC, ea.id ASC
      LIMIT 1`,
    [campaignId, ...accountIds]
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

export async function recordEvent(
  jobId: number,
  leadId: number,
  eventType: string,
  providerEventId: string | null = null,
  eventData: Record<string, unknown> | null = null
): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO email_events (email_job_id, lead_id, event_type, provider_event_id, event_data)
     VALUES (?, ?, ?, ?, ?)`,
    [jobId, leadId, eventType, providerEventId, eventData ? JSON.stringify(eventData) : null]
  );
}

export async function jobCountForCampaign(campaignId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM email_jobs WHERE campaign_id = ?`,
    [campaignId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function backfillCancelled(campaignId: number, reason: string): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO email_jobs (campaign_id, lead_id, email_account_id, template_id, scheduled_at, status, error_message)
     SELECT cl.campaign_id, cl.lead_id, NULL, NULL, NULL, 'CANCELLED', ?
       FROM campaign_leads cl
       LEFT JOIN email_jobs ej ON ej.campaign_id = cl.campaign_id AND ej.lead_id = cl.lead_id
      WHERE cl.campaign_id = ? AND ej.id IS NULL`,
    [reason, campaignId]
  );
  return result.affectedRows;
}

export async function recordUnsubscribe(campaignId: number, email: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE email_jobs ej
       JOIN leads l ON l.id = ej.lead_id
        SET ej.status = 'CANCELLED', ej.updated_at = NOW()
      WHERE ej.campaign_id = ? AND l.email = ? AND ej.status IN ('PENDING', 'PROCESSING')`,
    [campaignId, email]
  );
  await pool.query<ResultSetHeader>(
    `INSERT INTO email_events (email_job_id, lead_id, event_type)
     SELECT ej.id, ej.lead_id, 'UNSUBSCRIBED'
       FROM email_jobs ej
       JOIN leads l ON l.id = ej.lead_id
      WHERE ej.campaign_id = ? AND l.email = ?
        AND NOT EXISTS (
          SELECT 1 FROM email_events ee
           WHERE ee.email_job_id = ej.id AND ee.event_type = 'UNSUBSCRIBED'
        )`,
    [campaignId, email]
  );
}