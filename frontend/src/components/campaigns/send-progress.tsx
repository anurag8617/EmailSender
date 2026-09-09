"use client";

import { cn } from "@/lib/utils";

type SendProgressProps = {
  progress: number;
  sending?: boolean;
  className?: string;
};

export function SendProgress({ progress, sending = false, className }: SendProgressProps) {
  const width = `${Math.min(100, Math.max(0, progress))}%`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            sending ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width }}
        >
          {sending ? <div className="sending-stripes h-full w-full" /> : null}
        </div>
      </div>
      <span
        className={cn(
          "text-xs tabular-nums text-muted-foreground",
          sending && "font-semibold text-emerald-600"
        )}
      >
        {progress}%
      </span>
    </div>
  );
}