import nodemailer from "nodemailer";
import {
  EmailAccountPublic,
  EmailAccountRow,
  EmailServerCredentials,
} from "../types/emailAccounts";
import { deserializeCredentials } from "../repositories/emailAccounts";
import { resolveSecureCredentials } from "../utils/smtp";

const CONNECTION_TIMEOUT_MS = 10_000;

export function toPublic(row: EmailAccountRow): EmailAccountPublic {
  const credentials = deserializeCredentials(row.credentials_reference);
  return {
    id: row.id,
    email: row.email,
    provider: row.provider,
    auth_type: row.auth_type,
    daily_limit: row.daily_limit,
    hourly_limit: row.hourly_limit,
    sent_today: row.sent_today,
    last_sent_at: row.last_sent_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    server: {
      host: credentials.host,
      port: credentials.port,
      secure: credentials.secure,
      username: credentials.username,
    },
  };
}

export interface TestResult {
  ok: true;
}

export class TestConnectionError extends Error {
  authFailure: boolean;
  constructor(message: string, authFailure: boolean) {
    super(message);
    this.name = "TestConnectionError";
    this.authFailure = authFailure;
  }
}

export async function testSmtpConnection(credentials: EmailServerCredentials): Promise<TestResult> {
  const resolved = resolveSecureCredentials(credentials);
  const transporter = nodemailer.createTransport({
    host: resolved.host,
    port: resolved.port,
    secure: resolved.secure,
    auth: {
      user: credentials.username,
      pass: credentials.password,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: CONNECTION_TIMEOUT_MS,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    const code = (error as { code?: string; responseCode?: number }).code;
    let authFailure = code === "EAUTH" || code === "EENVELOPE";

    if (error instanceof Error) {
      const details = error.message ?? "";
      if (/invalid login|authentication failed|credentials rejected|5\.7\.(8|14)|5\.5\.1/i.test(details)) {
        authFailure = true;
      }
      if (authFailure) {
        throw new TestConnectionError(
          "SMTP authentication failed. Check the username/password and ensure the provider allows app passwords for third-party mail.",
          true
        );
      }
      throw new TestConnectionError(
        `Could not reach the mail server: ${details.length > 300 ? details.slice(0, 300) : details}`,
        false
      );
    }

    throw new TestConnectionError("Could not reach the mail server", false);
  } finally {
    transporter.close();
  }
}