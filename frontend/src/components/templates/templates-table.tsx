"use client";

import { useEffect, useState } from "react";
import { Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, type Template } from "@/lib/api";
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
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";
import { TemplatePreviewDialog } from "@/components/templates/template-preview-dialog";

const VARIABLE_RE = /\{\{\s*([\w_.-]+)\s*\}\}/g;

function usedVariables(subject: string, body: string): string[] {
  const source = `${subject}\n${body}`;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  VARIABLE_RE.lastIndex = 0;
  while ((match = VARIABLE_RE.exec(source)) !== null) {
    vars.add(match[1]);
  }
  return [...vars];
}

export function TemplatesTable() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: Template[] }>("/api/templates").then(({ ok, data, error }) => {
      if (cancelled) return;
      setLoading(false);
      if (ok && data) {
        setTemplates(data.data);
        setError(null);
      } else {
        setError(error ?? "Failed to load templates");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  function openForm(template: Template | null) {
    setEditing(template);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { ok, error } = await apiFetch(`/api/templates/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) {
      toast.success(`Deleted template "${deleteTarget.name}"`);
      setReload((value) => value + 1);
    } else {
      setError(error ?? "Failed to delete template");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Templates</CardTitle>
          <Button type="button" onClick={() => openForm(null)}>
            <Plus />
            Create template
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
          ) : templates.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No templates yet. Create your first email template with variables.
              </p>
              <Button type="button" className="mt-4" onClick={() => openForm(null)}>
                <Plus />
                Create template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const variables = usedVariables(template.subject, template.body);
                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">
                        {template.subject}
                      </TableCell>
                      <TableCell>
                        {variables.length === 0 ? (
                          <Badge variant="outline">none</Badge>
                        ) : (
                          <div className="flex max-w-56 flex-wrap gap-1">
                            {variables.slice(0, 3).map((variable) => (
                              <Badge key={variable} variant="secondary">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                            {variables.length > 3 ? (
                              <Badge variant="outline">+{variables.length - 3}</Badge>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(template.updated_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewing(template)}
                          >
                            <Eye />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${template.name}`}
                            onClick={() => openForm(template)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${template.name}`}
                            onClick={() => setDeleteTarget(template)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TemplateFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        onSaved={(template) => {
          setReload((value) => value + 1);
          toast.success(
            editing ? `Template updated: ${template.name}` : `Template created: ${template.name}`
          );
        }}
      />

      <TemplatePreviewDialog
        open={previewing !== null}
        onOpenChange={(open) => !open && setPreviewing(null)}
        title={previewing?.name ?? ""}
        subject={previewing?.subject ?? ""}
        body={previewing?.body ?? ""}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <span className="font-medium">{deleteTarget?.name}</span> will be permanently
              removed.
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