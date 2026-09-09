export type DashboardAccountStat = {
  id: number;
  email: string;
  status: string;
  daily_limit: number;
  sent_today: number;
  sent_total: number;
  failed_total: number;
  bounced_total: number;
};

export type DashboardStats = {
  totalLeads: number;
  activeCampaigns: number;
  emailsSent: number;
  emailsFailed: number;
  bounces: number;
  unsubscribes: number;
  availableAccounts: number;
  sentToday: number;
  accounts: DashboardAccountStat[];
};