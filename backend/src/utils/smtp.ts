import { EmailServerCredentials } from "../types/emailAccounts";

const IMPLICIT_TLS_PORTS = [465];
const STARTTLS_PORTS = [25, 587];

export function resolveSecureCredentials(
  credentials: EmailServerCredentials
): EmailServerCredentials {
  if (IMPLICIT_TLS_PORTS.includes(credentials.port)) {
    return { ...credentials, secure: true };
  }
  if (STARTTLS_PORTS.includes(credentials.port)) {
    return { ...credentials, secure: false };
  }
  return credentials;
}