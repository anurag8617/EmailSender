import Link from "next/link";
import { cookies } from "next/headers";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/lead-lists", label: "Lead Lists" },
  { href: "/email-accounts", label: "Email Accounts" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
];

export async function SiteNav() {
  const isAuthed = Boolean((await cookies()).get("token"));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="MaleSender" width={1345} height={1170} className="h-7 w-auto" priority />
          <span>MaleSender</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthed ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}