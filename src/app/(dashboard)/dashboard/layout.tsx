import { getSessionContext, requireUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { planLabel } from "@/lib/plans";
import { DashboardShell } from "@/components/dashboard/shell";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const ctx = await getSessionContext();

  return (
    <>
      {ctx.isImpersonating && ctx.impersonator ? (
        <ImpersonationBanner
          targetName={user.name}
          adminName={ctx.impersonator.name}
        />
      ) : null}
      <DashboardShell
        userName={user.name}
        planLabel={planLabel(user.planId)}
        showAdminLink={isAdminUser(user) && !ctx.isImpersonating}
      >
        {children}
      </DashboardShell>
    </>
  );
}
