export type AccountStatus = "active" | "disabled";

export interface EmailAccount {
  id: number;
  user_id: number;
  email: string;
  provider: string;
  auth_type: string;
  daily_limit: number;
  hourly_limit: number;
  sent_today: number;
  last_sent_at: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface EmailAccountRow extends EmailAccount {
  credentials_reference: string;
}

export interface EmailServerCredentials {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface EmailAccountPublic {
  id: number;
  email: string;
  provider: string;
  auth_type: string;
  daily_limit: number;
  hourly_limit: number;
  sent_today: number;
  last_sent_at: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
  server: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
  };
}

export interface AccountStats {
  sentToday: number;
  sentThisHour: number;
  sentTotal: number;
  failedTotal: number;
  bouncedTotal: number;
}