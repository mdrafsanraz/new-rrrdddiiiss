import Link from "next/link";
import { ArrowLeft, ArrowRight, Funnel, Wallet } from "@phosphor-icons/react/dist/ssr";
import type { Prisma, WalletTransactionStatus } from "@prisma/client";
import { WithdrawalStatusForm } from "@/components/admin/withdrawal-status-form";
import { requirePermission } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { payoutMethodLabel } from "@/lib/payout-methods";

export const metadata = { title: "Withdrawals | Admin" };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; status?: string; method?: string; from?: string; to?: string; page?: string }> };
const statuses: WalletTransactionStatus[] = ["pending", "processing", "paid", "declined", "reversed"];
const take = 30;
const money = (amount: { toString(): string }, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 6 }).format(Number(amount.toString()));
const date = (value: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value);

export default async function WithdrawalsPage({ searchParams }: Props) {
  const admin = await requirePermission("royalties.read");
  const canWrite = hasPermission(admin.role, "royalties.write");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const selectedStatus = statuses.includes(params.status as WalletTransactionStatus) ? params.status as WalletTransactionStatus : undefined;
  const requestedAt: Prisma.DateTimeFilter = {};
  if (params.from && !Number.isNaN(Date.parse(params.from))) requestedAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  if (params.to && !Number.isNaN(Date.parse(params.to))) requestedAt.lte = new Date(`${params.to}T23:59:59.999Z`);
  const where: Prisma.WithdrawalWhereInput = {
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(params.method ? { method: params.method } : {}),
    ...(Object.keys(requestedAt).length ? { requestedAt } : {}),
    ...(params.q ? { OR: [{ reference: { contains: params.q, mode: "insensitive" } }, { user: { is: { OR: [{ name: { contains: params.q, mode: "insensitive" } }, { email: { contains: params.q, mode: "insensitive" } }] } } }] } : {}),
  };
  const [rows, total, statusGroups, methodGroups, pendingAmount] = await Promise.all([
    prisma.withdrawal.findMany({ where, orderBy: { requestedAt: "desc" }, skip: (page - 1) * take, take, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.groupBy({ by: ["status"], _count: true }),
    prisma.withdrawal.groupBy({ by: ["method"], orderBy: { method: "asc" } }),
    prisma.withdrawal.aggregate({ where: { status: "pending" }, _sum: { amount: true } }),
  ]);
  const count = (status: WalletTransactionStatus) => statusGroups.find((group) => group.status === status)?._count ?? 0;
  const pages = Math.max(1, Math.ceil(total / take));
  const queryFor = (next: number) => { const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))); query.set("page", String(next)); return `/admin/withdrawals?${query}`; };
  return <div className="mx-auto max-w-[1400px] space-y-6">
    <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex items-center gap-2 text-primary"><Wallet size={18} weight="duotone" /><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">Finance operations</span></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Withdrawals</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review payout requests, record processor references and keep wallet balances synchronized with every decision.</p></div><Link href="/admin/royalties" className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold hover:bg-muted"><ArrowLeft /> Royalty ledger</Link></header>
    <section className="grid border border-border bg-card sm:grid-cols-2 xl:grid-cols-5"><div className="border-b border-border p-4 sm:border-r xl:border-b-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pending value</p><p className="mt-2 text-xl font-semibold tabular-nums">{money(pendingAmount._sum.amount ?? { toString: () => "0" })}</p></div>{(["pending", "processing", "paid", "declined"] as WalletTransactionStatus[]).map((status) => <Link key={status} href={`/admin/withdrawals?status=${status}`} className="border-b border-border p-4 transition hover:bg-muted/40 sm:border-r xl:border-b-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{status}</p><p className="mt-2 text-xl font-semibold tabular-nums">{count(status).toLocaleString()}</p></Link>)}</section>
    <form className="grid gap-3 border border-border bg-card p-4 md:grid-cols-[1.5fr_repeat(4,1fr)_auto] md:items-end">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">User or reference<input name="q" defaultValue={params.q} placeholder="Search name, email, ID" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-xs normal-case tracking-normal text-foreground" /></label>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status<select name="status" defaultValue={params.status ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Method<select name="method" defaultValue={params.method ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"><option value="">All methods</option>{methodGroups.map(({ method }) => <option key={method} value={method}>{payoutMethodLabel(method)}</option>)}</select></label>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From<input type="date" name="from" defaultValue={params.from} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground" /></label>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To<input type="date" name="to" defaultValue={params.to} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground" /></label>
      <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-xs font-semibold text-background"><Funnel /> Apply</button>
    </form>
    <section className="overflow-hidden border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold">Payout queue</h2><p className="mt-1 text-[11px] text-muted-foreground">{total.toLocaleString()} matching requests. Destinations are stored and shown in masked form.</p></div>{Object.values(params).some(Boolean) ? <Link href="/admin/withdrawals" className="text-xs font-semibold hover:underline">Clear filters</Link> : null}</div><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-xs"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Requested</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Method and destination</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{!rows.length ? <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">No withdrawal requests match these filters.</td></tr> : rows.map((row) => <tr key={row.id} className="align-top hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-4">{date(row.requestedAt)}</td><td className="px-3 py-4"><Link href={`/admin/users/${row.user.id}`} className="font-semibold hover:underline">{row.user.name}</Link><p className="mt-1 text-[10px] text-muted-foreground">{row.user.email}</p></td><td className="px-3 py-4 font-semibold tabular-nums">{money(row.amount, row.currency)}</td><td className="px-3 py-4"><p className="font-semibold">{payoutMethodLabel(row.method)}</p><p className="mt-1 text-[10px] text-muted-foreground">{row.destination}</p></td><td className="px-3 py-4 font-mono text-[11px]">{row.reference}</td><td className="px-3 py-4 capitalize">{row.status}<p className="mt-1 text-[10px] text-muted-foreground">{row.processedAt ? date(row.processedAt) : "Not completed"}</p></td><td className="px-4 py-4 text-right">{canWrite ? <WithdrawalStatusForm id={row.id} current={row.status} reference={row.reference} amount={row.amount.toString()} currency={row.currency} /> : <span className="text-muted-foreground">Read only</span>}</td></tr>)}</tbody></table></div>
      <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>Page {page} of {pages}</span><div className="flex gap-2">{page > 1 ? <Link href={queryFor(page - 1)} className="flex h-8 items-center gap-1 rounded-md border border-border px-3 font-semibold text-foreground"><ArrowLeft /> Previous</Link> : null}{page < pages ? <Link href={queryFor(page + 1)} className="flex h-8 items-center gap-1 rounded-md border border-border px-3 font-semibold text-foreground">Next <ArrowRight /></Link> : null}</div></footer>
    </section>
  </div>;
}
