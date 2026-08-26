import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
