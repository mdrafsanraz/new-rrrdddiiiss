import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  CurrencyDollar,
  FileCsv,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { RoyaltyImportButton } from "@/components/admin/royalty-workflow-actions";
import { RoyaltyRuleForm } from "@/components/admin/royalty-rule-form";
import { hasPermission } from "@/lib/auth/permissions";
import { WithdrawalStatusForm } from "@/components/admin/withdrawal-status-form";

export const metadata = { title: "Royalties · Admin" };
export const dynamic = "force-dynamic";

const money = (value: { toString(): string }) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(Number(value.toString()));
const month = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);

export default async function AdminRoyaltiesPage() {
  const admin = await requirePermission("royalties.read");
  const canWrite = hasPermission(admin.role, "royalties.write");
  const [periods, rules, users, withdrawals] = await Promise.all([
    prisma.royaltyPeriod.findMany({
      orderBy: { startDate: "desc" },
      take: 24,
      include: {
        imports: { select: { totalSourceNet: true } },
        _count: { select: { transactions: true } },
      },
    }),
    prisma.royaltyRule.findMany({
      where: { active: true },
      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
      take: 20,
    }),
    canWrite
      ? prisma.user.findMany({
          where: { role: "user", terminated: false },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
          take: 500,
        })
      : Promise.resolve([]),
    prisma.withdrawal.findMany({
      orderBy: { requestedAt: "desc" },
      take: 12,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const ids = periods.map((period) => period.id);
  const matchGroups = ids.length
    ? await prisma.royaltyTransaction.groupBy({
        by: ["royaltyPeriodId", "matchStatus"],
        where: { royaltyPeriodId: { in: ids } },
        _count: true,
      })
    : [];

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <header className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <CurrencyDollar size={18} weight="duotone" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
              Finance operations
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">
            Royalty ledger
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Import LabelGrid statements, reconcile ownership and publish
            traceable artist earnings without changing source values.
          </p>
        </div>
        <RoyaltyImportButton />
      </header>
      {periods.length === 0 ? (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-card">
          <div className="max-w-sm text-center">
            <FileCsv
              className="mx-auto text-muted-foreground"
              size={32}
              weight="duotone"
            />
            <h2 className="mt-4 font-semibold">No statements imported</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start with the monthly LabelGrid CSV. Uploading validates and
              matches it but never publishes automatically.
            </p>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_auto] border-b border-border px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <span>Periods</span>
            <span>{periods.length} imported</span>
          </div>
          <div className="divide-y divide-border">
            {periods.map((period) => {
              const groups = matchGroups.filter(
                (group) => group.royaltyPeriodId === period.id,
              );
              const matched = groups
                .filter((group) =>
                  ["matched", "manual_match"].includes(group.matchStatus),
                )
                .reduce((sum, group) => sum + group._count, 0);
              const review = groups
                .filter((group) =>
                  ["unmatched", "conflict"].includes(group.matchStatus),
                )
                .reduce((sum, group) => sum + group._count, 0);
              const net = period.imports.reduce(
                (sum, item) => sum + Number(item.totalSourceNet),
                0,
              );
              return (
                <Link
                  key={period.id}
                  href={`/admin/royalties/${period.id}`}
                  className="group grid gap-4 px-5 py-5 transition hover:bg-muted/40 lg:grid-cols-[1.1fr_.8fr_.8fr_.8fr_auto] lg:items-center"
                >
                  <div>
                    <p className="text-base font-semibold">
                      {month(period.startDate)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      LabelGrid · {period.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {period._count.transactions.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transactions
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {money({ toString: () => String(net) })}
                    </p>
                    <p className="text-xs text-muted-foreground">Source net</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                      <CheckCircle weight="fill" />
                      {matched}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-xs ${review ? "text-amber-700" : "text-muted-foreground"}`}
                    >
                      <WarningCircle weight="fill" />
                      {review}
                    </span>
                  </div>
                  <ArrowRight className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Withdrawal requests</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update the ledger only after the corresponding payout operation.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {withdrawals.length} recent
          </span>
        </div>
        {withdrawals.length ? (
          <div className="divide-y divide-border">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_.7fr_.8fr_auto] lg:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {withdrawal.user.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {withdrawal.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {withdrawal.currency} {withdrawal.amount.toString()}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {withdrawal.method.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {withdrawal.destination}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs">{withdrawal.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {withdrawal.requestedAt.toLocaleDateString("en-US")}
                  </p>
                </div>
                {canWrite ? (
                  <WithdrawalStatusForm
                    id={withdrawal.id}
                    current={withdrawal.status}
                    reference={withdrawal.reference}
                  />
                ) : (
                  <span className="text-xs capitalize text-muted-foreground">
                    {withdrawal.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No withdrawal requests yet.
          </p>
        )}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Active rule versions</h2>
          <div className="mt-3 divide-y divide-border">
            {rules.length ? (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-medium">
                      {rule.name}{" "}
                      <span className="text-muted-foreground">
                        v{rule.version}
                      </span>
                    </p>
                    <p className="mt-1 capitalize text-muted-foreground">
                      {rule.scope}
                      {rule.planId ? ` · ${rule.planId}` : ""}
                    </p>
                  </div>
                  <p className="font-mono">
                    {rule.commissionRate !== null
                      ? `${rule.commissionRate.toString()}% commission`
                      : `${rule.revenueShareRate?.toString() ?? "100"}% share`}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-5 text-xs text-muted-foreground">
                No rules yet. Calculations default to no RDISTRO deduction.
              </p>
            )}
          </div>
        </div>
        {canWrite ? (
          <RoyaltyRuleForm users={users} />
        ) : (
          <div className="rounded-xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
            Your role can review royalties but cannot change accounting rules.
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-muted-foreground">
        Raw source rows remain admin-only. Published statements expose only
        contractual revenue basis, RDISTRO deductions, and user earnings.
      </p>
    </div>
  );
}
