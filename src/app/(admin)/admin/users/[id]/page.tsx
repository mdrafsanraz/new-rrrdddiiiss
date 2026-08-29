import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminUserEditForm } from "@/components/admin/user-edit-form";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { planLabel } from "@/lib/plans";
import { getWalletBalances } from "@/lib/wallet";
import { Prisma } from "@prisma/client";

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
      walletTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) notFound();
  const balances = await getWalletBalances(user.id);
  const money = (value: Prisma.Decimal.Value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(Number(value.toString()));

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
      />

      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="text-sm font-semibold">Wallet</h2><p className="mt-1 text-xs text-muted-foreground">Derived from immutable ledger entries. Corrections must create adjustments or reversals.</p></div><Link href={`/admin/wallets?q=${encodeURIComponent(user.email)}`} className="text-xs font-semibold hover:underline">Open in global ledger</Link></div>
        <div className="grid border-b border-border sm:grid-cols-4"><WalletMetric label="Available" value={money(balances.available)} /><WalletMetric label="Pending" value={money(balances.pending)} /><WalletMetric label="Lifetime earned" value={money(balances.lifetimeEarnings)} /><WalletMetric label="Paid lifetime" value={money(balances.lifetimeWithdrawn)} /></div>
        {!user.walletTransactions.length ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No wallet entries yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Date</th><th className="px-3 py-3">Entry</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Source</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-border">{user.walletTransactions.map((entry) => <tr key={entry.id}><td className="px-5 py-3 text-muted-foreground">{entry.createdAt.toLocaleDateString()}</td><td className="px-3 py-3"><p className="font-semibold">{entry.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.type.replaceAll("_", " ")}</p></td><td className="px-3 py-3 uppercase">{entry.status}</td><td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">{entry.sourceType.replaceAll("_", " ")}</td><td className={`px-5 py-3 text-right font-semibold ${entry.direction === "credit" ? "text-emerald-800" : "text-red-700"}`}>{entry.direction === "credit" ? "+" : "-"}{money(entry.amount)}</td></tr>)}</tbody></table></div>}
      </section>

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

function WalletMetric({ label, value }: { label: string; value: string }) { return <div className="border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>; }
