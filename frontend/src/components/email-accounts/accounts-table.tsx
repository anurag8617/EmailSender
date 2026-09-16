"use client";

import { useEffect, useState } from "react";
import { PlugZap, Plus, Power, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, type EmailAccount } from "@/lib/api";
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
import { AccountFormDialog } from "@/components/email-accounts/account-form-dialog";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export function AccountsTable() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  useRealtimeRefresh(() => setReload((value) => value + 1));

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: EmailAccount[] }>("/api/email-accounts").then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setAccounts(data.data);
        setError(null);
      } else {
        setError(error ?? "Failed to load email accounts");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleTest(account: EmailAccount) {
    setTestingId(account.id);
    setError(null);
    const { ok, error } = await apiFetch(`/api/email-accounts/${account.id}/test`, {
      method: "POST",
    });
    setTestingId(null);
    if (ok) {
      toast.success(`Connection test passed for ${account.email}`);
    } else {
      toast.error(`${account.email}: ${error ?? "Connection test failed"}`);
      setReload((value) => value + 1);
    }
  }

  async function handleToggleStatus(account: EmailAccount) {
    const action = account.status === "active" ? "disable" : "enable";
    const { ok, error } = await apiFetch(`/api/email-accounts/${account.id}/${action}`, {
      method: "POST",
    });
    if (ok) {
      setReload((value) => value + 1);
      toast.success(
        action === "disable" ? "Account paused — no emails will be sent." : "Account re-enabled."
      );
    } else {
      setError(error ?? "Failed to update account status");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { ok, error } = await apiFetch(`/api/email-accounts/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) {
      toast.success(`Deleted ${deleteTarget.email}`);
      setReload((value) => value + 1);
    } else {
      setError(error ?? "Failed to delete account");
    }
  }

  function openForm(account: EmailAccount | null) {
    setEditing(account);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  }

  const activeCount = accounts.filter((account) => account.status === "active").length;
  const sentToday = accounts.reduce((sum, account) => sum + account.sent_today, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Email accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{accounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{sentToday}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Connected accounts</CardTitle>
          <Button
            type="button"
            onClick={() => openForm(null)}
          >
            <Plus />
            Add email account
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
          ) : accounts.length === 0 ? (
            <div className="py-10 text-center">
              <PlugZap className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No email accounts yet. Connect your first SMTP account to start sending.
              </p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => openForm(null)}
              >
                <Plus />
                Add email account
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daily limit</TableHead>
                  <TableHead>Hourly limit</TableHead>
                  <TableHead>Sent today</TableHead>
                  <TableHead>Last sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium">{account.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {account.server.host}:{account.server.port}
                        {account.server.secure ? " (TLS)" : " (plain)"} · {account.server.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "outline"}>
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{account.daily_limit}</TableCell>
                    <TableCell className="tabular-nums">{account.hourly_limit}</TableCell>
                    <TableCell className="tabular-nums">
                      {account.sent_today}
                      {account.daily_limit > 0 ? ` / ${account.daily_limit}` : ""}
                    </TableCell>
                    <TableCell>{account.last_sent_at ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingId === account.id}
                          onClick={() => handleTest(account)}
                        >
                          {testingId === account.id ? "Testing…" : "Test"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(account)}
                        >
                          {account.status === "active" ? (
                            <>
                              <Power />
                              Pause
                            </>
                          ) : (
                            <>
                              <Power />
                              Enable
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${account.email}`}
                          onClick={() => openForm(account)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${account.email}`}
                          onClick={() => setDeleteTarget(account)}
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

      <AccountFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        onSaved={(account) => {
          setReload((value) => value + 1);
          toast.success(
            editing ? `Account updated: ${account.email}` : `Account added: ${account.email}`
          );
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email account?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.email}</span> will be removed, and its
              sending history will be kept but unlinked.
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
