"use client";

import { useState } from "react";
import { apiFetch, type AccountFormValues, type EmailAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProviderPreset = {
  label: string;
  host: string;
  port: string;
  secure: string;
  hint: string;
};

const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com",
    port: "587",
    secure: "false",
    hint: "Enable 2-Step Verification on your Google account, then generate an App Password at myaccount.google.com/apppasswords.",
  },
  outlook: {
    label: "Outlook / Microsoft 365",
    host: "smtp-mail.outlook.com",
    port: "587",
    secure: "false",
    hint: "Use your Microsoft account email and an app password, or your regular password if legacy auth is allowed.",
  },
  custom: {
    label: "Custom SMTP",
    host: "",
    port: "587",
    secure: "true",
    hint: "",
  },
};

type AccountFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: EmailAccount | null;
  onSaved: (account: EmailAccount) => void;
};

const emptyForm: AccountFormValues = {
  email: "",
  host: "",
  port: "587",
  secure: "false",
  username: "",
  password: "",
  daily_limit: "50",
  hourly_limit: "10",
};

export function AccountFormDialog({ open, onOpenChange, account, onSaved }: AccountFormDialogProps) {
  const [form, setForm] = useState<AccountFormValues>(() =>
    account
      ? {
          email: account.email,
          host: account.server.host,
          port: String(account.server.port),
          secure: String(account.server.secure),
          username: account.server.username,
          password: "",
          daily_limit: String(account.daily_limit),
          hourly_limit: String(account.hourly_limit),
        }
      : emptyForm
  );
  const [provider, setProvider] = useState<string>(() =>
    account
      ? account.server.host === "smtp.gmail.com"
        ? "gmail"
        : account.server.host === "smtp-mail.outlook.com"
        ? "outlook"
        : "custom"
      : typeof window !== "undefined"
      ? (localStorage.getItem("email-account-provider") ?? "gmail")
      : "gmail"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const preset = PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.custom;

  function selectProvider(key: string) {
    setProvider(key);
    const preset = PROVIDER_PRESETS[key] ?? PROVIDER_PRESETS.custom;
    localStorage.setItem("email-account-provider", key);
    set("host", preset.host);
    set("port", preset.port);
    set("secure", preset.secure);
    if (key === "gmail" || key === "outlook") {
      set("username", form.email);
    }
  }

  function set(key: keyof AccountFormValues, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const credentials = {
      host: form.host.trim(),
      port: Number(form.port),
      secure: form.secure === "true",
      username: form.username.trim(),
      password: form.password,
    };

    let result;
    if (account) {
      const payload: Record<string, unknown> = {
        email: form.email.trim().toLowerCase(),
        daily_limit: Number(form.daily_limit),
        hourly_limit: Number(form.hourly_limit),
      };
      if (form.password) {
        payload.credentials = credentials;
      }
      result = await apiFetch<{ data: EmailAccount }>(`/api/email-accounts/${account.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      result = await apiFetch<{ data: EmailAccount }>("/api/email-accounts", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          provider: "smtp",
          auth_type: "password",
          daily_limit: Number(form.daily_limit),
          hourly_limit: Number(form.hourly_limit),
          credentials,
        }),
      });
    }

    setLoading(false);
    if (result.ok && result.data) {
      onSaved(result.data.data);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to save account");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? "Edit email account" : "Add email account"}</DialogTitle>
          <DialogDescription>
            Connect an SMTP email account. Credentials are encrypted at rest and never shown again.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-email" className="after:ml-0.5 after:text-destructive after:content-['*']">
              Sending email address
            </Label>
            <Input
              id="account-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => {
                const value = e.target.value;
                set("email", value);
                if (provider === "gmail" || provider === "outlook") {
                  set("username", value);
                }
              }}
              placeholder="sender@yourdomain.com"
            />

          <div className="grid gap-2">
            <Label htmlFor="account-provider">Provider preset</Label>
            <Select value={provider} onValueChange={(value) => selectProvider(value ?? "custom")}>
              <SelectTrigger id="account-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                <SelectItem value="custom">Custom SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="smtp-host" className="after:ml-0.5 after:text-destructive after:content-['*']">
                SMTP host
              </Label>
              <Input
                id="smtp-host"
                required
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-port" className="after:ml-0.5 after:text-destructive after:content-['*']">
                SMTP port
              </Label>
              <Input
                id="smtp-port"
                type="number"
                required
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => set("port", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="smtp-secure">Connection security</Label>
              <Select
                value={form.secure}
                onValueChange={(value) => set("secure", value ?? "true")}
              >
                <SelectTrigger id="smtp-secure" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes — SSL/TLS (startTLS on 587)</SelectItem>
                  <SelectItem value="false">No — plain connection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-username" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Username
              </Label>
              <Input
                id="smtp-username"
                required
                autoComplete="username"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="sender@yourdomain.com"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="smtp-password" className="after:ml-0.5 after:text-destructive after:content-['*']">
              Password / app password
            </Label>
            <Input
              id="smtp-password"
              type="password"
              required={!account}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={account ? "Leave blank to keep current password" : "••••••••"}
            />
            {preset.hint ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {preset.hint}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="daily-limit" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Daily sending limit
              </Label>
              <Input
                id="daily-limit"
                type="number"
                required
                min={1}
                max={100000}
                value={form.daily_limit}
                onChange={(e) => set("daily_limit", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hourly-limit" className="after:ml-0.5 after:text-destructive after:content-['*']">
                Hourly sending limit
              </Label>
              <Input
                id="hourly-limit"
                type="number"
                required
                min={1}
                max={1000}
                value={form.hourly_limit}
                onChange={(e) => set("hourly_limit", e.target.value)}
              />
            </div>
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
              {loading ? "Saving…" : account ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}