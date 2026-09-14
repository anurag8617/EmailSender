import { requireAuth } from "@/lib/auth";
import { TemplatesTable } from "@/components/templates/templates-table";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  await requireAuth();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Reusable emails with variables like {"{{first_name}}"}, {"{{company}}"}, and
          {"{{sender_name}}"}.
        </p>
      </div>
      <TemplatesTable />
    </div>
  );
}