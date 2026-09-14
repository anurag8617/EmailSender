import { requireAuth } from "@/lib/auth";
import { LeadListsTable } from "@/components/lead-lists/lead-lists-table";

export const metadata = { title: "Lead Lists" };

export default async function LeadListsPage() {
  await requireAuth();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lead Lists</h1>
        <p className="mt-1 text-muted-foreground">
          Group leads into reusable lists, then pick a whole list when creating a campaign.
        </p>
      </div>
      <LeadListsTable />
    </div>
  );
}