import nodemailer from "nodemailer";
import { EmailServerCredentials } from "../types/emailAccounts";
import { resolveSecureCredentials } from "../utils/smtp";

export type FailureKind =
  | "auth"
  | "rate_limited"
  | "invalid_recipient"
  | "permanent"
  | "transient";

export class SendError extends Error {
  readonly kind: FailureKind;
  constructor(message: string, kind: FailureKind) {
    super(message);
    this.name = "SendError";
    this.kind = kind;
  }
}

export interface SendOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  messageId: string;
}

const TIMEOUT_MS = 20_000;

function classify(error: { message?: string; code?: string; responseCode?: number }): FailureKind {
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  const responseCode = error.responseCode;

  if (code === "eauth" || code === "eenvelope") return "auth";
  if (/invalid login|authentication failed|credentials rejected|5\.7\.(8|14)/i.test(message)) {
    return "auth";
  }

  if (
    code === "econnection" ||
    code === "etimedout" ||
    code === "esocket" ||
    code === "econnrefused" ||
    code === "econnreset" ||
    (responseCode !== undefined && responseCode >= 400 && responseCode < 500)
  ) {
    return "transient";
  }

  if (responseCode !== undefined && responseCode >= 500 && responseCode !== 550) {
    return "transient";
  }

  if (responseCode === 550 || code === "ecompliance") return "invalid_recipient";
  if (/user unknown|no such user|invalid recipient|mailbox unavailable|does not exist/i.test(message)) {
    return "invalid_recipient";
  }
  if (/550|552|553/i.test(message)) return "permanent";

  return "transient";
}

export async function sendEmail(
  credentials: EmailServerCredentials,
  options: SendOptions
): Promise<SendResult> {
  const resolved = resolveSecureCredentials(credentials);
  const transporter = nodemailer.createTransport({
    host: resolved.host,
    port: resolved.port,
    secure: resolved.secure,
    auth: {
      user: credentials.username,
      pass: credentials.password,
    },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${credentials.username}" <${options.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { messageId: info.messageId ?? `${Date.now()}` };
  } catch (error) {
    const err = error as { message?: string; code?: string; responseCode?: number };
    const kind = classify(err);
    const detail = err.message ?? String(error);
    throw new SendError(
      `${kind}: ${detail.length > 500 ? detail.slice(0, 500) : detail}`,
      kind
    );
  } finally {
    transporter.close();
  }
}