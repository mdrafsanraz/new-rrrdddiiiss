import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Funnel } from "@phosphor-icons/react/dist/ssr";
import { Prisma, type WalletTransactionStatus, type WalletTransactionType } from "@prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Transactions | Admin" };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; type?: string; status?: string; period?: string; minimum?: string; maximum?: string; from?: string; to?: string; page?: string }> };
const types: WalletTransactionType[] = ["royalty_credit", "withdrawal", "adjustment", "reversal"];
const statuses: WalletTransactionStatus[] = ["pending", "available", "processing", "paid", "declined", "reversed"];
const take = 50;
const validAmount = (value?: string) => value && /^\d+(\.\d{1,6})?$/.test(value) ? new Prisma.Decimal(value) : undefined;
const money = (value: Prisma.Decimal.Value, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(Number(value.toString()));
const date = (value: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value);

export default async function TransactionsPage({ searchParams }: Props) {
  await requirePermission("royalties.read");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = types.includes(params.type as WalletTransactionType) ? params.type as WalletTransactionType : undefined;
  const status = statuses.includes(params.status as WalletTransactionStatus) ? params.status as WalletTransactionStatus : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const [periods, selectedStatements] = await Promise.all([
    prisma.royaltyPeriod.findMany({ orderBy: { startDate: "desc" }, take: 36, select: { id: true, period: true, startDate: true } }),
    params.period ? prisma.userRoyaltyStatement.findMany({ where: { royaltyPeriodId: params.period }, select: { id: true } }) : Promise.resolve([]),
  ]);
  const createdAt: Prisma.DateTimeFilter = {};
  if (params.from && !Number.isNaN(Date.parse(params.from))) createdAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  if (params.to && !Number.isNaN(Date.parse(params.to))) createdAt.lte = new Date(`${params.to}T23:59:59.999Z`);
  const amount: Prisma.DecimalFilter = {};
  const minimum = validAmount(params.minimum); const maximum = validAmount(params.maximum);
  if (minimum) amount.gte = minimum; if (maximum) amount.lte = maximum;
  const where: Prisma.WalletTransactionWhereInput = {
    ...(type ? { type } : {}), ...(status ? { status } : {}),
    ...(params.period ? { sourceType: "user_royalty_statement", sourceId: { in: selectedStatements.map((statement) => statement.id) } } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}), ...(Object.keys(amount).length ? { amount } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { sourceId: { contains: q, mode: "insensitive" } }, { user: { is: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } }] } : {}),
  };
  const [rows, total, summary] = await Promise.all([
    prisma.walletTransaction.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.groupBy({ by: ["direction"], where, _sum: { amount: true }, _count: true }),
  ]);
  const statementIds = rows.filter((row) => row.sourceType === "user_royalty_statement").map((row) => row.sourceId);
  const statements = statementIds.length ? await prisma.userRoyaltyStatement.findMany({ where: { id: { in: statementIds } }, select: { id: true, royaltyPeriodId: true } }) : [];
  const statementPeriods = new Map(statements.map((statement) => [statement.id, statement.royaltyPeriodId]));
  const pages = Math.max(1, Math.ceil(total / take));
  const sum = (direction: "credit" | "debit") => summary.find((item) => item.direction === direction)?._sum.amount ?? new Prisma.Decimal(0);
  const pageHref = (next: number) => { const search = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))); search.set("page", String(next)); return `/admin/transactions?${search}`; };
  return <div className="mx-auto max-w-[1400px] space-y-6">
    <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex items-center gap-2 text-primary"><BookOpen size={18} weight="duotone" /><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">Financial audit trail</span></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Transactions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Inspect every royalty credit, withdrawal, adjustment and reversal. Entries remain immutable and corrections create new ledger records.</p></div><Link href="/admin/wallets" className="flex h-10 items-center gap-2 border border-border px-4 text-xs font-semibold hover:bg-muted"><ArrowLeft /> Wallet overview</Link></header>
    <section className="grid border border-border bg-card md:grid-cols-3"><Metric label="Matching entries" value={total.toLocaleString()} icon={<BookOpen />} /><Metric label="Credits" value={`+${money(sum("credit"))}`} icon={<ArrowUp />} tone="text-emerald-700" /><Metric label="Debits" value={`-${money(sum("debit"))}`} icon={<ArrowDown />} tone="text-red-700" /></section>
    <form className="grid gap-3 border border-border bg-card p-4 md:grid-cols-4 xl:grid-cols-[1.4fr_repeat(7,1fr)_auto] xl:items-end">
      <Field label="User or source"><input name="q" defaultValue={q} placeholder="Name, email, source ID" className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground" /></Field>
      <Field label="Entry type"><select name="type" defaultValue={type ?? ""} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground"><option value="">All types</option>{types.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></Field>
      <Field label="Status"><select name="status" defaultValue={status ?? ""} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
      <Field label="Royalty period"><select name="period" defaultValue={params.period ?? ""} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground"><option value="">All periods</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.period}</option>)}</select></Field>
      <Field label="Minimum"><input name="minimum" inputMode="decimal" defaultValue={params.minimum} placeholder="0.00" className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground" /></Field>
      <Field label="Maximum"><input name="maximum" inputMode="decimal" defaultValue={params.maximum} placeholder="No limit" className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground" /></Field>
      <Field label="From"><input type="date" name="from" defaultValue={params.from} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground" /></Field>
      <Field label="To"><input type="date" name="to" defaultValue={params.to} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-normal normal-case tracking-normal text-foreground" /></Field>
      <button className="flex h-9 items-center justify-center gap-2 bg-foreground px-4 text-xs font-semibold text-background"><Funnel /> Apply</button>
    </form>
    <section className="overflow-hidden border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold">Global ledger</h2><p className="mt-1 text-[11px] text-muted-foreground">Amounts and counts reflect the active filters.</p></div>{Object.values(params).some(Boolean) ? <Link href="/admin/transactions" className="text-xs font-semibold hover:underline">Clear filters</Link> : null}</div><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-xs"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Entry</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-border">{!rows.length ? <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">No transactions match these filters.</td></tr> : rows.map((row) => { const periodId = statementPeriods.get(row.sourceId); const sourceHref = row.sourceType === "withdrawal" ? `/admin/withdrawals?q=${encodeURIComponent(row.sourceId)}` : periodId ? `/admin/royalties/${periodId}` : null; return <tr key={row.id} className="hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-4">{date(row.createdAt)}</td><td className="px-3 py-4"><Link href={`/admin/users/${row.user.id}`} className="font-semibold hover:underline">{row.user.name}</Link><p className="mt-1 text-[10px] text-muted-foreground">{row.user.email}</p></td><td className="px-3 py-4"><p className="font-semibold">{row.title}</p><p className="mt-1 text-[10px] capitalize text-muted-foreground">{row.type.replaceAll("_", " ")}</p>{row.description ? <p className="mt-1 max-w-sm truncate text-[10px] text-muted-foreground">{row.description}</p> : null}</td><td className="px-3 py-4"><p className="capitalize">{row.sourceType.replaceAll("_", " ")}</p>{sourceHref ? <Link href={sourceHref} className="mt-1 block max-w-52 truncate font-mono text-[10px] font-semibold hover:underline">{row.sourceId}</Link> : <p className="mt-1 max-w-52 truncate font-mono text-[10px] text-muted-foreground">{row.sourceId}</p>}</td><td className="px-3 py-4 font-semibold capitalize">{row.status}</td><td className={`px-4 py-4 text-right text-sm font-semibold tabular-nums ${row.direction === "credit" ? "text-emerald-700" : "text-red-700"}`}>{row.direction === "credit" ? "+" : "-"}{money(row.amount, row.currency)}</td></tr>; })}</tbody></table></div><footer className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>Page {page} of {pages}</span><div className="flex gap-2">{page > 1 ? <Link href={pageHref(page - 1)} className="flex h-8 items-center gap-1 border border-border px-3 font-semibold text-foreground"><ArrowLeft /> Previous</Link> : null}{page < pages ? <Link href={pageHref(page + 1)} className="flex h-8 items-center gap-1 border border-border px-3 font-semibold text-foreground">Next <ArrowRight /></Link> : null}</div></footer></section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}{children}</label>; }
function Metric({ label, value, icon, tone = "text-foreground" }: { label: string; value: string; icon: React.ReactNode; tone?: string }) { return <div className="flex items-center gap-4 border-b border-border p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><span className="grid size-9 place-items-center bg-muted text-muted-foreground">{icon}</span><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p></div></div>; }
