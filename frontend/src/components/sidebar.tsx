"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  ListOrdered,
  Mail,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/lead-lists", label: "Lead Lists", icon: ListOrdered },
  { href: "/email-accounts", label: "Email Accounts", icon: Mail },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r bg-background md:w-64">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 md:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt="MailSender Logo"
            width={1345}
            height={1170}
            priority
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="hidden text-base font-bold tracking-tight md:inline">
            MailSender
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors md:justify-start",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={link.label}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 border-t p-2 md:items-stretch">
        <LogoutButton compact />
      </div>
    </aside>
  );
}
