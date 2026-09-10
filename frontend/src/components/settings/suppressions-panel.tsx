"use client";

import { useEffect, useState } from "react";
import { Ban, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  apiFetch,
  type Suppression,
  type SuppressionList,
  type SuppressionReason,
} from "@/lib/api";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const REASON_LABELS: Record<SuppressionReason, string> = {
  MANUALLY_BLOCKED: "Block list",
  UNSUBSCRIBED: "Unsubscribed",
  BOUNCED: "Bounced",
  COMPLAINT: "Complaint",
};

const REASON_VARIANTS: Record<SuppressionReason, "default" | "secondary" | "outline" | "destructive"> = {
  MANUALLY_BLOCKED: "destructive",
  UNSUBSCRIBED: "secondary",
  BOUNCED: "outline",
  COMPLAINT: "default",
};

export function SuppressionsPanel() {
  const [rows, setRows] = useState<Suppression[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<SuppressionReason>("MANUALLY_BLOCKED");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Suppression | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (reasonFilter !== "ALL") params.set("reason", reasonFilter);

    apiFetch<SuppressionList>(`/api/suppressions?${params.toString()}`).then(
      ({ ok, data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (ok && data) {
          setRows(data.rows);
          setTotal(data.total);
          setTotalPages(data.totalPages);
          setPage(data.page);
          setError(null);
        } else {
          setError(error ?? "Failed to load suppression list");
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [reload, page, search, reasonFilter]);

  async function handleAdd() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await apiFetch("/api/suppressions", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), reason }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEmail("");
      setPage(1);
      setSearch("");
      setReload((value) => value + 1);
      toast.success(
        `Added ${reason === "MANUALLY_BLOCKED" ? "to the block list" : reason.toLowerCase()}: ${email.trim()}`
      );
    } else {
      toast.error(res.error ?? "Failed to add address");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiFetch(`/api/suppressions/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setDeleteTarget(null);
    if (res.ok) {
      toast.success(`Removed ${deleteTarget.email} from the suppression list`);
      setReload((value) => value + 1);
    } else {
      toast.error(res.error ?? "Failed to remove address");
    }
  }

  const blockedCount = rows.filter((row) => row.reason === "MANUALLY_BLOCKED").length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suppressed addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manually blocked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{blockedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unsubscribed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {rows.filter((row) => row.reason === "UNSUBSCRIBED").length}
              <span className="text-sm font-normal text-muted-foreground"> shown</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suppression list</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              handleAdd();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="suppression-email">Email address</Label>
              <Input
                id="suppression-email"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="no-send@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="suppression-reason">Reason</Label>
              <Select value={reason} onValueChange={(value) => setReason(value as SuppressionReason)}>
                <SelectTrigger id="suppression-reason" className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting || !email.trim()}>
                <Plus />
                {submitting ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search addresses…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={reasonFilter} onValueChange={(value) => {
              setReasonFilter(value ?? "ALL");
              setPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All reasons</SelectItem>
                {Object.entries(REASON_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <Ban className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No suppressed addresses{search ? " matching your search" : ""}. Sending is checked
                against this list before every email.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((suppression) => (
                  <TableRow key={suppression.id}>
                    <TableCell className="font-medium">{suppression.email}</TableCell>
                    <TableCell>
                      <Badge variant={REASON_VARIANTS[suppression.reason]}>
                        {REASON_LABELS[suppression.reason]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {suppression.source ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(suppression.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${suppression.email}`}
                          onClick={() => setDeleteTarget(suppression)}
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

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} suppressed {total === 1 ? "address" : "addresses"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from suppression list?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.email}</span> will no longer be blocked,
              and the worker will be allowed to send to it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}