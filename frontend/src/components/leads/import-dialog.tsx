"use client";

import { useState } from "react";
import { apiUpload, type ImportPreview, type ImportSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LeadListPicker,
  type LeadListPickerValue,
} from "@/components/lead-lists/lead-list-picker";

const IMPORT_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "email", label: "Email", required: true },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "company", label: "Company" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
];

type Step = "pick" | "map" | "done";

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (summary: ImportSummary) => void;
};

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<LeadListPickerValue>({ listId: null, newListName: null });

  function reset() {
    setStep("pick");
    setFile(null);
    setPreview(null);
    setMapping({});
    setSummary(null);
    setError(null);
    setSlot({ listId: null, newListName: null });
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function handlePreview() {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setError(null);
    setLoading(true);
    const { ok, data, error } = await apiUpload<ImportPreview>("/api/leads/import/preview", file);
    setLoading(false);
    if (ok && data) {
      setPreview(data);
      setMapping(data.suggestedMapping);
      setStep("map");
    } else {
      setError(error ?? "Could not parse the CSV file");
    }
  }

  async function handleImport() {
    if (!file || !preview) return;
    setError(null);
    setLoading(true);
    const fields: Record<string, string> = {
      mapping: JSON.stringify(mapping),
    };
    if (slot.listId) fields.list_id = String(slot.listId);
    if (slot.newListName) fields.list_name = slot.newListName;
    const { ok, data, error } = await apiUpload<{ summary: ImportSummary }>("/api/leads/import", file, fields);
    setLoading(false);
    if (ok && data) {
      setSummary(data.summary);
      onImportComplete(data.summary);
      setStep("done");
    } else {
      setError(error ?? "Import failed");
    }
  }

  const emailMapped = Boolean(mapping.email);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV, map its columns, then review the import summary.
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="button" onClick={handlePreview} disabled={!file || loading}>
                {loading ? "Parsing…" : "Preview & map columns"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "map" && preview && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {preview.rowCount} row{preview.rowCount === 1 ? "" : "s"} detected
              </span>
              <Badge variant="secondary">{file?.name}</Badge>
            </div>
            <LeadListPicker onChange={setSlot} disabled={loading} />
            <div className="grid gap-3">
              {IMPORT_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-[110px_1fr] items-center gap-3">
                  <Label htmlFor={`map-${field.key}`} className="text-sm">
                    {field.label}
                    {field.required ? (
                      <span className="ml-0.5 text-destructive">*</span>
                    ) : null}
                  </Label>
                  <Select
                    value={mapping[field.key] ?? ""}
                    onValueChange={(value) =>
                      setMapping((prev) => ({ ...prev, [field.key]: value || null }))
                    }
                  >
                    <SelectTrigger id={`map-${field.key}`} className="w-full">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not mapped</SelectItem>
                      {preview.columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {preview.sample.length > 0 ? (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Sample rows</p>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {preview.columns.map((column) => (
                          <th key={column} className="px-2 py-1 text-left font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample.map((row, index) => (
                        <tr key={index} className="border-b last:border-0">
                          {preview.columns.map((column) => (
                            <td key={column} className="px-2 py-1">
                              {row[column] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("pick")} disabled={loading}>
                Back
              </Button>
              <Button type="button" onClick={handleImport} disabled={!emailMapped || loading}>
                {loading ? "Importing…" : "Import leads"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && summary && (
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{summary.totalRows}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-emerald-600">{summary.imported}</div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-amber-600">{summary.duplicates}</div>
                <div className="text-xs text-muted-foreground">Duplicates</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-destructive">{summary.invalid}</div>
                <div className="text-xs text-muted-foreground">Invalid</div>
              </div>
            </div>
            {summary.slotName ? (
              <div className="rounded-lg border p-3 text-sm">
                All imported leads added to slot{" "}
                <span className="font-medium">{summary.slotName}</span>.
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}