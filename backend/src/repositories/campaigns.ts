import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import {
  Campaign,
  CampaignCounts,
  CampaignInput,
  CampaignRecipient,
  CampaignStatus,
} from "../types/campaigns";

interface CampaignRow extends RowDataPacket, Omit<Campaign, "start_at" | "end_at"> {
  start_at: string | null;
  end_at: string | null;
}

interface CountRow extends RowDataPacket {
  cid: number;
  count: number;
}

interface EventCountRow extends RowDataPacket {
  campaign_id: number;
  bounced: number;
  unsubscribed: number;
}

interface JobCountRow extends RowDataPacket {
  campaign_id: number;
  sent: number;
  failed: number;
}

const SELECT_COLUMNS = `id, user_id, name, status, start_at, end_at, daily_limit, hourly_limit, created_at, updated_at`;

const EMPTY_COUNTS: CampaignCounts = { leads: 0, sent: 0, failed: 0, bounced: 0, unsubscribed: 0 };

function toCampaign(row: CampaignRow): Campaign {
  return { ...row, status: row.status as CampaignStatus };
}

export async function list(userId: number): Promise<Campaign[]> {
  const [rows] = await pool.query<CampaignRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM campaigns WHERE user_id = ? ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
  return rows.map(toCampaign);
}

export async function findById(id: number, userId: number): Promise<Campaign | null> {
  const [rows] = await pool.query<CampaignRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM campaigns WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0] ? toCampaign(rows[0]) : null;
}

async function countsFor(ids: number[]): Promise<Map<number, CampaignCounts>> {
  const counts = new Map<number, CampaignCounts>();
  if (ids.length === 0) return counts;
  for (const id of ids) counts.set(id, { ...EMPTY_COUNTS });

  const placeholders = ids.map(() => "?").join(",");

  const [leadRows] = await pool.query<CountRow[]>(
    `SELECT campaign_id AS cid, COUNT(*) AS count FROM campaign_leads
     WHERE campaign_id IN (${placeholders}) GROUP BY campaign_id`,
    ids
  );
  for (const row of leadRows) counts.get(Number(row.cid))!.leads = Number(row.count);

  const [jobRows] = await pool.query<JobCountRow[]>(
    `SELECT campaign_id,
            SUM(status = 'SENT') AS sent,
            SUM(status = 'FAILED') AS failed
     FROM email_jobs
     WHERE campaign_id IN (${placeholders})
     GROUP BY campaign_id`,
    ids
  );
  for (const row of jobRows) {
    const entry = counts.get(Number(row.campaign_id));
    if (!entry) continue;
    entry.sent = Number(row.sent ?? 0);
    entry.failed = Number(row.failed ?? 0);
  }

  const [eventRows] = await pool.query<EventCountRow[]>(
    `SELECT ej.campaign_id,
            SUM(ee.event_type = 'BOUNCED') AS bounced,
            SUM(ee.event_type = 'UNSUBSCRIBED') AS unsubscribed
     FROM email_events ee
     JOIN email_jobs ej ON ej.id = ee.email_job_id
     WHERE ej.campaign_id IN (${placeholders})
     GROUP BY ej.campaign_id`,
    ids
  );
  for (const row of eventRows) {
    const entry = counts.get(Number(row.campaign_id));
    if (!entry) continue;
    entry.bounced = Number(row.bounced ?? 0);
    entry.unsubscribed = Number(row.unsubscribed ?? 0);
  }

  return counts;
}

export async function statsFor(ids: number[]): Promise<Map<number, CampaignCounts>> {
  return countsFor(ids);
}

export async function transition(
  id: number,
  userId: number,
  action: "start" | "pause" | "resume" | "cancel"
): Promise<Campaign | null> {
  const campaign = await findById(id, userId);
  if (!campaign) return null;
  const nextStatuses: Record<string, CampaignStatus> = {
    start: "ACTIVE",
    resume: "ACTIVE",
    pause: "PAUSED",
    cancel: "CANCELLED",
  };
  await pool.query<ResultSetHeader>(
    `UPDATE campaigns SET status = ? WHERE id = ? AND user_id = ?`,
    [nextStatuses[action], id, userId]
  );
  return findById(id, userId);
}

export async function create(userId: number, input: CampaignInput): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO campaigns (user_id, name, status, start_at, end_at, daily_limit, hourly_limit)
     VALUES (?, ?, 'DRAFT', ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.start_at ?? null,
      input.end_at ?? null,
      input.daily_limit ?? 50,
      input.hourly_limit ?? 10,
    ]
  );
  return result.insertId;
}

export async function update(
  id: number,
  userId: number,
  input: Partial<CampaignInput>
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
  assignIf("start_at", input.start_at ?? null);
  assignIf("end_at", input.end_at ?? null);
  assignIf("daily_limit", input.daily_limit);
  assignIf("hourly_limit", input.hourly_limit);

  if (sets.length === 0) return true;

  args.push(id, userId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE campaigns SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args
  );
  return result.affectedRows > 0;
}

export async function remove(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM campaigns WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

export async function replaceLeads(campaignId: number, leadIds: number[]): Promise<number> {
  const [del] = await pool.query<ResultSetHeader>(
    `DELETE FROM campaign_leads WHERE campaign_id = ?`,
    [campaignId]
  );
  if (leadIds.length === 0) return del.affectedRows;

  const placeholders = leadIds.map(() => "(?, ?)").join(",");
  const args: unknown[] = [];
  for (const leadId of leadIds) args.push(campaignId, leadId);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO campaign_leads (campaign_id, lead_id) VALUES ${placeholders}`,
    args
  );
  return result.affectedRows;
}

export async function replaceAccounts(campaignId: number, accountIds: number[]): Promise<number> {
  const [del] = await pool.query<ResultSetHeader>(
    `DELETE FROM campaign_email_accounts WHERE campaign_id = ?`,
    [campaignId]
  );
  if (accountIds.length === 0) return del.affectedRows;

  const placeholders = accountIds.map(() => "(?, ?)").join(",");
  const args: unknown[] = [];
  for (const accountId of accountIds) args.push(campaignId, accountId);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO campaign_email_accounts (campaign_id, email_account_id) VALUES ${placeholders}`,
    args
  );
  return result.affectedRows;
}

export async function campaignLeadCount(campaignId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM campaign_leads WHERE campaign_id = ?`,
    [campaignId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function campaignAccountCount(campaignId: number): Promise<number> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM campaign_email_accounts WHERE campaign_id = ?`,
    [campaignId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function leadsOfCampaign(campaignId: number): Promise<CampaignRecipient[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.id, l.first_name, l.last_name, l.company, l.email, l.website, l.phone,
            l.subject, l.message, l.custom_data, l.status, l.created_at, l.updated_at,
            ej.id AS job_id, ej.status AS job_status, ej.scheduled_at, ej.sent_at,
            ej.failed_at, ej.attempts, ej.error_message
     FROM leads l
     JOIN campaign_leads cl ON cl.lead_id = l.id
     LEFT JOIN email_jobs ej ON ej.campaign_id = cl.campaign_id AND ej.lead_id = l.id
     WHERE cl.campaign_id = ?
     ORDER BY l.created_at DESC, l.id DESC`,
    [campaignId]
  );
  return rows.map((row) => ({
    ...row,
    custom_data:
      row.custom_data && typeof row.custom_data === "string"
        ? JSON.parse(row.custom_data)
        : row.custom_data ?? null,
    job_id: row.job_id === null || row.job_id === undefined ? null : Number(row.job_id),
    attempts: row.attempts === null || row.attempts === undefined ? 0 : Number(row.attempts),
  })) as unknown as CampaignRecipient[];
}

export async function accountsOfCampaign(campaignId: number): Promise<
  { id: number; email: string; status: string }[]
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ea.id, ea.email, ea.status
     FROM email_accounts ea
     JOIN campaign_email_accounts cea ON cea.email_account_id = ea.id
     WHERE cea.campaign_id = ?
     ORDER BY ea.email, ea.id`,
    [campaignId]
  );
  return rows as { id: number; email: string; status: string }[];
}

export async function ownedAccountIds(userId: number, ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM email_accounts WHERE user_id = ? AND id IN (${placeholders})`,
    [userId, ...ids]
  );
  return rows.map((r) => Number(r.id));
}

export async function existingLeadIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM leads WHERE id IN (${placeholders})`,
    ids
  );
  return rows.map((r) => Number(r.id));
}

export async function setTemplateStep(campaignId: number, templateId: number): Promise<void> {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM campaign_steps WHERE campaign_id = ? AND step_order = 1 LIMIT 1`,
    [campaignId]
  );
  if (existing.length > 0) {
    await pool.query<ResultSetHeader>(
      `UPDATE campaign_steps SET template_id = ?, updated_at = NOW() WHERE id = ?`,
      [templateId, existing[0].id]
    );
  } else {
    await pool.query<ResultSetHeader>(
      `INSERT INTO campaign_steps (campaign_id, template_id, step_order, delay_days)
       VALUES (?, ?, 1, 0)`,
      [campaignId, templateId]
    );
  }
}

export async function templateForCampaign(campaignId: number): Promise<{
  id: number;
  name: string;
  subject: string;
  body: string;
} | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.name, t.subject, t.body
       FROM campaign_steps cs
       JOIN email_templates t ON t.id = cs.template_id
      WHERE cs.campaign_id = ?
      ORDER BY cs.step_order ASC, cs.id ASC
      LIMIT 1`,
    [campaignId]
  );
  return rows[0]
    ? {
        id: Number(rows[0].id),
        name: rows[0].name as string,
        subject: rows[0].subject as string,
        body: rows[0].body as string,
      }
    : null;
}

export interface ActiveCampaignRow extends RowDataPacket, Campaign {}

export async function activeCampaigns(): Promise<Campaign[]> {
  const [rows] = await pool.query<ActiveCampaignRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM campaigns WHERE status = 'ACTIVE' ORDER BY id ASC`
  );
  return rows.map(toCampaign);
}

export interface ScheduledLeadRow extends RowDataPacket {
  lead_id: number;
  email: string;
}

export async function campaignLeadsToSchedule(campaignId: number, limit: number): Promise<ScheduledLeadRow[]> {
  const [rows] = await pool.query<ScheduledLeadRow[]>(
    `SELECT l.id AS lead_id, l.email
       FROM campaign_leads cl
       JOIN leads l ON l.id = cl.lead_id
      WHERE cl.campaign_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM email_jobs ej WHERE ej.campaign_id = ? AND ej.lead_id = l.id
        )
      ORDER BY cl.id ASC
      LIMIT ?`,
    [campaignId, campaignId, limit]
  );
  return rows;
}

export async function campaignActiveAccountIds(campaignId: number): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT cea.email_account_id AS id
       FROM campaign_email_accounts cea
       JOIN email_accounts ea ON ea.id = cea.email_account_id
      WHERE cea.campaign_id = ? AND ea.status = 'active'
      ORDER BY ea.id ASC`,
    [campaignId]
  );
  return rows.map((r) => Number(r.id));
}

export async function campaignAccountOrder(campaignId: number): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT email_account_id AS id FROM campaign_email_accounts WHERE campaign_id = ? ORDER BY id ASC`,
    [campaignId]
  );
  return rows.map((r) => Number(r.id));
}

export async function accountJobCounts(campaignId: number, accountIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  for (const accountId of accountIds) counts.set(accountId, 0);
  if (accountIds.length === 0) return counts;
  const placeholders = accountIds.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT email_account_id AS id, COUNT(*) AS jobs
       FROM email_jobs
      WHERE campaign_id = ? AND email_account_id IN (${placeholders})
      GROUP BY email_account_id`,
    [campaignId, ...accountIds]
  );
  for (const row of rows) {
    counts.set(Number(row.id), Number(row.jobs));
  }
  return counts;
}

export async function setCampaignStatus(campaignId: number, status: CampaignStatus): Promise<void> {
  await pool.query<ResultSetHeader>(
    `UPDATE campaigns SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, campaignId]
  );
}

export async function deleteJobsForCampaign(campaignId: number): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM email_jobs WHERE campaign_id = ?`,
    [campaignId]
  );
  return result.affectedRows;
}