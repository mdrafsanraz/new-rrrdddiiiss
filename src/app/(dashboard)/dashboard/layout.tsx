import { getSessionContext, requireUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { planLabel } from "@/lib/plans";
import { DashboardShell } from "@/components/dashboard/shell";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { Callout } from "@/components/ui/callout";

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
          targetEmail={user.email}
          adminName={ctx.impersonator.name}
        />
      ) : null}
      <DashboardShell
        userName={user.name}
        planLabel={planLabel(user.planId)}
        showAdminLink={isAdminUser(user) && !ctx.isImpersonating}
      >
        {user.migrationNotice ? (
          <Callout tone="info" title="Catalog migration in progress">
            We’re currently migrating your existing content to our new platform.
            Your live releases will automatically appear in your account once the
            migration is complete. You can continue submitting new releases during
            this process.
          </Callout>
        ) : null}
        {children}
      </DashboardShell>
    </>
  );
}
