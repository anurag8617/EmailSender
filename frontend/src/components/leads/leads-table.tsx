"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, Plus, Upload } from "lucide-react";
import {
  apiFetch,
  type ImportSummary,
  type Lead,
  type LeadList,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { ImportDialog } from "@/components/leads/import-dialog";

const PAGE_SIZE = 10;

export function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());

    apiFetch<LeadList>(`/api/leads?${params}`).then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setLeads(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError(null);
      } else {
        setError(error ?? "Failed to load leads");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [page, search, reload]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { ok, error } = await apiFetch(`/api/leads/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) {
      setNotice(`Deleted ${deleteTarget.email}`);
      if (leads.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setReload((value) => value + 1);
      }
    } else {
      setError(error ?? "Failed to delete lead");
    }
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Leads</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search leads…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              Import CSV
            </Button>
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus />
              Add lead
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No leads match your search." : "No leads yet. Import a CSV or add a lead."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{lead.company || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                    <TableCell>{lead.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={lead.status === "new" ? "secondary" : "outline"}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${lead.email}`}
                        onClick={() => setDeleteTarget(lead)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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

      {notice ? (
        <p className="text-sm text-emerald-600">{notice}</p>
      ) : null}

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(lead) => {
          setReload((value) => value + 1);
          setNotice(`Added ${lead.email}`);
        }}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={(summary: ImportSummary) => {
          setReload((value) => value + 1);
          setNotice(
            `Import complete: ${summary.imported} added, ${summary.duplicates} duplicates, ${summary.invalid} invalid`
          );
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{deleteTarget?.email}</span> and
              its campaign links.
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