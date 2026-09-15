import { requireAuth } from "@/lib/auth";
import { LeadListDetail } from "@/components/lead-lists/lead-list-detail";

export const metadata = { title: "Lead List" };

export default async function LeadListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  return <LeadListDetail listId={Number(id)} />;
}