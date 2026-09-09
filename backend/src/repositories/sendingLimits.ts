import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";

export interface SendingWindowRow extends RowDataPacket {
  scope: string;
  scope_id: number;
  daily_limit: number;
  hourly_limit: number;
  start_time: string | null;
  end_time: string | null;
  allowed_weekdays: string | null;
}

export async function windowFor(scope: string, scopeId: number): Promise<SendingWindowRow | null> {
  const [rows] = await pool.query<SendingWindowRow[]>(
    `SELECT scope, scope_id, daily_limit, hourly_limit, start_time, end_time, allowed_weekdays
       FROM sending_limits WHERE scope = ? AND scope_id = ? LIMIT 1`,
    [scope, scopeId]
  );
  return rows[0] ?? null;
}

export function isInsideWeekdayWindow(allowedWeekdays: string | null, date: Date = new Date()): boolean {
  if (!allowedWeekdays) return true;
  const allowed = allowedWeekdays.split(",").map((item) => Number(item.trim()));
  if (allowed.length === 0 || allowed.some((item) => Number.isNaN(item))) return true;
  const weekday = date.getDay();
  return allowed.includes(weekday);
}

export function isInsideTimeWindow(
  startTime: string | null,
  endTime: string | null,
  date: Date = new Date()
): boolean {
  if (!startTime || !endTime) return true;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start <= end) {
    return nowMinutes >= start && nowMinutes <= end;
  }
  return nowMinutes >= start || nowMinutes <= end;
}