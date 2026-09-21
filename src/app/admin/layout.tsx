import { requireAdminDemo } from "@/lib/admin/access";
import "./admin.css";

export const metadata = { title: "Admin | TIMELY Arena" };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminDemo();
  return <div className="admin-page">{children}</div>;
}
