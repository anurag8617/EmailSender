"use client";

import { Activity, FileText, Mail, Megaphone, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const guideSteps = [
  {
    icon: Mail,
    title: "Connect a sender",
    description: "Add a Gmail/Outlook account with an app password, set daily limits, and verify it can send.",
  },
  {
    icon: Users,
    title: "Import your leads",
    description: "Add contacts one by one or import a CSV. Delivery variables are filled per lead.",
  },
  {
    icon: FileText,
    title: "Write a template",
    description: "Create one reusable email with placeholders like {{first_name}}, {{company}}, or {{website}}.",
  },
  {
    icon: Megaphone,
    title: "Launch a campaign",
    description: "Pick your leads and senders, choose a schedule and sending limits, then hit Start.",
  },
  {
    icon: Activity,
    title: "Track everything",
    description: "Watch progress, sent, failed, bounced, and unsubscribed counts update in real time.",
  },
];

export function HowItWorks({ className }: { className?: string }) {
  return (
    <section className={cn("grid gap-4", className)}>
      <div className="animate-fade-up">
        <h2 className="text-lg font-semibold tracking-tight">How this tool works</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          From adding a sender account to watching results roll in — here&apos;s the whole flow.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guideSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.title}
              className="animate-fade-up group relative overflow-hidden"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="relative shrink-0">
                  <div className="animate-glow absolute inset-0 -z-10 rounded-lg bg-emerald-500/20" />
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-emerald-500/70 transition-transform duration-500 group-hover:scale-x-100" />
            </Card>
          );
        })}
      </div>
    </section>
  );
}