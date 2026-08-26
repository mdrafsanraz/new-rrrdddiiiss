import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AddAdminForms } from "@/components/admin/add-admin-forms";
import { RemoveAdminButton } from "@/components/admin/remove-admin-button";

export const metadata = { title: "Admins · Admin" };

export default async function AdminAdminsPage() {
  const me = await requireAdmin();
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin access is managed here only — not from the user edit screen.
        </p>
      </div>

      <AddAdminForms />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Current admins</h2>
        </div>
        <ul className="divide-y divide-border">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm"
            >
              <div>
                <p className="font-medium">
                  {a.name}
                  {a.id === me.id ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.email} · since {a.createdAt.toLocaleDateString()}
                </p>
              </div>
              {a.id !== me.id ? (
                <RemoveAdminButton adminId={a.id} adminName={a.name} />
              ) : (
                <Link
                  href="/admin/users"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  View users
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
