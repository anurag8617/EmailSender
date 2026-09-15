"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  apiFetch,
  type CampaignDetail,
  type EmailAccount,
  type LeadGroup,
  type LeadGroupList,
  type Template,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CampaignFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignDetail | null;
  onSaved: (campaign: CampaignDetail) => void;
};

function toInputValue(value: string | null): string {
  if (!value) return "";
  return `${value.replace(" ", "T")}`.slice(0, 16);
}

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  onSaved,
}: CampaignFormDialogProps) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [startAt, setStartAt] = useState(toInputValue(campaign?.start_at ?? null));
  const [endAt, setEndAt] = useState(toInputValue(campaign?.end_at ?? null));
  const [dailyLimit, setDailyLimit] = useState(String(campaign?.daily_limit ?? 50));
  const [hourlyLimit, setHourlyLimit] = useState(String(campaign?.hourly_limit ?? 10));
  const [templateId, setTemplateId] = useState<string>(
    campaign?.template_id ? String(campaign.template_id) : ""
  );
  const [selectedLeadListId, setSelectedLeadListId] = useState<number | null>(null);
  const [accountIds, setAccountIds] = useState<Set<number>>(
    () => new Set(campaign?.accounts.map((account) => account.id) ?? [])
  );

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leadLists, setLeadLists] = useState<LeadGroup[]>([]);
  const [leadListValue, setLeadListValue] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Pick<LeadGroup, "id" | "name" | "lead_count"> | null>(
    campaign
      ? { id: 0, name: "Current campaign recipients", lead_count: campaign.leads.length }
      : null
  );
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    Promise.all([
      apiFetch<{ data: EmailAccount[] }>("/api/email-accounts"),
      apiFetch<{ data: Template[] }>("/api/templates"),
      apiFetch<LeadGroupList>("/api/lead-lists?page=1&pageSize=100"),
    ]).then(([accountsResult, templatesResult, listsResult]) => {
        if (cancelled) return;
        setOptionsLoading(false);
        if (accountsResult.ok && accountsResult.data) {
          setAccounts(accountsResult.data.data);
        }
        if (templatesResult.ok && templatesResult.data) {
          setTemplates(templatesResult.data.data);
        }
        if (listsResult.ok && listsResult.data) {
          setLeadLists(listsResult.data.rows);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [open]);

  function toggleAccount(id: number) {
    setAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectLeadList(value: string | null) {
    const id = value ? Number(value) : null;
    const list = leadLists.find((item) => item.id === id) ?? null;
    setSelectedLeadListId(id);
    setLeadListValue("");
    setSelectedSlot(
      list
        ? { id: list.id, name: list.name, lead_count: list.lead_count }
        : null
    );
    if (list) {
      toast.success(`Lead list "${list.name}" selected — ${list.lead_count} recipients`);
    }
  }

  function handleClearSlot() {
    setSelectedLeadListId(null);
    setSelectedSlot(null);
    setLeadListValue("");
  }

  function handleChangeSlot() {
    setSelectedLeadListId(null);
    setSelectedSlot(null);
    setLeadListValue("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!selectedLeadListId && !campaign) {
      setError("Select a lead list before saving the campaign");
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      name,
      start_at: startAt || null,
      end_at: endAt || null,
      daily_limit: Number(dailyLimit),
      hourly_limit: Number(hourlyLimit),
      template_id: templateId ? Number(templateId) : null,
      account_ids: [...accountIds],
    };
    if (selectedLeadListId !== null) {
      payload.lead_list_id = selectedLeadListId;
    }

    const result = campaign
      ? await apiFetch<{ data: CampaignDetail }>(`/api/campaigns/${campaign.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await apiFetch<{ data: CampaignDetail }>("/api/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    setLoading(false);
    if (result.ok && result.data) {
      onSaved(result.data.data);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to save campaign");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "Create campaign"}</DialogTitle>
          <DialogDescription>
            Pick a lead list and authorized sender accounts, then set a schedule and sending limits.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="campaign-name" className="after:ml-0.5 after:text-destructive after:content-['*']">
              Campaign name
            </Label>
            <Input
              id="campaign-name"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="H2 SEO outreach"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Lead list</Label>
              {selectedSlot ? (
                <Badge variant="secondary">{selectedSlot.lead_count} leads</Badge>
              ) : null}
            </div>
            {selectedSlot ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-accent/50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedSlot.name}</p>
                  <p className="text-xs text-muted-foreground">
                    All {selectedSlot.lead_count} leads in this list are the campaign recipients.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleChangeSlot}>
                    Change
                  </Button>
                  {selectedLeadListId !== null ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/lead-lists/${selectedLeadListId}`} />}
                      >
                        View leads
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleClearSlot}>
                        Clear
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-1">
                <Select value={leadListValue} onValueChange={handleSelectLeadList}>
                  <SelectTrigger id="campaign-lead-list" className="w-full">
                    <SelectValue placeholder="Choose a lead list" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadLists.length === 0 ? (
                      <SelectItem value="__none__" disabled data-disabled>
                        No lead lists — create one on the Lead Lists page
                      </SelectItem>
                    ) : (
                      leadLists.map((list) => (
                        <SelectItem key={list.id} value={String(list.id)}>
                          {list.name} ({list.lead_count})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All leads in the chosen list become the campaign recipients.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="campaign-template">Email template</Label>
            <Select value={templateId} onValueChange={(value) => setTemplateId(value ?? "")}>
              <SelectTrigger id="campaign-template" className="w-full">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="__none__" disabled data-disabled>
                    No templates — create one on the Templates page
                  </SelectItem>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional if each lead has its own message. Template variables are filled from the lead
              record when the email is sent.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="campaign-start">Schedule start</Label>
              <Input
                id="campaign-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-end">Schedule end</Label>
              <Input
                id="campaign-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="campaign-daily" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Daily sending limit
              </Label>
              <Input
                id="campaign-daily"
                type="number"
                required
                min={1}
                max={100000}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-hourly" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Hourly sending limit
              </Label>
              <Input
                id="campaign-hourly"
                type="number"
                required
                min={1}
                max={1000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="after:ml-0.5 after:text-destructive after:content-['*']">
                Sender accounts
              </Label>
              <Badge variant="secondary">{accountIds.size} selected</Badge>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border p-2">
              {optionsLoading ? (
                <p className="p-2 text-sm text-muted-foreground">Loading accounts…</p>
              ) : accounts.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  No email accounts. Add one on the Email Accounts page.
                </p>
              ) : (
                <div className="grid gap-1">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={accountIds.has(account.id)}
                        onCheckedChange={() => toggleAccount(account.id)}
                      />
                      <span className="truncate">{account.email}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {account.status === "active" ? account.server.host : "paused"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || optionsLoading}>
              {loading ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}