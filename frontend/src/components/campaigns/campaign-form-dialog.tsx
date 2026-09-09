"use client";

import { useEffect, useState } from "react";
import {
  apiFetch,
  type CampaignDetail,
  type EmailAccount,
  type Lead,
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

const LEADS_PAGE_SIZE = 100;
const LEAD_PAGES = 10;

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
  const [leadIds, setLeadIds] = useState<Set<number>>(
    () => new Set(campaign?.leads.map((lead) => lead.id) ?? [])
  );
  const [accountIds, setAccountIds] = useState<Set<number>>(
    () => new Set(campaign?.accounts.map((account) => account.id) ?? [])
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadOptions() {
      const leadPages: Lead[] = [];
      for (let page = 1; page <= LEAD_PAGES; page++) {
        const { ok, data } = await apiFetch<{ rows: Lead[]; total: number }>(
          `/api/leads?page=${page}&pageSize=${LEADS_PAGE_SIZE}`
        );
        if (!ok || !data) break;
        leadPages.push(...data.rows);
        if (data.rows.length < LEADS_PAGE_SIZE) break;
      }
      return leadPages;
    }

    Promise.all([
      loadOptions(),
      apiFetch<{ data: EmailAccount[] }>("/api/email-accounts"),
      apiFetch<{ data: Template[] }>("/api/templates"),
    ]).then(([leadRows, accountsResult, templatesResult]) => {
        if (cancelled) return;
        setOptionsLoading(false);
        setLeads(leadRows);
        if (accountsResult.ok && accountsResult.data) {
          setAccounts(accountsResult.data.data);
        }
        if (templatesResult.ok && templatesResult.data) {
          setTemplates(templatesResult.data.data);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredLeads = leadSearch.trim()
    ? leads.filter((lead) => {
        const term = leadSearch.trim().toLowerCase();
        return (
          lead.email.toLowerCase().includes(term) ||
          lead.first_name?.toLowerCase().includes(term) ||
          lead.last_name?.toLowerCase().includes(term) ||
          lead.company?.toLowerCase().includes(term)
        );
      })
    : leads;

  const visibleFiltered = filteredLeads.map((lead) => lead.id).length;
  const selectedVisible = filteredLeads.filter((lead) => leadIds.has(lead.id)).length;
  const allVisibleSelected = visibleFiltered > 0 && selectedVisible === visibleFiltered;

  function toggleLead(id: number) {
    setLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllLeads() {
    setLeadIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const lead of filteredLeads) next.delete(lead.id);
      } else {
        for (const lead of filteredLeads) next.add(lead.id);
      }
      return next;
    });
  }

  function toggleAccount(id: number) {
    setAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!templateId) {
      setError("Select an email template before saving the campaign");
      return;
    }

    setLoading(true);

    const payload = {
      name,
      start_at: startAt || null,
      end_at: endAt || null,
      daily_limit: Number(dailyLimit),
      hourly_limit: Number(hourlyLimit),
      template_id: Number(templateId),
      lead_ids: [...leadIds],
      account_ids: [...accountIds],
    };

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
            Pick leads and authorized sender accounts, then set a schedule and sending limits.
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
            <Label htmlFor="campaign-template" className="after:ml-0.5 after:text-destructive after:content-['*']">
              Email template
            </Label>
            <Select value={templateId} onValueChange={(value) => setTemplateId(value ?? "")}>
              <SelectTrigger id="campaign-template" className="w-full">
                <SelectValue placeholder="Select a template" />
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
              Template variables are filled from each lead record when the email is sent.
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
                Leads
              </Label>
              <Badge variant="secondary">{leadIds.size} selected</Badge>
            </div>
            <Input
              type="search"
              placeholder="Filter leads…"
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
              {optionsLoading ? (
                <p className="p-2 text-sm text-muted-foreground">Loading leads…</p>
              ) : filteredLeads.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No leads found.</p>
              ) : (
                <div className="grid gap-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllLeads} />
                    Select all ({visibleFiltered})
                  </label>
                  {filteredLeads.map((lead) => (
                    <label
                      key={lead.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={leadIds.has(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                      />
                      <span className="truncate">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                      </span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {lead.email}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {leadIds.size > 0 ? (
              <p className="text-xs text-muted-foreground">Exactly {leadIds.size} leads will be sent to.</p>
            ) : null}
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