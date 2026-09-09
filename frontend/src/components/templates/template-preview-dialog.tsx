"use client";

import { useEffect, useState } from "react";
import { apiFetch, type TemplateRender } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplatePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  body: string;
  title: string;
};

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  subject,
  body,
  title,
}: TemplatePreviewDialogProps) {
  const [render, setRender] = useState<TemplateRender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiFetch<{ data: TemplateRender }>("/api/templates/render", {
      method: "POST",
      body: JSON.stringify({ subject, body }),
    }).then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setRender(data.data);
        setError(null);
      } else {
        setError(error ?? "Failed to render template");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, subject, body]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview — {title}</DialogTitle>
          <DialogDescription>
            Rendered with sample values. Unknown variables are left untouched and flagged below.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Rendering…</p>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : render ? (
          <div className="grid gap-4">
            <div className="grid gap-3 overflow-y-auto rounded-lg border bg-muted/40 p-4 max-h-72">
              <div>
                <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Subject
                </p>
                <p className="text-sm font-medium">{render.subject}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Body
                </p>
                <pre className="font-sans text-sm whitespace-pre-wrap">{render.body}</pre>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Variables:</span>
              {render.variables.length === 0 ? (
                <Badge variant="outline">none</Badge>
              ) : (
                render.variables.map((variable) => (
                  <Badge key={variable} variant="secondary">
                    {`{{${variable}}}`}
                  </Badge>
                ))
              )}
            </div>
            {render.unknown.length > 0 ? (
              <p className="text-sm text-destructive">
                Unknown variables (won’t be filled):{" "}
                {render.unknown.map((variable) => `{{${variable}}}`).join(", ")}
              </p>
            ) : (
              <p className="text-sm text-emerald-600">All variables are recognized.</p>
            )}
            {render.missing.length > 0 ? (
              <p className="text-sm text-amber-600">
                Missing values: {render.missing.map((variable) => `{{${variable}}}`).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}