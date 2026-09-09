import Link from "next/link";
import { Users, Mail, Megaphone, FileText, LayoutDashboard, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteNav } from "@/components/site-nav";
import { HowItWorks } from "@/components/how-it-works";

const stats = [
  { label: "Total Leads", value: "0" },
  { label: "Active Campaigns", value: "0" },
  { label: "Emails Sent", value: "0" },
  { label: "Emails Failed", value: "0" },
  { label: "Bounces", value: "0" },
  { label: "Unsubscribes", value: "0" },
];

const sections = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Campaign progress and sending statistics",
    icon: LayoutDashboard,
  },
  {
    href: "/leads",
    label: "Leads",
    description: "CSV import, lists, and lead management",
    icon: Users,
  },
  {
    href: "/email-accounts",
    label: "Email Accounts",
    description: "Authorized senders and sending limits",
    icon: Mail,
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    description: "Scheduled outreach campaigns",
    icon: Megaphone,
  },
  {
    href: "/templates",
    label: "Templates",
    description: "Email templates with variables",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Application and suppression settings",
    icon: Settings,
  },
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <HowItWorks />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link key={section.href} href={section.href} className="focus-visible:outline-none">
              <Card className="h-full transition-colors hover:border-muted-foreground/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <section.icon className="size-5 text-muted-foreground" />
                    <CardTitle className="text-base">{section.label}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}