import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  FileText,
  Mail,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { HowItWorks } from "@/components/how-it-works";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Email Outreach Tool",
  description:
    "Self-hosted email outreach tool — import leads, add sender accounts, and run automated cold-email campaigns from your own infrastructure.",
};

const features = [
  {
    icon: Users,
    title: "Leads & slots",
    description:
      "Import leads via CSV or add them manually, then organize every lead into named slots for targeting.",
  },
  {
    icon: Mail,
    title: "Sender accounts",
    description:
      "Connect Gmail or Outlook senders with app passwords, set daily and hourly limits, and spread safely.",
  },
  {
    icon: FileText,
    title: "Templates",
    description:
      "Write one email with variables like {{first_name}} and {{company}}, filled automatically per lead.",
  },
  {
    icon: Megaphone,
    title: "Campaigns",
    description:
      "Pick leads from any slot, choose senders, schedule sends, and hit start. Pause or cancel any time.",
  },
  {
    icon: ShieldCheck,
    title: "Protections",
    description:
      "Built-in suppressions for unsubscribes, bounces, and complaints keep your sender reputation healthy.",
  },
  {
    icon: Activity,
    title: "Live tracking",
    description:
      "Sent, failed, bounced, and unsubscribed counts update in real time as your campaign runs.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Mail className="size-5" />
            <span>Email Outreach Tool</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {["features", "how-it-works"].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                {id === "features" ? "Features" : "How it works"}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Log in
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pt-16 pb-12 text-center">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Self-hosted cold-email automation
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Send outreach campaigns from your own accounts
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Import leads, connect your Gmail or Outlook senders, and run scheduled
            cold-email campaigns with templates, sending limits, and live tracking —
            all on your own infrastructure.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Get started free
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <a
              href="#features"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Explore features
            </a>
          </div>

          <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Mail, value: "Unlimited", label: "senders" },
              { icon: Users, value: "Unlimited", label: "leads & slots" },
              { icon: Megaphone, value: "Unlimited", label: "campaigns" },
              { icon: TrendingUp, value: "Real-time", label: "tracking" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 rounded-lg border p-4">
                <stat.icon className="size-5 text-primary" />
                <span className="text-sm font-semibold">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="border-t bg-muted/30 py-12">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Everything you need to run outreach
              </h2>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                A complete workflow from leads to inboxes, designed to be simple and self-hosted.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="h-full">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-5" />
                    </div>
                    <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-12">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4">
            <HowItWorks />
          </div>
        </section>

        <section className="border-t bg-muted/30 py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to start sending?
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Connect a sender, build your first slot, and launch a campaign in minutes.
            </p>
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Get started
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Email Outreach Tool — self-hosted.</span>
          <span>Your email accounts. Your data. Your infrastructure.</span>
        </div>
      </footer>
    </>
  );
}