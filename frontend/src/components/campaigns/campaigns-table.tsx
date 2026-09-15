"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Eye,
  Loader2,
  Megaphone,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  apiFetch,
  type CampaignDetail,
  type CampaignSummary,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CampaignFormDialog } from "@/components/campaigns/campaign-form-dialog";
import { CampaignDetailsDialog } from "@/components/campaigns/campaign-details-dialog";
import { CampaignRestartDialog } from "@/components/campaigns/campaign-restart-dialog";
import { SendingIndicator } from "@/components/campaigns/sending-indicator";
import { SendProgress } from "@/components/campaigns/send-progress";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function CampaignsTable() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<CampaignDetail | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsCampaign, setDetailsCampaign] = useState<CampaignSummary | null>(null);
  const [restartTarget, setRestartTarget] = useState<CampaignSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: CampaignSummary[] }>("/api/campaigns").then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setCampaigns(data.data);
        setError(null);
      } else {
        setError(error ?? "Failed to load campaigns");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function runAction(campaign: CampaignSummary, action: string) {
    setBusyId(campaign.id);
    setError(null);
    const { ok, error } = await apiFetch(`/api/campaigns/${campaign.id}/${action}`, {
      method: "POST",
    });
    setBusyId(null);
    if (ok) {
      toast.success(`Campaign "${campaign.name}" ${action === "cancel" ? "cancelled" : action + "d"}.`);
      setReload((value) => value + 1);
    } else {
      setError(error ?? `Failed to ${action} campaign`);
    }
  }

  function openEdit(campaign: CampaignSummary) {
    setFormLoading(true);
    apiFetch<{ data: CampaignDetail }>(`/api/campaigns/${campaign.id}`).then(({ ok, data, error }) => {
      setFormLoading(false);
      if (ok && data) {
        setEditing(data.data);
        setFormKey((value) => value + 1);
        setFormOpen(true);
      } else {
        setError(error ?? "Failed to load campaign");
      }
    });
  }

  function openCreate() {
    setEditing(null);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { ok, error } = await apiFetch(`/api/campaigns/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) {
      toast.success(`Deleted campaign "${deleteTarget.name}"`);
      setReload((value) => value + 1);
    } else {
      setError(error ?? "Failed to delete campaign");
    }
  }

  const activeCount = campaigns.filter((campaign) => campaign.status === "ACTIVE").length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{campaigns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {campaigns.reduce((sum, campaign) => sum + campaign.counts.leads, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Campaigns</CardTitle>
          <Button type="button" onClick={openCreate}>
            <Megaphone />
            Create campaign
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-10 text-center">
              <Megaphone className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No campaigns yet. Create your first outreach campaign.
              </p>
              <Button type="button" className="mt-4" onClick={openCreate}>
                <Megaphone />
                Create campaign
              </Button>
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
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays />
                        {formatDateTime(campaign.start_at)} → {formatDateTime(campaign.end_at)}
                      </div>
                    </TableCell>
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
                    <TableCell>
                      <SendProgress
                        progress={campaign.progress}
                        sending={campaign.status === "ACTIVE"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`View details for ${campaign.name}`}
                          onClick={() => setDetailsCampaign(campaign)}
                        >
                          <Eye />
                          Details
                        </Button>
                        {campaign.status !== "ACTIVE" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Restart ${campaign.name}`}
                            disabled={busyId === campaign.id}
                            onClick={() => setRestartTarget(campaign)}
                          >
                            <RotateCcw />
                            Restart
                          </Button>
                        ) : null}
                        {campaign.status === "DRAFT" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === campaign.id}
                            onClick={() => runAction(campaign, "start")}
                          >
                            {busyId === campaign.id ? <Loader2 className="animate-spin" /> : <Play />}
                            {busyId === campaign.id ? "Starting…" : "Start"}
                          </Button>
                        ) : null}
                        {campaign.status === "ACTIVE" ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busyId === campaign.id}
                              onClick={() => runAction(campaign, "pause")}
                            >
                              <Pause />
                              Pause
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyId === campaign.id}
                              onClick={() => runAction(campaign, "cancel")}
                            >
                              <X />
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {campaign.status === "PAUSED" ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busyId === campaign.id}
                              onClick={() => runAction(campaign, "resume")}
                            >
                              <RotateCcw />
                              Resume
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyId === campaign.id}
                              onClick={() => runAction(campaign, "cancel")}
                            >
                              <X />
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${campaign.name}`}
                            onClick={() => openEdit(campaign)}
                          >
                            <Pencil />
                          </Button>
                        ) : null}
                        {campaign.status === "CANCELLED" || campaign.status === "COMPLETED" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${campaign.name}`}
                            onClick={() => setDeleteTarget(campaign)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CampaignDetailsDialog
        key={detailsCampaign?.id ?? "details-none"}
        open={detailsCampaign !== null}
        onOpenChange={(open) => !open && setDetailsCampaign(null)}
        campaign={detailsCampaign}
      />

      <CampaignRestartDialog
        key={restartTarget?.id ?? "restart-none"}
        open={restartTarget !== null}
        onOpenChange={(open) => !open && setRestartTarget(null)}
        campaign={restartTarget}
        onRestarted={(message) => {
          setReload((value) => value + 1);
          toast.success(message);
        }}
      />

      <CampaignFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={editing}
        onSaved={(campaign) => {
          setReload((value) => value + 1);
          toast.success(
            editing ? `Campaign updated: ${campaign.name}` : `Campaign created: ${campaign.name}`
          );
        }}
      />

      {formLoading ? <p className="text-sm text-muted-foreground">Loading campaign details…</p> : null}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Campaign <span className="font-medium">{deleteTarget?.name}</span> and its job history
              will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}