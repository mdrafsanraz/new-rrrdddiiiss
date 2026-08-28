import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Receipt,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const money = (value: { toString(): string }, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value.toString()),
  );
const date = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

export default async function WalletTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const transaction = await prisma.walletTransaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!transaction) notFound();
  const withdrawal =
    transaction.sourceType === "withdrawal"
      ? await prisma.withdrawal.findFirst({
          where: { id: transaction.sourceId, userId: user.id },
        })
      : null;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft />
          Wallet
        </Link>
        <div className="mt-5 flex items-start justify-between gap-5">
          <div>
            <p className="text-xs capitalize text-muted-foreground">
              {transaction.type.replaceAll("_", " ")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              {transaction.title}
            </h1>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted">
            <ArrowUpRight size={21} weight="bold" />
          </span>
        </div>
      </header>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {transaction.direction === "credit" ? "+" : "−"}
            {money(transaction.amount, transaction.currency)}
          </p>
          <span
            className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${["declined", "reversed"].includes(transaction.status) ? "bg-red-50 text-red-700" : transaction.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
          >
            {transaction.status}
          </span>
        </div>
        <dl className="divide-y divide-border px-6">
          <Detail
            label="Method"
            value={
              withdrawal
                ? withdrawal.method.replaceAll("_", " ")
                : transaction.type.replaceAll("_", " ")
            }
          />
          <Detail
            label="Destination"
            value={
              withdrawal?.destination ??
              transaction.description ??
              "RDISTRO wallet"
            }
          />
          <Detail
            label="Requested"
            value={date(withdrawal?.requestedAt ?? transaction.createdAt)}
          />
          <Detail
            label="Reference"
            value={withdrawal?.reference ?? transaction.sourceId}
            mono
          />
        </dl>
      </section>
      <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
        <Receipt />
        Withdrawal requests remain pending until reviewed and processed by
        RDISTRO finance.
      </p>
    </div>
  );
}
function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[130px_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-sm font-medium capitalize ${mono ? "font-mono text-xs normal-case" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
