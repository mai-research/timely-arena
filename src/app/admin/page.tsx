import { AdminHistory } from "@/components/admin/dashboard";
import { requireAdminDemo } from "@/lib/admin/access";
export default async function AdminPage() {
  await requireAdminDemo();
  return <AdminHistory />;
}
