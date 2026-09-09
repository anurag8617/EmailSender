import { requireAuth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { AccountsTable } from "@/components/email-accounts/accounts-table";

export const metadata = { title: "Email Accounts" };

export default async function EmailAccountsPage() {
  await requireAuth();

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Accounts</h1>
          <p className="mt-1 text-muted-foreground">
            Connect SMTP accounts, set conservative sending limits, and verify connections.
          </p>
        </div>
        <AccountsTable />
      </main>
    </>
  );
}