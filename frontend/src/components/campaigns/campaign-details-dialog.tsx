"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, RefreshCw, Send, Users } from "lucide-react";
import {
  apiFetch,
  type CampaignDetail,
  type CampaignSummary,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendProgress } from "@/components/campaigns/send-progress";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const RECIPIENT_STATUS_LABEL: Record<string, string> = {
  SENT: "Sent",
  PENDING: "Pending",
  PROCESSING: "Sending",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  SKIPPED: "Skipped",
};

const RECIPIENT_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SENT: "default",
  PENDING: "outline",
  PROCESSING: "secondary",
  FAILED: "destructive",
  CANCELLED: "outline",
  SKIPPED: "outline",
};

const UNSENT_FOR_RESEND = new Set(["CANCELLED", "FAILED", "SKIPPED"]);

function isUnsentForResend(status: string | null): boolean {
  return !status || UNSENT_FOR_RESEND.has(status);
}

function recipientStatusLabel(status: string | null): string {
  if (!status) return "Not scheduled";
  return RECIPIENT_STATUS_LABEL[status] ?? status;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

type CampaignDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignSummary | null;
};

export function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignDetailsDialogProps) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const liveCampaignId = campaign?.id ?? null;

  useRealtimeRefresh(
    () => {
      if (open && liveCampaignId) setReload((value) => value + 1);
    },
    {
      enabled: open && liveCampaignId !== null,
      cooldownMs: 1500,
      shouldRefresh: (event) => {
        if (event.type === "job") return event.campaignId === liveCampaignId;
        if (event.type === "campaign") return event.id === liveCampaignId;
        return false;
      },
    }
  );

  useEffect(() => {
    if (!open || !campaign) return;
    let cancelled = false;
    apiFetch<{ data: CampaignDetail }>(`/api/campaigns/${campaign.id}`).then(
      ({ ok, data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (ok && data) {
          setDetail(data.data);
          setError(null);
        } else {
          setError(error ?? "Failed to load campaign details");
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open, campaign, reload]);

  async function handleResendUnsent() {
    if (!detail) return;
    setResending(true);
    setResendError(null);
    const result = await apiFetch<{ data: CampaignDetail }>(`/api/campaigns/${detail.id}/resend-unsent`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setResending(false);
    if (result.ok) {
      setReload((value) => value + 1);
    } else {
      setResendError(result.error ?? "Failed to resend unsent emails");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaign?.name ?? "Campaign details"}
            {detail ? (
              <Badge variant={STATUS_VARIANT[detail.status]}>{detail.status}</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {detail
              ? `Created ${formatDateTime(detail.created_at)} · Updated ${formatDateTime(detail.updated_at)}`
              : "Loading campaign details…"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : error && !detail ? (
          <div role="alert" className="grid gap-3 py-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReload((value) => value + 1)}
              >
                <RefreshCw />
                Retry
              </Button>
            </div>
          </div>
        ) : detail ? (
          <div className="-mx-4 max-h-[65vh] overflow-y-auto px-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="truncate text-sm font-medium">
                    {formatDateTime(detail.start_at)} → {formatDateTime(detail.end_at)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Email template</p>
                <p className="truncate text-sm font-medium">
                  {detail.template_name ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Daily limit</p>
                <p className="text-sm font-medium tabular-nums">{detail.daily_limit}</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Hourly limit</p>
                <p className="text-sm font-medium tabular-nums">{detail.hourly_limit}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
              <Stat label="Leads" value={detail.counts.leads} />
              <Stat label="Sent" value={detail.counts.sent} />
              <Stat label="Failed" value={detail.counts.failed} />
              <Stat label="Not sent" value={detail.leads.filter((lead) => isUnsentForResend(lead.job_status)).length} />
              <Stat label="Bounced" value={detail.counts.bounced} />
              <Stat label="Unsubscribed" value={detail.counts.unsubscribed} />
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Progress</p>
                <SendProgress progress={detail.progress} sending={detail.status === "ACTIVE"} />
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Sender accounts</p>
              {detail.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sender accounts assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.accounts.map((account) => (
                    <Badge key={account.id} variant="secondary">
                      {account.email}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                Recipients ({detail.leads.length})
                <span className="text-muted-foreground">
                  · {detail.leads.filter((lead) => lead.job_status === "SENT").length} sent
                </span>
                {detail.leads.filter((lead) => isUnsentForResend(lead.job_status)).length > 0 ? (
                  <span className="text-muted-foreground">
                    · {detail.leads.filter((lead) => isUnsentForResend(lead.job_status)).length} not sent
                  </span>
                ) : null}
                {detail.status !== "ACTIVE" &&
                detail.leads.filter((lead) => isUnsentForResend(lead.job_status)).length > 0 ? (
                  <>
                    <span className="mx-1 text-border">·</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resending}
                      onClick={handleResendUnsent}
                    >
                      {resending ? <Loader2 className="animate-spin" /> : <Send />}
                      {resending
                        ? "Resending…"
                        : `Resend to ${detail.leads.filter((lead) => isUnsentForResend(lead.job_status)).length} unsent`}
                    </Button>
                  </>
                ) : null}
              </div>
              {resendError ? (
                <p role="alert" className="mb-2 text-sm text-destructive">
                  {resendError}
                </p>
              ) : null}
              <div className="max-h-52 overflow-y-auto rounded-lg border">
                {detail.leads.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No recipients in this campaign.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell>{lead.company || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                lead.job_status
                                  ? (RECIPIENT_STATUS_VARIANT[lead.job_status] ?? "outline")
                                  : "secondary"
                              }
                            >
                              {recipientStatusLabel(lead.job_status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}