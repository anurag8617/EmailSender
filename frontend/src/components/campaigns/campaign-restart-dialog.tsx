"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { apiFetch, type CampaignSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function datetimeLocalNow(offsetMs = 60_000): string {
  const date = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

type CampaignRestartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignSummary | null;
  onRestarted: (message: string) => void;
};

export function CampaignRestartDialog({
  open,
  onOpenChange,
  campaign,
  onRestarted,
}: CampaignRestartDialogProps) {
  const [startAt, setStartAt] = useState(() => datetimeLocalNow(60_000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!campaign) return;
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      end_at: null,
    };
    if (startAt.trim()) {
      payload.start_at = startAt.replace("T", " ");
    }

    const result = await apiFetch(`/api/campaigns/${campaign.id}/restart`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (result.ok) {
      const when = startAt.trim()
        ? `Start: ${new Date(startAt).toLocaleString()}`
        : "sending as soon as possible";
      onOpenChange(false);
      onRestarted(`Campaign "${campaign.name}" restarted (${when}). Sending starts automatically.`);
    } else {
      setError(result.error ?? "Failed to restart campaign");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Restart campaign
          </DialogTitle>
          <DialogDescription>
            Resends the same email to all recipients of{" "}
            <span className="font-medium text-foreground">{campaign?.name}</span>. Existing job
            history is reset first. Set the sending schedule below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="restart-start">Schedule start</Label>
            <Input
              id="restart-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              When sending begins. Leave empty to send as soon as possible.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? "Restarting…" : "Restart"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}