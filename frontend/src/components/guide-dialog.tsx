"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { guideSteps } from "@/components/how-it-works";

const GUIDE_KEY = "email-tool:guide-seen-v1";

export function GuideDialog() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem(GUIDE_KEY);
    } catch {
      return false;
    }
  });

  function finish() {
    setOpen(false);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : finish())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            Welcome — here&apos;s how it works
          </DialogTitle>
          <DialogDescription>
            Five quick steps to your first successful campaign. This guide will only show once.
          </DialogDescription>
        </DialogHeader>

        <ol className="grid gap-3">
          {guideSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="animate-fade-up flex items-start gap-3"
                style={{ animationDelay: `${200 + index * 120}ms` }}
              >
                <div className="relative shrink-0 pt-0.5">
                  <div className="animate-glow absolute inset-0 rounded-lg bg-emerald-500/20" />
                  <div className="relative flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  {index < guideSteps.length - 1 ? (
                    <span className="absolute top-10 bottom-[-12px] left-1/2 w-px -translate-x-1/2 bg-border" />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 align-middle text-[11px] font-bold text-emerald-600">
                      {index + 1}
                    </span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <DialogFooter className="sm:justify-end">
          <Button type="button" onClick={finish} className="w-full sm:w-auto">
            Get started
            <ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}