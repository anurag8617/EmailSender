"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, type LeadGroup, type LeadGroupList } from "@/lib/api";
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
import { LeadListFormDialog } from "@/components/lead-lists/lead-list-form-dialog";
import { LeadListMembersDialog } from "@/components/lead-lists/lead-list-members-dialog";

const PAGE_SIZE = 10;

export function LeadListsTable() {
  const [lists, setLists] = useState<LeadGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadGroup | null>(null);
  const [viewing, setViewing] = useState<LeadGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());

    apiFetch<LeadGroupList>(`/api/lead-lists?${params}`).then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setLists(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError(null);
      } else {
        setError(error ?? "Failed to load lead lists");
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
    const { ok, error } = await apiFetch(`/api/lead-lists/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) {
      toast.success(`Deleted “${deleteTarget.name}”`);
      if (lists.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setReload((value) => value + 1);
      }
    } else {
      setError(error ?? "Failed to delete lead list");
    }
  }

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Lead lists</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search lists…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              Create list
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
          ) : lists.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search
                ? "No lead lists match your search."
                : "No lead lists yet. Create one to group leads for a campaign."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{list.lead_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(list.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View leads in ${list.name}`}
                          onClick={() => setViewing(list)}
                        >
                          <Users />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${list.name}`}
                          onClick={() => {
                            setEditing(list);
                            setFormOpen(true);
                          }}
                        >
                          <span className="text-sm">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${list.name}`}
                          onClick={() => setDeleteTarget(list)}
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
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
        <span>
          {total > 0 ? `Showing ${startIndex}–${endIndex} of ${total}` : "0 lead lists"}
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
        open={formOpen}
        onOpenChange={setFormOpen}
        list={editing}
        onSaved={(list) => {
          setReload((value) => value + 1);
          toast.success(editing ? `Updated “${list.name}”` : `Created “${list.name}”`);
        }}
      />

      <LeadListMembersDialog
        list={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onChanged={(list) => {
          setViewing(list);
          setReload((value) => value + 1);
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{deleteTarget?.name}</span>. The
              leads themselves are not deleted.
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