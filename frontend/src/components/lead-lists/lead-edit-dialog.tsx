"use client";

import { useState } from "react";
import { apiFetch, type Lead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LeadEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSaved: (lead: Lead) => void;
};

export function LeadEditDialog({ open, onOpenChange, lead, onSaved }: LeadEditDialogProps) {
  const [email, setEmail] = useState(lead?.email ?? "");
  const [subject, setSubject] = useState(lead?.subject ?? "");
  const [message, setMessage] = useState(lead?.message ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!lead) return;
    setError(null);
    setLoading(true);

    const result = await apiFetch<{ data: Lead }>(`/api/leads/${lead.id}`, {
      method: "PUT",
      body: JSON.stringify({ email, subject, message }),
    });

    setLoading(false);
    if (result.ok && result.data) {
      onSaved(result.data.data);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to update lead");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          {lead ? (
            <DialogDescription>
              Update the details for <span className="font-medium text-foreground">{lead.email}</span>.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-edit-email">Email</Label>
            <Input
              id="lead-edit-email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-edit-subject">Subject</Label>
            <Input
              id="lead-edit-subject"
              maxLength={255}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-edit-message">Message</Label>
            <Textarea
              id="lead-edit-message"
              maxLength={5000}
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message body"
              className="min-h-40"
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
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}