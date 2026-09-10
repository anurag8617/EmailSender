"use client";

import { useEffect, useState } from "react";
import { apiFetch, type LeadGroup, type LeadGroupList } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const NO_SLOT = "__none__";
export const CREATE_NEW = "__create__";

export type LeadListPickerValue = {
  listId: number | null;
  newListName: string | null;
};

type LeadListPickerProps = {
  onChange: (value: LeadListPickerValue) => void;
  disabled?: boolean;
};

export function LeadListPicker({ onChange, disabled }: LeadListPickerProps) {
  const [lists, setLists] = useState<LeadGroup[]>([]);
  const [selection, setSelection] = useState<string>(NO_SLOT);
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<LeadGroupList>("/api/lead-lists?page=1&pageSize=100").then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data) setLists(data.rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelect(value: string | null) {
    const next = value ?? NO_SLOT;
    setSelection(next);
    if (next === NO_SLOT || next === CREATE_NEW) {
      onChange({ listId: null, newListName: null });
    } else {
      onChange({ listId: Number(next), newListName: null });
    }
  }

  function handleNameChange(name: string) {
    setNewListName(name);
    if (selection === CREATE_NEW) {
      onChange({ listId: null, newListName: name.trim() || null });
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Add to slot</Label>
      <Select value={selection} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No slot (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SLOT}>No slot (optional)</SelectItem>
          {lists.length > 0
            ? lists.map((list) => (
                <SelectItem key={list.id} value={String(list.id)}>
                  {list.name} ({list.lead_count})
                </SelectItem>
              ))
            : null}
          <SelectItem value={CREATE_NEW}>Create new slot…</SelectItem>
        </SelectContent>
      </Select>
      {selection === CREATE_NEW ? (
        <div className="grid gap-2">
          <Label htmlFor="new-slot-name" className="text-xs text-muted-foreground">
            New slot name
          </Label>
          <Input
            id="new-slot-name"
            placeholder="e.g. H2 SEO prospects"
            value={newListName}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}