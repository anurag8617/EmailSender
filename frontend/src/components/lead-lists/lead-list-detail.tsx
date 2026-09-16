"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, type Lead, type LeadGroup, type LeadList } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LeadListFormDialog } from "@/components/lead-lists/lead-list-form-dialog";
import { LeadEditDialog } from "@/components/lead-lists/lead-edit-dialog";

const PAGE_SIZE = 10;

export function LeadListDetail({ listId }: { listId: number }) {
  const router = useRouter();
  const [list, setList] = useState<LeadGroup | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [members, setMembers] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [adding, setAdding] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [candidateLeads, setCandidateLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [candidatesLoading, setCandidatesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: LeadGroup }>(`/api/lead-lists/${listId}`).then(({ ok, data, error }) => {
      if (cancelled) return;
      setListLoading(false);
      if (ok && data) {
        setList(data.data);
        setListError(null);
      } else {
        setListError(error ?? "Failed to load lead list");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listId]);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());

    apiFetch<LeadList>(`/api/lead-lists/${listId}/members?${params}`).then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setMembers(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError(null);
      } else {
        setError(error ?? "Failed to load members");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [listId, page, search, reload]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(timer);
  }, [search]);

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
      `/api/lead-lists/${listId}/members`,
      { method: "POST", body: JSON.stringify({ lead_ids: [...selected] }) }
    );
    if (data) {
      setList(data.data);
      setSelected(new Set());
      toast.success(`Added ${data.added} lead${data.added === 1 ? "" : "s"}`);
      setPage(1);
      setReload((value) => value + 1);
    } else {
      toast.error(error ?? "Failed to add leads");
    }
  }

  async function handleRemoveMember(leadId: number, email: string) {
    const { ok, data, error } = await apiFetch<{ data: LeadGroup }>(
      `/api/lead-lists/${listId}/members/${leadId}`,
      { method: "DELETE" }
    );
    if (ok && data) {
      setList(data.data);
      setMembers((prev) => prev.filter((lead) => lead.id !== leadId));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success(`Removed ${email}`);
    } else {
      toast.error(error ?? "Failed to remove lead");
    }
  }

  async function handleDelete() {
    if (!list) return;
    setDeleting(true);
    const { ok, error } = await apiFetch(`/api/lead-lists/${list.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteOpen(false);
    if (ok) {
      toast.success(`Deleted “${list.name}”`);
      router.push("/lead-lists");
    } else {
      toast.error(error ?? "Failed to delete lead list");
    }
  }

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <Link
        href="/lead-lists"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to lead lists
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {listLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : listError ? (
            <p role="alert" className="text-sm text-destructive">
              {listError}
            </p>
          ) : list ? (
            <>
              <div className="flex items-center gap-3">
                <h1 className="truncate text-3xl font-bold tracking-tight">{list.name}</h1>
                <Badge variant="secondary">
                  <Users className="mr-1 size-3.5" />
                  {list.lead_count}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                Created {new Date(list.created_at).toLocaleDateString()}
              </p>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setRenameOpen(true)} disabled={!list}>
            <Pencil />
            Rename
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={!list}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex grow flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative grow sm:max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8"
              />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => setAdding((value) => !value)}>
            <Plus />
            {adding ? "Hide add panel" : "Add leads"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

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
                        <span className="truncate">{lead.email}</span>
                        <span className="ml-auto max-w-[40%] truncate text-xs text-muted-foreground">
                          {lead.subject || "—"}
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

          <div className="overflow-hidden rounded-lg border">
            {loading ? (
              <div className="grid gap-2 p-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search
                  ? "No members match your search."
                  : "No leads in this list yet. Click “Add leads” to include some."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.email}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.company || "—"}</TableCell>
                      <TableCell>{lead.subject || "—"}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {lead.message || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${lead.email}`}
                            onClick={() => setEditingLead(lead)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${lead.email}`}
                            onClick={() => handleRemoveMember(lead.id, lead.email)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
        <span>
          {total > 0 ? `Showing ${startIndex}–${endIndex} of ${total}` : "0 leads"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <LeadListFormDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        list={list}
        onSaved={(updated) => {
          setList(updated);
          toast.success(`Updated “${updated.name}”`);
        }}
      />

      <LeadEditDialog
        key={editingLead?.id ?? "none"}
        open={editingLead !== null}
        onOpenChange={(open) => {
          if (!open) setEditingLead(null);
        }}
        lead={editingLead}
        onSaved={(updated) => {
          setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          toast.success(`Updated ${updated.email}`);
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{list?.name}</span> and the
              leads that belong only to this list. Leads used by other lists are kept.
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
    </div>
  );
}