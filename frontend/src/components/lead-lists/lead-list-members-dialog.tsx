"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, type Lead, type LeadGroup, type LeadList } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LeadListMembersDialogProps = {
  list: LeadGroup | null;
  onOpenChange: (open: boolean) => void;
  onChanged: (list: LeadGroup) => void;
};

const MEMBER_PAGE_SIZE = 10;

export function LeadListMembersDialog({
  list,
  onOpenChange,
  onChanged,
}: LeadListMembersDialogProps) {
  return (
    <Dialog open={list !== null} onOpenChange={onOpenChange}>
      {list ? (
        <LeadListMembersPanel
          key={list.id}
          list={list}
          onChanged={onChanged}
        />
      ) : null}
    </Dialog>
  );
}

function LeadListMembersPanel({
  list,
  onChanged,
}: {
  list: LeadGroup;
  onChanged: (list: LeadGroup) => void;
}) {
  const [members, setMembers] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [candidateLeads, setCandidateLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [candidatesLoading, setCandidatesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page: String(memberPage), pageSize: String(MEMBER_PAGE_SIZE) });
    if (memberSearch.trim()) params.set("search", memberSearch.trim());

    apiFetch<LeadList>(`/api/lead-lists/${list.id}/members?${params}`).then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setMembers(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        setError(error ?? "Failed to load members");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [list.id, memberPage, memberSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setMemberPage(1), 350);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  useEffect(() => {
    if (!adding) return;
    let cancelled = false;

    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (leadSearch.trim()) params.set("search", leadSearch.trim());

    apiFetch<LeadList>(`/api/leads?${params}`).then(({ ok, data }) => {
      if (cancelled) return;
      setCandidatesLoading(false);
      if (ok && data) setCandidateLeads(data.rows);
      else setCandidateLeads([]);
    });

    return () => {
      cancelled = true;
    };
  }, [adding, leadSearch]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSelected() {
    if (selected.size === 0) return;
    const { data, error } = await apiFetch<{ data: LeadGroup; added: number }>(
      `/api/lead-lists/${list.id}/members`,
      { method: "POST", body: JSON.stringify({ lead_ids: [...selected] }) }
    );
    if (data) {
      onChanged(data.data);
      setSelected(new Set());
      toast.success(`Added ${data.added} lead${data.added === 1 ? "" : "s"}`);
      setMemberPage(1);
    } else {
      toast.error(error ?? "Failed to add leads");
    }
  }

  async function handleRemoveMember(leadId: number, email: string) {
    const { ok, data, error } = await apiFetch<{ data: LeadGroup }>(
      `/api/lead-lists/${list.id}/members/${leadId}`,
      { method: "DELETE" }
    );
    if (ok && data) {
      onChanged(data.data);
      setMembers((prev) => prev.filter((lead) => lead.id !== leadId));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success(`Removed ${email}`);
    } else {
      toast.error(error ?? "Failed to remove lead");
    }
  }

  const startIndex = (memberPage - 1) * MEMBER_PAGE_SIZE + 1;
  const endIndex = Math.min(memberPage * MEMBER_PAGE_SIZE, total);

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{list.name}</DialogTitle>
        <DialogDescription>Manage the leads in this list.</DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full pl-8 sm:w-56"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setAdding((value) => !value)}>
          <Plus />
          {adding ? "Hide add panel" : "Add leads"}
        </Button>
      </div>

      {adding ? (
        <div className="grid gap-2 rounded-lg border p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search all leads…"
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              className="w-full pl-8"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
            {candidatesLoading ? (
              <p className="p-2 text-sm text-muted-foreground">Loading leads…</p>
            ) : candidateLeads.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No leads found.</p>
            ) : (
              <div className="grid gap-1">
                {candidateLeads.map((lead) => (
                  <label
                    key={lead.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : "Select leads to add"}
            </span>
            <Button type="button" size="sm" disabled={selected.size === 0} onClick={handleAddSelected}>
              Add selected
            </Button>
          </div>
        </div>
      ) : null}

      <div className="max-h-80 overflow-y-auto rounded-lg border">
        {loading ? (
          <div className="grid gap-2 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {memberSearch
              ? "No members match your search."
              : "No leads in this list yet. Click “Add leads” to include some."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${lead.email}`}
                      onClick={() => handleRemoveMember(lead.id, lead.email)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DialogFooter className="items-center justify-between sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {total > 0 ? `Showing ${startIndex}–${endIndex} of ${total}` : "0 leads"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={memberPage <= 1 || loading}
            onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {memberPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={memberPage >= totalPages || loading}
            onClick={() => setMemberPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}