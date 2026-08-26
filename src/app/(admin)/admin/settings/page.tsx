import { requirePermission } from "@/lib/auth/admin";
import { adminEmailsFromEnv } from "@/lib/auth/admin";
import Link from "next/link";

export const metadata = { title: "Settings · Admin" };

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage");
  const envAdmins = adminEmailsFromEnv();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Super-admin configuration. Staff roles are managed under Admins.
        </p>
      </div>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Environment admins</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Emails in <code>ADMIN_EMAILS</code> (plus defaults) are promoted to{" "}
          <code>super_admin</code> on access.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {envAdmins.map((e) => (
            <li key={e} className="font-mono text-xs">
              {e}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Staff</h2>
        <Link
          href="/admin/admins"
          className="mt-2 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Manage staff roles →
        </Link>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">LabelGrid</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Environment is sandbox-only for now. See{" "}
          <Link
            href="/admin/system"
            className="underline-offset-2 hover:underline"
          >
            LabelGrid / System
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
