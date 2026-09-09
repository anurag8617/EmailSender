import { requireAuth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { TemplatesTable } from "@/components/templates/templates-table";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  await requireAuth();

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Reusable emails with variables like {"{{first_name}}"}, {"{{company}}"}, and
            {"{{sender_name}}"}.
          </p>
        </div>
        <TemplatesTable />
      </main>
    </>
  );
}