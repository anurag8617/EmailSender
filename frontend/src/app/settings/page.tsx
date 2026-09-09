import { requireAuth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { SuppressionsPanel } from "@/components/settings/suppressions-panel";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAuth();

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Suppression and block-list management. Every email is checked against this
            list before it is sent.
          </p>
        </div>
        <SuppressionsPanel />
      </main>
    </>
  );
}