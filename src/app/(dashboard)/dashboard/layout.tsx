import { requireUser } from "@/lib/auth/session";
import { planLabel } from "@/lib/plans";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <DashboardShell userName={user.name} planLabel={planLabel(user.planId)}>
      {children}
    </DashboardShell>
  );
}
