import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { planLabel } from "@/lib/plans";

export const metadata = { title: "Users · Admin" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const q = ((await searchParams).q ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage plans and accounts. Use{" "}
          <span className="font-medium text-foreground">Login as</span> to open
          their dashboard. To grant admin access, go to{" "}
          <Link href="/admin/admins" className="font-medium underline-offset-4 hover:underline">
            Admins
          </Link>
          .
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
        />
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Plan</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Counts
              </th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {u.role === "admin" ? (
                    <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      ADMIN
                    </span>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {planLabel(u.planId)}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                  {u._count.artists} artists · {u._count.releases} releases
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 px-3 text-xs"
                      )}
                    >
                      Manage
                    </Link>
                    {u.role !== "admin" ? (
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
