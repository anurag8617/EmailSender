"use client";

import { useState } from "react";
import { apiFetch, type LeadGroup } from "@/lib/api";
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

type LeadListFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: LeadGroup | null;
  onSaved: (list: LeadGroup) => void;
};

export function LeadListFormDialog({
  open,
  onOpenChange,
  list,
  onSaved,
}: LeadListFormDialogProps) {
  const [name, setName] = useState(list?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = list
      ? await apiFetch<{ data: LeadGroup }>(`/api/lead-lists/${list.id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        })
      : await apiFetch<{ data: LeadGroup }>("/api/lead-lists", {
          method: "POST",
          body: JSON.stringify({ name }),
        });

    setLoading(false);
    if (result.ok && result.data) {
      onSaved(result.data.data);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to save lead list");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{list ? "Edit lead list" : "Create lead list"}</DialogTitle>
          <DialogDescription>
            A lead list is a reusable group of leads. You can pick a whole list when creating a campaign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-list-name" className="after:ml-0.5 after:text-destructive after:content-['*']">
              List name
            </Label>
            <Input
              id="lead-list-name"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="H2 SEO prospects"
            />
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : list ? "Save changes" : "Create list"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}