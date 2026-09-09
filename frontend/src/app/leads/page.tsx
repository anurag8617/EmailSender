import { requireAuth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { LeadsTable } from "@/components/leads/leads-table";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  await requireAuth();

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your lead database. Import via CSV, or add leads manually.
          </p>
        </div>
        <LeadsTable />
      </main>
    </>
  );
}