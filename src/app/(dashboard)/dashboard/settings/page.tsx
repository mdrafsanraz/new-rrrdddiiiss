import { requireUser } from "@/lib/auth/session";
import { planLabel } from "@/lib/plans";

export const metadata = { title: "Account" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      <section className="border border-border bg-card p-5 text-sm">
        <dl>
          <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{planLabel(user.planId)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
