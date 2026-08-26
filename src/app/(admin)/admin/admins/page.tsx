import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { STAFF_ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AddAdminForms } from "@/components/admin/add-admin-forms";
import { RemoveAdminButton } from "@/components/admin/remove-admin-button";

export const metadata = { title: "Staff · Admin" };

export default async function AdminAdminsPage() {
  const me = await requirePermission("staff.manage");
  const admins = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles: super_admin, admin, reviewer, support, finance. Enforced
          server-side.
        </p>
      </div>

      <AddAdminForms />

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Current staff</h2>
        </div>
        <ul className="divide-y divide-border">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
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
                  {a.email} · {a.role.replace("_", " ")} · since{" "}
                  {a.createdAt.toLocaleDateString()}
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
