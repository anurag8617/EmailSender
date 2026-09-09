"use client";

import { Mail } from "lucide-react";

export function SendingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-live="polite">
      <span className="relative flex size-2">
        <span className="animate-pulse-ring absolute inline-flex size-2 rounded-full bg-emerald-500" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <Mail className="animate-mail-float size-3.5 text-emerald-600" />
      <span className="text-xs font-medium text-emerald-600">
        Sending
        <span className="animate-send-dot">.</span>
        <span className="animate-send-dot [animation-delay:150ms]">.</span>
        <span className="animate-send-dot [animation-delay:300ms]">.</span>
      </span>
    </span>
  );
}