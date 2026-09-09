import { requireAuth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  await requireAuth();

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-muted-foreground">
            Create outreach campaigns, select leads and sender accounts, and configure the schedule.
          </p>
        </div>
        <CampaignsTable />
      </main>
    </>
  );
}