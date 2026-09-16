"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Ban,
  Clock,
  Layers,
  Mail,
  Megaphone,
  Send,
  ShieldOff,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  apiFetch,
  type CampaignSummary,
  type DashboardAccountStat,
  type DashboardStats,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendingIndicator } from "@/components/campaigns/sending-indicator";
import { SendProgress } from "@/components/campaigns/send-progress";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const STAT_CARDS: {
  key: keyof Pick<
    DashboardStats,
    "totalLeads" | "activeCampaigns" | "emailsSent" | "emailsFailed" | "bounces" | "unsubscribes" | "availableAccounts" | "sentToday"
  >;
  label: string;
  icon: typeof Mail;
}[] = [
  { key: "totalLeads", label: "Total leads", icon: Layers },
  { key: "activeCampaigns", label: "Active campaigns", icon: Megaphone },
  { key: "emailsSent", label: "Emails sent", icon: Send },
  { key: "emailsFailed", label: "Emails failed", icon: X },
  { key: "bounces", label: "Bounces", icon: ShieldOff },
  { key: "unsubscribes", label: "Unsubscribes", icon: Ban },
  { key: "availableAccounts", label: "Available accounts", icon: Mail },
  { key: "sentToday", label: "Sent today", icon: Clock },
];

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const loadData = useCallback(() => {
    return Promise.all([
      apiFetch<{ data: DashboardStats }>("/api/dashboard/stats"),
      apiFetch<{ data: CampaignSummary[] }>("/api/campaigns"),
    ]).then(([statsResult, campaignsResult]) => {
      if (statsResult.ok && statsResult.data && campaignsResult.ok && campaignsResult.data) {
        hasLoaded.current = true;
        setStats(statsResult.data.data);
        setCampaigns(campaignsResult.data.data);
        setError(null);
      } else if (!hasLoaded.current) {
        setError(statsResult.error ?? campaignsResult.error ?? "Failed to load dashboard");
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadData().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useRealtimeRefresh(loadData);

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-16 text-center">
        <Activity className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p role="alert" className="text-sm text-destructive">
          {error ?? "Failed to load dashboard"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{stats[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.accounts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daily limit</TableHead>
                  <TableHead>Sent today</TableHead>
                  <TableHead>Total sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Bounced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.accounts.map((account: DashboardAccountStat) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.email}</TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "outline"}>
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{account.daily_limit}</TableCell>
                    <TableCell className="tabular-nums">{account.sent_today}</TableCell>
                    <TableCell className="tabular-nums">{account.sent_total}</TableCell>
                    <TableCell className="tabular-nums">
                      {account.failed_total > 0 ? (
                        <span className="text-destructive">{account.failed_total}</span>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{account.bounced_total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Campaigns</CardTitle>
          <Link
            href="/campaigns"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Manage campaigns →
          </Link>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="py-10 text-center">
              <Megaphone className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No campaigns yet. Create your first outreach campaign to start sending.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Bounced</TableHead>
                  <TableHead>Unsubscribed</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={STATUS_VARIANT[campaign.status]}>
                          {campaign.status}
                        </Badge>
                        {campaign.status === "ACTIVE" ? <SendingIndicator /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{campaign.counts.leads}</TableCell>
                    <TableCell className="tabular-nums">{campaign.counts.sent}</TableCell>
                    <TableCell className="tabular-nums">
                      {campaign.counts.failed > 0 ? (
                        <span className="text-destructive">{campaign.counts.failed}</span>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{campaign.counts.bounced}</TableCell>
                    <TableCell className="tabular-nums">{campaign.counts.unsubscribed}</TableCell>
                    <TableCell>
                      <SendProgress
                        progress={campaign.progress}
                        sending={campaign.status === "ACTIVE"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}