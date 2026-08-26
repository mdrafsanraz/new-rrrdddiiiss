import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminUserEditForm } from "@/components/admin/user-edit-form";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { planLabel } from "@/lib/plans";

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      artists: { orderBy: { createdAt: "desc" }, take: 20 },
      releases: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { artist: { select: { name: true } } },
      },
      _count: { select: { artists: true, releases: true } },
    },
  });
  if (!user) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Users
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.email} · {planLabel(user.planId)}
            {user.role === "admin" ? " · Admin" : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user._count.artists} artists · {user._count.releases} releases ·
            joined {user.createdAt.toLocaleDateString()}
          </p>
        </div>
        {user.role !== "admin" ? (
          <LoginAsUserButton userId={user.id} userName={user.name} />
        ) : null}
      </div>

      <AdminUserEditForm
        userId={user.id}
        name={user.name}
        planId={user.planId}
        role={user.role}
      />

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Recent releases</h2>
        </div>
        <ul className="divide-y divide-border">
          {user.releases.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">None</li>
          ) : (
            user.releases.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/releases/${r.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {r.catalogNumber}
                    {r.artist ? ` · ${r.artist.name}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Artists</h2>
        </div>
        <ul className="divide-y divide-border">
          {user.artists.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">None</li>
          ) : (
            user.artists.map((a) => (
              <li key={a.id} className="px-5 py-3 text-sm">
                <span className="font-medium">{a.name}</span>
                {a.locked ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (locked)
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
