import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { HowItWorks } from "@/components/how-it-works";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "MaleSender",
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

      <main className="flex-1">
       {/* --- HERO SECTION --- */}
        <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1500px] flex-col justify-between">

            {/* TOP EDITORIAL HEADER */}
            <header className="flex items-center justify-between py-2">
              <Link href="/" className="flex items-center gap-2.5 font-semibold transition-opacity hover:opacity-80">
                <Image
                  src="/logo.png"
                  alt="MaleSender Logo"
                  width={1345}
                  height={1170}
                  className="h-7 w-auto object-contain"
                  priority
                />
                <span className="text-base font-bold tracking-tight">MaleSender</span>
              </Link>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full px-5 text-xs font-medium")}
                >
                  Log in
                </Link>
              </div>
            </header>

            {/* MAIN HERO SECTION */}
            <div className="relative flex flex-1 items-center justify-center py-8">

              {/* LEFT SMALL CARD */}
              <div className="absolute left-0 top-[18%]  ">
                <div className="left-0 bottom-[18%] hidden max-w-[190px] lg:block">
                <p className="border-l-2 border-primary/40 pl-3 text-[9px] font-semibold uppercase leading-relaxed tracking-wider text-muted-foreground">
                  Presentations are communication tools that can be used as demonstrations.
                </p>
              </div>
              </div>

              {/* RIGHT SMALL CARD */}
              <div className="absolute right-0 top-[18%]  ">
                <div className=" right-0 bottom-[18%] hidden max-w-[190px] lg:block text-right">
                <p className="border-r-2 border-primary/40 pr-3 text-[9px] font-semibold uppercase leading-relaxed tracking-wider text-muted-foreground">
                  Import leads, connect senders, create campaigns and start sending.
                </p>
              </div>
              </div>

              

              {/* CENTER HERO IMAGE (z-10) */}
              <div className="absolute bottom-0 left-1/2 z-10 w-[250px] -translate-x-1/2 sm:w-[320px] md:w-[380px] lg:w-[440px]">
                <Image
                  src="/hero.png"
                  alt="MaleSender Hero"
                  width={1024}
                  height={1536}
                  priority
                  className="h-auto w-full object-contain drop-shadow-xl"
                />
              </div>

              {/* GIANT FOREGROUND TEXT (z-20 - Overlays on top of Hero Image) */}
              <div className="absolute bottom-[3%] left-1/2 z-20 w-full -translate-x-1/2 overflow-visible text-center pointer-events-none">
                <h1 className="whitespace-nowrap  font-black uppercase leading-[0.72] tracking-[-0.075em] text-foreground text-[20vw] 
                sm:text-[19vw] md:text-[17vw] lg:text-[13vw]">
                  MALESENDER
                </h1>
              </div>

              
            </div>

            {/* MOBILE DESCRIPTION FOOTER */}
            <div className="grid grid-cols-2 gap-6 border-t border-border/40 pt-4 pb-2 md:hidden">
              <div>
                <p className="text-[8px] font-semibold uppercase leading-relaxed text-muted-foreground">
                  Simple email outreach without complicated workflows.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-semibold uppercase leading-relaxed text-muted-foreground">
                  Your email accounts. Your data. Your infrastructure.
                </p>
              </div>
            </div>

          </div>
        </section>
      {/* --- END HERO SECTION --- */}

        {/* ========================================================= */}
{/* SECTION 2 — WHY MALESENDER */}
{/* ========================================================= */}
<section
  id="why-malesender"
  className="flex min-h-screen items-center border-t bg-muted/20 px-4 py-20"
>
  <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">

    <div>
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
        02 / WHY MALESENDER
      </span>

      <h2 className="mt-6 text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
        Outreach
        <br />
        without the
        <br />
        <span className="text-primary">complexity.</span>
      </h2>
    </div>

    <div className="space-y-8">
      <p className="text-xl leading-relaxed text-muted-foreground sm:text-2xl">
        Most email outreach platforms add unnecessary complexity between
        your leads and your inbox.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="border-l-2 border-primary p-5">
          <h3 className="text-lg font-bold">
            Your accounts
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Connect the Gmail or Outlook accounts you already use.
          </p>
        </div>

        <div className="border-l-2 border-primary p-5">
          <h3 className="text-lg font-bold">
            Your infrastructure
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Keep your data and sending workflow under your control.
          </p>
        </div>

        <div className="border-l-2 border-primary p-5">
          <h3 className="text-lg font-bold">
            Simple workflow
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Import leads, create a campaign, select senders and start.
          </p>
        </div>

        <div className="border-l-2 border-primary p-5">
          <h3 className="text-lg font-bold">
            Built to scale
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Organize senders, limits and campaigns from one dashboard.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>


{/* ========================================================= */}
{/* SECTION 3 — FEATURES */}
{/* ========================================================= */}
<section
  id="features"
  className="flex min-h-screen items-center border-t bg-background px-4 py-20"
>
  <div className="mx-auto w-full max-w-6xl">

    <div className="mb-14 max-w-3xl">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
        03 / FEATURES
      </span>

      <h2 className="mt-5 text-5xl font-black tracking-tighter sm:text-6xl">
        Everything you need
        <br />
        to run outreach.
      </h2>

      <p className="mt-5 text-lg text-muted-foreground">
        A complete workflow from leads to inboxes, designed to stay simple,
        flexible and self-hosted.
      </p>
    </div>

    <div className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <Card
          key={feature.title}
          className="rounded-none border-0 bg-background p-4 shadow-none"
        >
          <CardHeader className="p-6">

            <div className="mb-8 flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>

              <span className="text-xs font-bold text-muted-foreground">
                0{index + 1}
              </span>
            </div>

            <CardTitle className="text-2xl font-bold">
              {feature.title}
            </CardTitle>

            <CardDescription className="mt-3 text-base leading-relaxed">
              {feature.description}
            </CardDescription>

          </CardHeader>
        </Card>
      ))}
    </div>
  </div>
</section>


{/* ========================================================= */}
{/* SECTION 4 — HOW IT WORKS */}
{/* ========================================================= */}
<section
  id="how-it-works"
  className="flex min-h-screen items-center border-t bg-muted/20 px-4 py-20"
>
  <div className="mx-auto w-full max-w-6xl">

    <div className="text-center">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
        04 / HOW IT WORKS
      </span>

      <h2 className="mt-5 text-5xl font-black tracking-tighter sm:text-6xl">
        From lead to inbox
        <br />
        in four steps.
      </h2>
    </div>

    <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

      {[
        {
          number: "01",
          title: "Import leads",
          text: "Upload your CSV or add leads manually and organize them into slots.",
        },
        {
          number: "02",
          title: "Connect senders",
          text: "Add your Gmail or Outlook accounts and configure safe sending limits.",
        },
        {
          number: "03",
          title: "Create campaign",
          text: "Choose your leads, senders and email template with personalized variables.",
        },
        {
          number: "04",
          title: "Start sending",
          text: "Launch your campaign and watch sent, failed and bounced messages in real time.",
        },
      ].map((step) => (
        <div
          key={step.number}
          className="border-t-2 border-foreground pt-6"
        >
          <span className="text-sm font-black text-primary">
            {step.number}
          </span>

          <h3 className="mt-8 text-2xl font-bold">
            {step.title}
          </h3>

          <p className="mt-4 leading-relaxed text-muted-foreground">
            {step.text}
          </p>
        </div>
      ))}
    </div>

  </div>
</section>


{/* ========================================================= */}
{/* SECTION 5 — SENDER INFRASTRUCTURE */}
{/* ========================================================= */}
<section
  id="senders"
  className="flex min-h-screen items-center border-t bg-background px-4 py-20"
>
  <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">

    <div className="order-2 lg:order-1">

      <div className="relative mx-auto max-w-md">

        <div className="absolute -inset-6 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative border bg-background p-8 shadow-2xl">

          <div className="flex items-center justify-between border-b pb-5">
            <span className="text-xs font-bold uppercase tracking-widest">
              Sender accounts
            </span>

            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
              ACTIVE
            </span>
          </div>

          <div className="space-y-4 pt-6">

            <div className="flex items-center justify-between border p-4">
              <div>
                <p className="text-sm font-semibold">
                  Gmail
                </p>
                <p className="text-xs text-muted-foreground">
                  sender@example.com
                </p>
              </div>

              <span className="text-xs font-bold">
                42 / 100
              </span>
            </div>

            <div className="flex items-center justify-between border p-4">
              <div>
                <p className="text-sm font-semibold">
                  Outlook
                </p>
                <p className="text-xs text-muted-foreground">
                  outreach@example.com
                </p>
              </div>

              <span className="text-xs font-bold">
                28 / 100
              </span>
            </div>

          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-muted p-4">
              <p className="text-2xl font-black">
                70
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sent today
              </p>
            </div>

            <div className="bg-muted p-4">
              <p className="text-2xl font-black">
                2
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Active senders
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div className="order-1 lg:order-2">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
        05 / SENDER INFRASTRUCTURE
      </span>

      <h2 className="mt-6 text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
        Your inbox.
        <br />
        Your rules.
      </h2>

      <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
        Connect multiple sender accounts and control exactly how your
        campaigns distribute emails.
      </p>

      <div className="mt-10 space-y-5">

        <div className="flex gap-4">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold">
              Sending limits
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure hourly and daily limits for each sender.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Mail className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold">
              Multiple accounts
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Spread campaigns across the sender accounts you connect.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Activity className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold">
              Live status
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              See sender activity while your campaigns are running.
            </p>
          </div>
        </div>

      </div>
    </div>

  </div>
</section>


{/* ========================================================= */}
{/* SECTION 6 — CAMPAIGNS & ANALYTICS */}
{/* ========================================================= */}
<section
  id="analytics"
  className="flex min-h-screen items-center border-t bg-muted/20 px-4 py-20"
>
  <div className="mx-auto w-full max-w-6xl">

    <div className="grid items-end gap-8 lg:grid-cols-2">

      <div>
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
          06 / CAMPAIGNS & ANALYTICS
        </span>

        <h2 className="mt-6 text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
          Know what is
          <br />
          happening.
        </h2>
      </div>

      <p className="max-w-lg text-lg leading-relaxed text-muted-foreground lg:ml-auto">
        Launch campaigns, pause them whenever you want and track every
        important sending event from one place.
      </p>

    </div>

    <div className="mt-16 grid gap-6 md:grid-cols-3">

      <div className="border bg-background p-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Emails sent
          </span>

          <TrendingUp className="size-5 text-primary" />
        </div>

        <p className="mt-8 text-6xl font-black">
          1,248
        </p>

        <p className="mt-3 text-sm text-primary">
          +18.4% this campaign
        </p>
      </div>

      <div className="border bg-background p-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Delivered
          </span>

          <Activity className="size-5 text-primary" />
        </div>

        <p className="mt-8 text-6xl font-black">
          96.8%
        </p>

        <p className="mt-3 text-sm text-muted-foreground">
          Delivery performance
        </p>
      </div>

      <div className="border bg-background p-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Campaign
          </span>

          <Megaphone className="size-5 text-primary" />
        </div>

        <p className="mt-8 text-3xl font-black">
          Running
        </p>

        <p className="mt-3 text-sm text-muted-foreground">
          3 senders currently active
        </p>
      </div>

    </div>

    <div className="mt-6 border bg-background p-8">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">
            Campaign activity
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Real-time sending overview
          </p>
        </div>

        <Badge variant="outline">
          LIVE
        </Badge>
      </div>

      <div className="mt-8 h-32 overflow-hidden">
        <div className="flex h-full items-end gap-2">
          {[35, 50, 42, 65, 58, 72, 64, 85, 76, 92, 80, 100].map(
            (height, index) => (
              <div
                key={index}
                className="flex-1 bg-primary/20 transition-all hover:bg-primary/40"
                style={{ height: `${height}%` }}
              />
            )
          )}
        </div>
      </div>

    </div>

  </div>
</section>


{/* ========================================================= */}
{/* SECTION 7 — FINAL CTA */}
{/* ========================================================= */}
<section
  id="get-started"
  className="flex min-h-screen items-center border-t bg-background px-4 py-20"
>
  <div className="mx-auto w-full max-w-5xl text-center">

    <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
      07 / GET STARTED
    </span>

    <   h2 className="mt-8 text-[16vw] font-black uppercase leading-[0.75] tracking-[-0.08em] sm:text-[13vw] lg:text-[10vw]">
      MALESENDER
      <br />
      MALESENDER
    </h2>

    <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-muted-foreground">
      Connect your sender, import your leads and launch your first
      personalized email campaign.
    </p>

    <Link
      href="/login"
      className={cn(
        buttonVariants({ size: "lg" }),
        "mt-8 h-14 rounded-full px-10 text-base"
      )}
    >
      Get started
      <ArrowRight className="ml-2 size-5" />
    </Link>

  </div>
</section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} MaleSender — self-hosted.</span>
          <span>Your email accounts. Your data. Your infrastructure.</span>
        </div>
      </footer>
    </>
  );
}
