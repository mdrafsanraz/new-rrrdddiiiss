import { randomBytes } from "node:crypto";
import { Prisma, type WalletTransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { describePayoutDestination, payoutMethodLabel } from "@/lib/payout-methods";

const ZERO = new Prisma.Decimal(0);
const RESERVED_DEBIT_STATUSES: WalletTransactionStatus[] = [
  "pending",
  "processing",
  "paid",
];

type WalletBalanceGroup = {
  direction: "credit" | "debit";
  status: WalletTransactionStatus;
  type: "royalty_credit" | "withdrawal" | "adjustment" | "reversal";
  _sum: { amount: Prisma.Decimal | null };
};

export function calculateWalletBalances(groups: WalletBalanceGroup[]) {
  const sum = (predicate: (group: WalletBalanceGroup) => boolean) =>
    groups
      .filter(predicate)
      .reduce((total, group) => total.plus(group._sum.amount ?? ZERO), ZERO);
  const availableCredits = sum(
    (group) => group.direction === "credit" && group.status === "available",
  );
  const reservedDebits = sum(
    (group) =>
      group.direction === "debit" &&
      RESERVED_DEBIT_STATUSES.includes(group.status),
  );
  return {
    available: Prisma.Decimal.max(ZERO, availableCredits.minus(reservedDebits)),
    pending: sum(
      (group) => group.direction === "credit" && group.status === "pending",
    ),
    lifetimeEarnings: sum(
      (group) =>
        group.direction === "credit" &&
        group.type === "royalty_credit" &&
        !["declined", "reversed"].includes(group.status),
    ),
    lifetimeWithdrawn: sum(
      (group) =>
        group.direction === "debit" &&
        group.type === "withdrawal" &&
        group.status === "paid",
    ),
  };
}

export async function getWalletBalances(userId: string) {
  const groups = await prisma.walletTransaction.groupBy({
    by: ["direction", "status", "type"],
    where: { userId },
    _sum: { amount: true },
  });
  return calculateWalletBalances(groups);
}

export async function requestWithdrawal(input: {
  userId: string;
  amount: Prisma.Decimal;
}) {
  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          payoutMethod: true,
          payoutEmail: true,
          payoutWiseAccount: true,
          payoutBankName: true,
          payoutBankAccountNumber: true,
          payoutThreshold: true,
        },
      });
      if (!user?.payoutMethod)
        throw new Error("Set a payout method before requesting a withdrawal.");
      if (input.amount.lt(user.payoutThreshold))
        throw new Error(
          `The minimum withdrawal is USD ${user.payoutThreshold}.`,
        );
      const groups = await tx.walletTransaction.groupBy({
        by: ["direction", "status"],
        where: { userId: input.userId },
        _sum: { amount: true },
      });
      const credits = groups
        .filter(
          (group) =>
            group.direction === "credit" && group.status === "available",
        )
        .reduce((sum, group) => sum.plus(group._sum.amount ?? ZERO), ZERO);
      const debits = groups
        .filter(
          (group) =>
            group.direction === "debit" &&
            RESERVED_DEBIT_STATUSES.includes(group.status),
        )
        .reduce((sum, group) => sum.plus(group._sum.amount ?? ZERO), ZERO);
      const available = credits.minus(debits);
      if (input.amount.gt(available))
        throw new Error("Withdrawal amount exceeds your available balance.");
      const reference = `RDP-${randomBytes(5).toString("hex").toUpperCase()}`;
      const destination = describePayoutDestination(user);
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          currency: "USD",
          method: user.payoutMethod,
          destination,
          status: "pending",
          reference,
        },
      });
      await tx.walletTransaction.create({
        data: {
          userId: input.userId,
          type: "withdrawal",
          amount: input.amount,
          currency: "USD",
          direction: "debit",
          sourceType: "withdrawal",
          sourceId: withdrawal.id,
          title: `${payoutMethodLabel(user.payoutMethod)} Withdrawal`,
          description: destination,
          status: "pending",
        },
      });
      return withdrawal;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    },
  );
}
