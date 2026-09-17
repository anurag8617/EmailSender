import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import * as accountRepo from "../repositories/emailAccounts";
import * as campaignRepo from "../repositories/campaigns";
import * as jobRepo from "../repositories/jobs";
import * as sendingLimitsRepo from "../repositories/sendingLimits";
import * as suppressionRepo from "../repositories/suppressions";
import { renderEmail } from "../email/render";
import { sendEmail, SendError } from "../email/transport";
import { EmailServerCredentials } from "../types/emailAccounts";
import { MAX_ATTEMPTS, retryDelayMs } from "../types/jobs";
import { broadcast } from "../realtime/events";

const LOCK_NAME = "email_tool_sending_engine";
const LEADS_PER_TICK_PER_CAMPAIGN = 50;
const JOBS_PER_ACCOUNT_PER_TICK = 1;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authFailureCounts = new Map<number, number>();
const accountCooldownUntil = new Map<number, number>();

function getSendDelayRange(): { minMs: number; maxMs: number } {
  const minSeconds = process.env.EMAIL_SEND_DELAY_MIN
    ? Number(process.env.EMAIL_SEND_DELAY_MIN)
    : 30;
  const maxSeconds = process.env.EMAIL_SEND_DELAY_MAX
    ? Number(process.env.EMAIL_SEND_DELAY_MAX)
    : 60;
  const minMs = Math.max(5_000, (Number.isNaN(minSeconds) ? 30 : minSeconds) * 1000);
  const maxMs = Math.max(minMs, (Number.isNaN(maxSeconds) ? 60 : maxSeconds) * 1000);
  return { minMs, maxMs };
}

function nextRandomDelayMs(): number {
  const { minMs, maxMs } = getSendDelayRange();
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}


function pickAccount(accountIds: number[], usage: Map<number, number>): number {
  let best = accountIds[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const id of accountIds) {
    const count = usage.get(id) ?? 0;
    if (count < bestCount) {
      bestCount = count;
      best = id;
    }
  }
  return best;
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0];
  const clean = local.replace(/\d+$/, "");
  const base = clean.length > 1 ? clean : local;
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getTomorrowStart(startTime?: string | null): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (startTime) {
    const [h, m] = startTime.split(":").map(Number);
    tomorrow.setHours(h || 0, m || 0, 0, 0);
  } else {
    tomorrow.setHours(0, 5, 0, 0); // 00:05 AM tomorrow
  }
  return tomorrow;
}

async function getAccountEffectiveLimits(account: { id: number; daily_limit: number; hourly_limit: number }) {
  const window = await sendingLimitsRepo.windowFor("account", account.id);
  let daily = account.daily_limit;
  let hourly = account.hourly_limit;
  if (window) {
    if (window.daily_limit) daily = Math.min(daily, window.daily_limit);
    if (window.hourly_limit) hourly = Math.min(hourly, window.hourly_limit);
  }
  return { daily, hourly, window };
}

async function getCampaignEffectiveLimits(campaign: { id: number; daily_limit: number; hourly_limit: number }) {
  const window = await sendingLimitsRepo.windowFor("campaign", campaign.id);
  let daily = campaign.daily_limit;
  let hourly = campaign.hourly_limit;
  if (window) {
    if (window.daily_limit) daily = Math.min(daily, window.daily_limit);
    if (window.hourly_limit) hourly = Math.min(hourly, window.hourly_limit);
  }
  return { daily, hourly, window };
}

interface WindowState {
  within: boolean;
  ended: boolean;
  startAt?: Date;
}

async function campaignWindowState(campaign: {
  id: number;
  start_at: string | null;
  end_at: string | null;
}): Promise<WindowState> {
  const now = Date.now();
  const startAt = campaign.start_at ? new Date(campaign.start_at) : undefined;
  const endAt = campaign.end_at ? new Date(campaign.end_at) : undefined;
  if (startAt && now < startAt.getTime()) {
    return { within: false, ended: false, startAt };
  }
  if (endAt && now > endAt.getTime()) {
    return { within: false, ended: true };
  }
  const window = await sendingLimitsRepo.windowFor("campaign", campaign.id);
  const dayAllowed = sendingLimitsRepo.isInsideWeekdayWindow(window?.allowed_weekdays ?? null);
  const timeAllowed = sendingLimitsRepo.isInsideTimeWindow(
    window?.start_time ?? null,
    window?.end_time ?? null
  );
  return { within: dayAllowed && timeAllowed, ended: false, startAt };
}

async function retryOrFail(
  jobId: number,
  attempts: number,
  error: string,
  job: { lead_id: number; campaign_id: number; campaign_user_id: number; lead_email: string; email_account_id: number | null }
): Promise<void> {
  if (attempts >= MAX_ATTEMPTS) {
    await jobRepo.markFailed(jobId, error);
    await jobRepo.recordEvent(jobId, job.lead_id, "FAILED", null, { error });
    broadcast(job.campaign_user_id, {
      type: "job",
      campaignId: job.campaign_id,
      jobId,
      status: "FAILED",
      accountId: job.email_account_id,
      leadId: job.lead_id,
      leadEmail: job.lead_email,
      error,
    });
    return;
  }
  await jobRepo.requeue(jobId, new Date(Date.now() + retryDelayMs(attempts)), error);
}

async function generateJobs(): Promise<void> {
  const campaigns = await campaignRepo.activeCampaigns();
  for (const campaign of campaigns) {
    const windowState = await campaignWindowState(campaign);
    if (!windowState.within) continue;

    const template = await campaignRepo.templateForCampaign(campaign.id);

    const [sentToday, sentThisHour, accountIds] = await Promise.all([
      jobRepo.sentTodayForCampaign(campaign.id),
      jobRepo.sentThisHourForCampaign(campaign.id),
      campaignRepo.campaignActiveAccountIds(campaign.id),
    ]);
    if (accountIds.length === 0) continue;

    const campaignLimits = await getCampaignEffectiveLimits(campaign);
    const campaignDailyRemaining = campaignLimits.daily - sentToday;
    const campaignHourlyRemaining = campaignLimits.hourly - sentThisHour;
    const capacity = Math.min(campaignDailyRemaining, campaignHourlyRemaining);
    if (capacity <= 0) continue;

    // Filter to ONLY accounts that have both daily and hourly sending capacity remaining today
    const availableAccountIds: number[] = [];
    for (const id of accountIds) {
      const account = await accountRepo.accountById(id);
      if (!account || account.status !== "active") continue;
      const [accSentToday, accSentHour] = await Promise.all([
        jobRepo.sentTodayForAccount(id),
        jobRepo.sentThisHourForAccount(id),
      ]);
      const accLimits = await getAccountEffectiveLimits(account);
      const accDailyRemaining = accLimits.daily - Math.max(accSentToday, account.sent_today);
      const accHourlyRemaining = accLimits.hourly - accSentHour;
      if (accDailyRemaining > 0 && accHourlyRemaining > 0) {
        availableAccountIds.push(id);
      }
    }

    if (availableAccountIds.length === 0) continue;

    const amount = Math.min(capacity, LEADS_PER_TICK_PER_CAMPAIGN);
    const leads = await campaignRepo.campaignLeadsToSchedule(campaign.id, amount);
    if (leads.length === 0) continue;

    const usage = await campaignRepo.accountJobCounts(campaign.id, availableAccountIds);
    const rows: jobRepo.NewJobRow[] = [];
    const accountNextOffset = new Map<number, number>();

    for (const lead of leads) {
      if (await suppressionRepo.isSuppressed(lead.email)) {
        rows.push({
          campaign_id: campaign.id,
          lead_id: lead.lead_id,
          email_account_id: null,
          template_id: template?.id ?? null,
          scheduled_at: null,
          status: "SKIPPED",
          error_message: "lead is suppressed",
        });
        continue;
      }
      const accountId = pickAccount(availableAccountIds, usage);
      usage.set(accountId, (usage.get(accountId) ?? 0) + 1);

      const currentOffset = accountNextOffset.get(accountId) ?? 0;
      const stepMs = nextRandomDelayMs();
      accountNextOffset.set(accountId, currentOffset + stepMs);

      rows.push({
        campaign_id: campaign.id,
        lead_id: lead.lead_id,
        email_account_id: accountId,
        template_id: template?.id ?? null,
        scheduled_at: new Date(Date.now() + currentOffset),
        status: "PENDING",
      });
    }

    if (rows.length > 0) {
      await jobRepo.insertJobs(rows);
    }
  }
}

async function requeueBatch(accountId: number, delayMs: number): Promise<void> {
  const ids = await jobRepo.dueJobIds(accountId, JOBS_PER_ACCOUNT_PER_TICK);
  const scheduledAt = new Date(Date.now() + delayMs);
  for (const id of ids) {
    const attempts = await jobRepo.attemptsForJob(id);
    if (attempts >= MAX_ATTEMPTS) {
      await jobRepo.markFailed(id, "max retries exceeded: account unavailable");
      continue;
    }
    await jobRepo.requeue(id, scheduledAt, "account unavailable");
  }
}

async function processJob(
  jobId: number,
  account: { id: number; email: string },
  credentials: EmailServerCredentials
): Promise<void> {
  const job = await jobRepo.processingById(jobId);
  if (!job) return;

  if (job.campaign_status !== "ACTIVE") {
    if (job.campaign_status === "PAUSED") {
      await jobRepo.requeue(jobId, new Date(Date.now() + retryDelayMs(job.attempts)), "campaign paused");
    } else {
      await jobRepo.cancel(jobId, "campaign is no longer active");
    }
    return;
  }

  if (!EMAIL_RE.test(job.lead_email)) {
    await jobRepo.markFailed(jobId, "permanent: invalid recipient email");
    await jobRepo.recordEvent(jobId, job.lead_id, "FAILED", null, { error: "invalid recipient email" });
    broadcast(job.campaign_user_id, {
      type: "job",
      campaignId: job.campaign_id,
      jobId,
      status: "FAILED",
      accountId: job.email_account_id,
      leadId: job.lead_id,
      leadEmail: job.lead_email,
      error: "invalid recipient email",
    });
    return;
  }

  if (await suppressionRepo.isSuppressed(job.lead_email)) {
    await jobRepo.skip(jobId, "lead is suppressed");
    broadcast(job.campaign_user_id, {
      type: "job",
      campaignId: job.campaign_id,
      jobId,
      status: "SKIPPED",
      accountId: job.email_account_id,
      leadId: job.lead_id,
      leadEmail: job.lead_email,
      error: "lead is suppressed",
    });
    return;
  }

  let customData: Record<string, unknown> | null = null;
  if (job.lead_custom_data) {
    try {
      customData = JSON.parse(job.lead_custom_data);
    } catch {
      customData = null;
    }
  }

  const leadContext = {
    first_name: job.lead_first_name,
    last_name: job.lead_last_name,
    company: job.lead_company,
    email: job.lead_email,
    website: job.lead_website,
    phone: job.lead_phone,
    custom_data: customData,
  };

  let rendered: ReturnType<typeof renderEmail> | null = null;
  const subject =
    (job.lead_subject ?? "").trim() ||
    (job.template_subject ?? "").trim() ||
    "";
  const body =
    (job.lead_message ?? "").trim() ||
    (job.template_body ?? "").trim() ||
    "";
  const senderEmail = EMAIL_RE.test(credentials.username)
    ? credentials.username
    : account.email;
  const senderDisplayName = displayNameFromEmail(senderEmail);

  if (subject || body || job.template_footer) {
    rendered = renderEmail(
      { subject, body, footer: job.template_footer ?? null },
      leadContext,
      senderDisplayName,
      job.campaign_id
    );
  }
  if (!rendered) {
    await jobRepo.markFailed(jobId, "permanent: lead has no email message and campaign has no email template");
    await jobRepo.recordEvent(jobId, job.lead_id, "FAILED", null, { error: "no template or message" });
    broadcast(job.campaign_user_id, {
      type: "job",
      campaignId: job.campaign_id,
      jobId,
      status: "FAILED",
      accountId: job.email_account_id,
      leadId: job.lead_id,
      leadEmail: job.lead_email,
      error: "no template or message",
    });
    return;
  }

  const windowState = await campaignWindowState({
    id: job.campaign_id,
    start_at: job.campaign_start_at,
    end_at: job.campaign_end_at,
  });
  if (windowState.ended) {
    await jobRepo.cancel(jobId, "campaign sending window ended before this email was sent");
    return;
  }
  if (!windowState.within) {
    const holdUntil = windowState.startAt ?? new Date(Date.now() + retryDelayMs(job.attempts));
    await jobRepo.reschedule(jobId, holdUntil, "outside campaign sending window");
    return;
  }

  const sendingWindow = await sendingLimitsRepo.windowFor("campaign", job.campaign_id);
  if (!sendingLimitsRepo.isInsideWeekdayWindow(sendingWindow?.allowed_weekdays ?? null)) {
    const tomorrow = getTomorrowStart(sendingWindow?.start_time);
    await jobRepo.reschedule(jobId, tomorrow, "outside allowed weekdays");
    return;
  }
  if (
    !sendingLimitsRepo.isInsideTimeWindow(
      sendingWindow?.start_time ?? null,
      sendingWindow?.end_time ?? null
    )
  ) {
    const holdUntil = new Date(Date.now() + 15 * 60 * 1000);
    await jobRepo.reschedule(jobId, holdUntil, "outside allowed hours");
    return;
  }

  // Double-check Account daily and hourly limits before sending
  const accLimits = await getAccountEffectiveLimits({
    id: account.id,
    daily_limit: job.account_daily_limit ?? 50,
    hourly_limit: job.account_hourly_limit ?? 10,
  });
  const [accSentToday, accSentHour] = await Promise.all([
    jobRepo.sentTodayForAccount(account.id),
    jobRepo.sentThisHourForAccount(account.id),
  ]);
  const actualAccSentToday = Math.max(accSentToday, job.account_sent_today ?? 0);
  if (actualAccSentToday >= accLimits.daily) {
    const tomorrow = getTomorrowStart(accLimits.window?.start_time);
    await jobRepo.reschedule(jobId, tomorrow, "Account daily sending limit reached for today");
    return;
  }
  if (accSentHour >= accLimits.hourly) {
    const nextHour = new Date(Date.now() + 15 * 60 * 1000);
    await jobRepo.reschedule(jobId, nextHour, "Account hourly sending limit reached");
    return;
  }

  // Double-check Campaign daily and hourly limits before sending
  const campLimits = await getCampaignEffectiveLimits({
    id: job.campaign_id,
    daily_limit: job.campaign_daily_limit,
    hourly_limit: job.campaign_hourly_limit,
  });
  const [campSentToday, campSentHour] = await Promise.all([
    jobRepo.sentTodayForCampaign(job.campaign_id),
    jobRepo.sentThisHourForCampaign(job.campaign_id),
  ]);
  if (campSentToday >= campLimits.daily) {
    const tomorrow = getTomorrowStart(campLimits.window?.start_time);
    await jobRepo.reschedule(jobId, tomorrow, "Campaign daily sending limit reached for today");
    return;
  }
  if (campSentHour >= campLimits.hourly) {
    const nextHour = new Date(Date.now() + 15 * 60 * 1000);
    await jobRepo.reschedule(jobId, nextHour, "Campaign hourly sending limit reached");
    return;
  }

  try {
    const result = await sendEmail(credentials, {
      from: senderEmail,
      fromName: senderDisplayName,
      replyTo: senderEmail,
      to: job.lead_email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      unsubscribeUrl: rendered.unsubscribeUrl,
    });
    await jobRepo.markSent(jobId, result.messageId);
    await jobRepo.incrementAccountSentToday(account.id);
    await jobRepo.recordEvent(jobId, job.lead_id, "SENT", result.messageId, null);
    authFailureCounts.set(account.id, 0);
    broadcast(job.campaign_user_id, {
      type: "job",
      campaignId: job.campaign_id,
      jobId,
      status: "SENT",
      accountId: job.email_account_id,
      leadId: job.lead_id,
      leadEmail: job.lead_email,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    const send = error as SendError;
    if (send.kind === "auth") {
      const failures = (authFailureCounts.get(account.id) ?? 0) + 1;
      authFailureCounts.set(account.id, failures);
      if (failures >= 3) {
        await accountRepo.setStatusById(account.id, "disabled");
        broadcast(job.campaign_user_id, {
          type: "account",
          id: account.id,
          status: "disabled",
        });
      }
      await retryOrFail(jobId, job.attempts, send.message, job);
    } else if (send.kind === "invalid_recipient") {
      await retryOrFail(jobId, MAX_ATTEMPTS, send.message, job);
      await jobRepo.recordEvent(jobId, job.lead_id, "BOUNCED", null, { kind: "hard" });
      await suppressionRepo.addSuppression(job.lead_email, "BOUNCED", "smtp_error");
    } else if (send.kind === "permanent") {
      await retryOrFail(jobId, MAX_ATTEMPTS, send.message, job);
    } else {
      await retryOrFail(jobId, job.attempts, send.message, job);
    }
  }
}

async function processDueJobs(): Promise<void> {
  const accountIds = await jobRepo.accountsWithDueJobs();
  for (const accountId of accountIds) {
    const account = await accountRepo.accountById(accountId);
    if (!account) continue;

    if (account.status !== "active") {
      await requeueBatch(accountId, 5 * 60 * 1000);
      continue;
    }

    const cooldownUntil = accountCooldownUntil.get(accountId) ?? 0;
    if (Date.now() < cooldownUntil) {
      continue;
    }

    if (account.last_sent_at) {
      const elapsed = Date.now() - new Date(account.last_sent_at).getTime();
      const { minMs } = getSendDelayRange();
      if (elapsed < minMs) {
        accountCooldownUntil.set(accountId, new Date(account.last_sent_at).getTime() + minMs);
        continue;
      }
    }

    let credentials: EmailServerCredentials;
    try {
      credentials = accountRepo.deserializeCredentials(account.credentials_reference);
    } catch {
      await accountRepo.setStatusById(account.id, "disabled");
      await requeueBatch(accountId, 5 * 60 * 1000);
      continue;
    }

    const limits = await getAccountEffectiveLimits(account);
    const [sentToday, sentThisHour] = await Promise.all([
      jobRepo.sentTodayForAccount(accountId),
      jobRepo.sentThisHourForAccount(accountId),
    ]);
    const actualSentToday = Math.max(sentToday, account.sent_today);
    const dailyRemaining = limits.daily - actualSentToday;
    const hourlyRemaining = limits.hourly - sentThisHour;

    if (dailyRemaining <= 0) {
      // Account has reached its daily sending limit for today!
      // Postpone due jobs to tomorrow so no more emails are sent today.
      const tomorrow = getTomorrowStart(limits.window?.start_time);
      const dueJobIds = await jobRepo.dueJobIds(accountId, 50);
      for (const id of dueJobIds) {
        await jobRepo.reschedule(
          id,
          tomorrow,
          "Account daily sending limit reached for today. Postponed to tomorrow."
        );
      }
      continue;
    }

    if (hourlyRemaining <= 0) {
      // Hourly limit reached for this account. Skip until next hour.
      continue;
    }

    const capacity = Math.min(dailyRemaining, hourlyRemaining, JOBS_PER_ACCOUNT_PER_TICK);
    if (capacity <= 0) continue;

    const dueIds = await jobRepo.dueJobIds(accountId, capacity);
    if (dueIds.length === 0) continue;
    await jobRepo.claim(dueIds);

    for (const jobId of dueIds) {
      await processJob(jobId, { id: account.id, email: account.email }, credentials);
      accountCooldownUntil.set(account.id, Date.now() + nextRandomDelayMs());
    }
  }
}

async function finalizeCampaigns(): Promise<void> {
  const campaigns = await campaignRepo.activeCampaigns();
  for (const campaign of campaigns) {
    const ended = campaign.end_at && Date.now() > new Date(campaign.end_at).getTime();

    const [unfinished, leadCount, jobCount] = await Promise.all([
      jobRepo.unfinishedJobCount(campaign.id),
      campaignRepo.campaignLeadCount(campaign.id),
      jobRepo.jobCountForCampaign(campaign.id),
    ]);

    if (ended) {
      await jobRepo.backfillCancelled(
        campaign.id,
        "campaign sending window ended before this lead was scheduled"
      );
      await jobRepo.canceledPending(campaign.id, "campaign sending window ended");
      await campaignRepo.setCampaignStatus(campaign.id, "COMPLETED");
      broadcast(campaign.user_id, {
        type: "campaign",
        id: campaign.id,
        status: "COMPLETED",
      });
      continue;
    }

    if (unfinished === 0 && leadCount > 0 && jobCount >= leadCount) {
      await campaignRepo.setCampaignStatus(campaign.id, "COMPLETED");
      broadcast(campaign.user_id, {
        type: "campaign",
        id: campaign.id,
        status: "COMPLETED",
      });
    }
  }
}

export async function runEngineTick(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const [lockRows] = await connection.query<RowDataPacketAsAny[]>(
      "SELECT GET_LOCK(?, 0) AS locked",
      [LOCK_NAME]
    );
    if (Number(lockRows[0]?.locked) !== 1) return;
    try {
      await jobRepo.resetSentTodayCounters();
      await generateJobs();
      await processDueJobs();
      await finalizeCampaigns();
    } finally {
      await connection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    }
  } finally {
    connection.release();
  }
}

interface RowDataPacketAsAny extends RowDataPacket {
  locked?: number;
}