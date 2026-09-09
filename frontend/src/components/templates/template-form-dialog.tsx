"use client";

import { useState } from "react";
import { apiFetch, type Template } from "@/lib/api";
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
import { TemplatePreviewDialog } from "@/components/templates/template-preview-dialog";

type TemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSaved: (template: Template) => void;
};

type FormState = { name: string; subject: string; body: string };

const SUPPORTED = [
  "first_name",
  "last_name",
  "company",
  "email",
  "website",
  "sender_name",
];

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: TemplateFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => ({
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [insertVar, setInsertVar] = useState(SUPPORTED[0]);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function insertVariable() {
    setForm((prev) => ({ ...prev, body: `${prev.body}{{${insertVar}}}` }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = template
      ? await apiFetch<{ data: Template }>(`/api/templates/${template.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        })
      : await apiFetch<{ data: Template }>("/api/templates", {
          method: "POST",
          body: JSON.stringify(form),
        });

    setLoading(false);
    if (result.ok && result.data) {
      onSaved(result.data.data);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to save template");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{template ? "Edit template" : "Create template"}</DialogTitle>
            <DialogDescription>
              Personalize with variables like {"{{first_name}}"}, {"{{company}}"}, {"{{sender_name}}"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="template-name" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Name
              </Label>
              <Input
                id="template-name"
                required
                maxLength={255}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Cold outreach intro"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-subject" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Subject
              </Label>
              <Input
                id="template-subject"
                required
                maxLength={255}
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Quick question for {{first_name}}"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-insert-variable">Insert variable</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Pick a variable and append it to the bottom of your body, then replace the placeholder
                in place if needed.
              </p>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Input
                  id="template-insert-variable"
                  list="template-variables"
                  value={insertVar}
                  onChange={(e) => setInsertVar(e.target.value)}
                />
                <datalist id="template-variables">
                  {SUPPORTED.map((variable) => (
                    <option key={variable} value={variable}>
                      {`{{${variable}}}`}
                    </option>
                  ))}
                </datalist>
                <Button type="button" variant="outline" onClick={insertVariable}>
                  Insert
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-body" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Body
              </Label>
              <Textarea
                id="template-body"
                required
                rows={10}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Hi {{first_name}},\n\nI noticed {{company}}…"}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={!form.subject.trim() || !form.body.trim()}
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : template ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={form.name || "Draft"}
        subject={form.subject}
        body={form.body}
      />
    </>
  );
}