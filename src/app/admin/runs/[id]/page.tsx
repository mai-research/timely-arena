import { notFound } from "next/navigation";
import { ADMIN_RECORDS } from "@/lib/admin/data";
import { AdminDetail } from "@/components/admin/dashboard";
import { requireAdminDemo } from "@/lib/admin/access";
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminDemo();
  const { id } = await params;
  const record = ADMIN_RECORDS.find(record => record.id === id);
  if (!record) notFound();
  return <AdminDetail key={record.id} record={record} />;
}
