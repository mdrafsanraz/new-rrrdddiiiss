import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { isStaffRole, hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { planLabel } from "@/lib/plans";

export const metadata = { title: "Users · Admin" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await requirePermission("users.read");
  const q = ((await searchParams).q ?? "").trim();
  const canImpersonate = hasPermission(admin.role, "users.impersonate");

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { id: { equals: q } },
            { stripeCustomerId: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { artists: true, releases: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by name, email, user ID, or Stripe customer ID.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Name, email, user ID, Stripe…"
          className="h-9 w-full max-w-md rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-foreground/30"
        />
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">User</th>
              <th className="px-3 py-2 font-semibold">Plan</th>
              <th className="px-3 py-2 font-semibold">Artists</th>
              <th className="px-3 py-2 font-semibold">Releases</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Joined</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {isStaffRole(u.role) ? (
                    <span className="mt-1 inline-block rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {u.role.replace("_", " ")}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-xs">{planLabel(u.planId)}</td>
                <td className="px-3 py-2.5 text-xs tabular-nums">
                  {u._count.artists}
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums">
                  {u._count.releases}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {u.terminated
                    ? "Terminated"
                    : u.suspended
                      ? "Suspended"
                      : "Active"}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {u.createdAt.toLocaleDateString()}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 px-3 text-xs"
                      )}
                    >
                      Open
                    </Link>
                    {canImpersonate && !isStaffRole(u.role) ? (
                      <LoginAsUserButton userId={u.id} userName={u.name} />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
