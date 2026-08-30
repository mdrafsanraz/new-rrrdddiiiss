import Link from "next/link";
import {
  ClockCountdown,
  SlidersHorizontal,
  Sparkle,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import type { Prisma, WalletTransactionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getWalletBalances } from "@/lib/wallet";
import {
  WalletTransactionFeed,
  type WalletFeedItem,
} from "@/components/dashboard/wallet-transaction-feed";
import { WalletWithdraw } from "@/components/dashboard/wallet-withdraw";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { PayoutMethodPanel } from "@/components/dashboard/payout-method-panel";
import { describePayoutDestination } from "@/lib/payout-methods";
import { getPayoutPolicy, PAYOUT_METHODS } from "@/lib/payout-settings";

export const metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";
const VALID_STATUSES: WalletTransactionStatus[] = [
  "pending",
  "available",
  "processing",
  "paid",
  "declined",
  "reversed",
];

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const filterType = ["royalties", "withdrawals"].includes(query.type ?? "")
    ? query.type
    : "all";
  const status = VALID_STATUSES.includes(
    query.status as WalletTransactionStatus,
  )
    ? (query.status as WalletTransactionStatus)
    : undefined;
  const sort = ["oldest", "highest", "lowest"].includes(query.sort ?? "")
    ? query.sort
    : "newest";
  const where: Prisma.WalletTransactionWhereInput = {
    userId: user.id,
    ...(filterType === "royalties"
      ? { type: "royalty_credit" }
      : filterType === "withdrawals"
        ? { type: "withdrawal" }
        : {}),
    ...(status ? { status } : {}),
  };
  const orderBy: Prisma.WalletTransactionOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "highest"
        ? [{ amount: "desc" }, { createdAt: "desc" }]
        : sort === "lowest"
          ? [{ amount: "asc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];
  const [balances, transactions, total, payoutPolicy] = await Promise.all([
    getWalletBalances(user.id),
    prisma.walletTransaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.walletTransaction.count({ where }),
    getPayoutPolicy(),
  ]);
  const withdrawalIds = transactions
    .filter((transaction) => transaction.type === "withdrawal")
    .map((transaction) => transaction.sourceId);
  const paidAmountByWithdrawalId = withdrawalIds.length
    ? new Map(
        (
          await prisma.withdrawal.findMany({
            where: { id: { in: withdrawalIds }, paidAmount: { not: null } },
            select: { id: true, paidAmount: true },
          })
        ).map((withdrawal) => [withdrawal.id, withdrawal.paidAmount!.toString()]),
      )
    : new Map<string, string>();
  const items: WalletFeedItem[] = transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    direction: transaction.direction,
    // A settled withdrawal shows what the user actually received (net of
    // tax/fee), not the gross amount reserved from their balance at
    // request time — the ledger itself still tracks the gross amount.
    amount:
      paidAmountByWithdrawalId.get(transaction.sourceId) ??
      transaction.amount.toString(),
    currency: transaction.currency,
    title: transaction.title,
    description: transaction.description,
    status: transaction.status,
    sourceId: transaction.sourceId,
    createdAt: transaction.createdAt.toISOString(),
  }));
  const payoutDestination = describePayoutDestination(user);
  const savedMethodEnabled = Boolean(user.payoutMethod && user.payoutMethod in payoutPolicy.methods && payoutPolicy.methods[user.payoutMethod as keyof typeof payoutPolicy.methods].enabled);
  const selectedPayoutPolicy = user.payoutMethod && user.payoutMethod in payoutPolicy.methods
    ? payoutPolicy.methods[user.payoutMethod as keyof typeof payoutPolicy.methods]
    : null;
  const href = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      type: filterType === "all" ? undefined : filterType,
      status,
      sort: sort === "newest" ? undefined : sort,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged))
      if (value) params.set(key, value);
    const value = params.toString();
    return `/dashboard/wallet${value ? `?${value}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <header>
        <div className="flex items-center gap-2 text-primary">
          <Wallet size={18} weight="duotone" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
            Financial account
          </p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
          Wallet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your earnings and payouts.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,.75fr)]">
        <section className="relative overflow-visible rounded-2xl bg-foreground p-6 text-background sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="absolute right-6 top-6 flex items-center gap-1 text-[10px] text-background/35">
            <Sparkle size={13} />
            RDISTRO ledger
          </div>
          <div className="flex min-h-44 flex-col justify-between gap-8">
            <div>
              <p className="text-xs text-background/50">Available balance</p>
              <AnimatedMoney
                value={Number(balances.available)}
                className="mt-2 block text-4xl font-semibold tracking-[-0.045em] sm:text-5xl"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-xs text-xs leading-5 text-background/45">
                Cleared earnings currently available to request for payout.
              </p>
              <WalletWithdraw
                available={balances.available.toString()}
                currency={payoutPolicy.currency}
                threshold={Number(selectedPayoutPolicy?.minimum ?? 0)}
                fixedFee={selectedPayoutPolicy?.fixedFee ?? "0"}
                percentageFee={selectedPayoutPolicy?.percentageFee ?? "0"}
                hasPayoutMethod={savedMethodEnabled}
                payoutDestination={payoutDestination}
              />
            </div>
          </div>
        </section>
        <div className="lg:row-span-2">
          <PayoutMethodPanel
            initial={{
              method: user.payoutMethod,
              email: user.payoutEmail ?? "",
              wiseAccount: user.payoutWiseAccount ?? "",
              payoneerAccount: user.payoutPayoneerAccount ?? "",
              bankCurrency: user.payoutBankCurrency ?? "USD",
              bankName: user.payoutBankName ?? "",
              bankAddress: user.payoutBankAddress ?? "",
              bankCountry: user.payoutBankCountry ?? "",
              accountHolderName: user.payoutBankAccountHolder ?? "",
              accountNumber: user.payoutBankAccountNumber ?? "",
              swiftBic: user.payoutBankSwift ?? "",
            }}
            accountName={user.payoutBankAccountHolder ?? user.name}
            destination={user.payoutMethod ? payoutDestination : null}
            enabledMethods={PAYOUT_METHODS.filter((method) => payoutPolicy.methods[method].enabled)}
            currency={payoutPolicy.currency}
            minimums={Object.fromEntries(PAYOUT_METHODS.map((method) => [method, payoutPolicy.methods[method].minimum]))}
          />
        </div>
        <section className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3 lg:col-start-1">
          <BalanceMetric label="Pending" value={Number(balances.pending)} />
          <BalanceMetric
            label="Lifetime earned"
            value={Number(balances.lifetimeEarnings)}
            border
          />
          <BalanceMetric
            label="Withdrawn"
            value={Number(balances.lifetimeWithdrawn)}
            border
          />
        </section>
      </div>
      <section>
        <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Transactions
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Royalty credits and money leaving your wallet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex rounded-lg bg-muted p-1">
              {[
                ["all", "All"],
                ["royalties", "Royalties"],
                ["withdrawals", "Withdrawals"],
              ].map(([value, label]) => (
                <Link
                  key={value}
                  href={href({
                    type: value === "all" ? undefined : value,
                    page: undefined,
                  })}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filterType === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <form className="flex items-center gap-2">
              <input
                type="hidden"
                name="type"
                value={filterType === "all" ? "" : filterType}
              />
              <label className="relative">
                <span className="sr-only">Status</span>
                <select
                  name="status"
                  defaultValue={status ?? ""}
                  className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-xs font-medium"
                >
                  <option value="">All statuses</option>
                  {VALID_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground" />
              </label>
              <select
                name="sort"
                defaultValue={sort}
                className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium"
                aria-label="Sort transactions"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
              <button className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition hover:bg-muted">
                Apply
              </button>
            </form>
          </div>
        </div>
        <WalletTransactionFeed items={items} />
        {total > 20 ? (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>{total.toLocaleString()} transactions</span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={href({ page: String(page - 1) })}
                  className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Previous
                </Link>
              ) : null}
              {page * 20 < total ? (
                <Link
                  href={href({ page: String(page + 1) })}
                  className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
      <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ClockCountdown />
        Detailed store and territory rows remain inside each royalty statement.
      </p>
    </div>
  );
}

function BalanceMetric({
  label,
  value,
  border = false,
}: {
  label: string;
  value: number;
  border?: boolean;
}) {
  return (
    <div
      className={`p-5 ${border ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
    >
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <AnimatedMoney
        value={value}
        className="mt-1.5 block text-lg font-semibold"
      />
    </div>
  );
}
