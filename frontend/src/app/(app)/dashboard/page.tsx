import { requireAuth } from "@/lib/auth";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { GuideDialog } from "@/components/guide-dialog";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();

return (
    <div className="flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Signed in as {user.email}
        </p>
      </div>
      <DashboardOverview />
      <GuideDialog />
    </div>
  );
}