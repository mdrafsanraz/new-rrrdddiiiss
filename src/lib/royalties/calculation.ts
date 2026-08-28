import { Prisma, type PlanId, type RoyaltyRule } from "@prisma/client";
import { prisma } from "@/lib/db";

const ZERO = new Prisma.Decimal(0);
const ONE_HUNDRED = new Prisma.Decimal(100);

export function calculateRoyaltyAmounts(input: {
  upstreamNet: Prisma.Decimal.Value;
  commissionRate?: Prisma.Decimal.Value | null;
  revenueShareRate?: Prisma.Decimal.Value | null;
  fixedAdjustment?: Prisma.Decimal.Value;
  otherDeduction?: Prisma.Decimal.Value;
  manualAdjustment?: Prisma.Decimal.Value;
}) {
  const base = new Prisma.Decimal(input.upstreamNet);
  const commissionRate = new Prisma.Decimal(input.commissionRate ?? 0);
  const revenueShareRate =
    input.revenueShareRate === null || input.revenueShareRate === undefined
      ? null
      : new Prisma.Decimal(input.revenueShareRate);
  const commission = revenueShareRate
    ? ZERO
    : base.mul(commissionRate).div(ONE_HUNDRED);
  const sharePayable = revenueShareRate
    ? base.mul(revenueShareRate).div(ONE_HUNDRED)
    : base.minus(commission);
  const adjustments = new Prisma.Decimal(input.fixedAdjustment ?? 0).plus(
    input.manualAdjustment ?? 0,
  );
  const otherDeductions = new Prisma.Decimal(input.otherDeduction ?? 0);
  return {
    commission,
    adjustments,
    otherDeductions,
    payable: sharePayable.minus(adjustments).minus(otherDeductions),
  };
}

function applicableRule(
  rules: RoyaltyRule[],
  userId: string,
  planId: PlanId,
  at: Date,
) {
  const valid = rules.filter(
    (rule) =>
      rule.active &&
      rule.effectiveFrom <= at &&
      (!rule.effectiveTo || rule.effectiveTo >= at),
  );
  return (
    valid.find((rule) => rule.scope === "user" && rule.userId === userId) ??
    valid.find((rule) => rule.scope === "plan" && rule.planId === planId) ??
    valid.find((rule) => rule.scope === "global") ??
    null
  );
}

export async function calculateRoyaltyPeriod(periodId: string) {
  const period = await prisma.royaltyPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) throw new Error("Royalty period not found.");
  if (period.status === "published")
    throw new Error("Published royalty periods are immutable.");

  const [transactions, rules, adjustments] = await Promise.all([
    prisma.royaltyTransaction.findMany({
      where: { royaltyPeriodId: periodId },
      include: { user: { select: { planId: true } } },
    }),
    prisma.royaltyRule.findMany({
      where: { active: true },
      orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
    }),
    prisma.royaltyAdjustment.findMany({ where: { royaltyPeriodId: periodId } }),
  ]);
  const transactionAdjustments = new Map<string, Prisma.Decimal>();
  for (const adjustment of adjustments) {
    if (adjustment.transactionId)
      transactionAdjustments.set(
        adjustment.transactionId,
        (transactionAdjustments.get(adjustment.transactionId) ?? ZERO).plus(
          adjustment.amount,
        ),
      );
  }

  const calculatedAt = new Date();
  const updates = transactions.map((transaction) => {
    if (
      !transaction.userId ||
      !transaction.user ||
      !["matched", "manual_match"].includes(transaction.matchStatus)
    ) {
      return {
        id: transaction.id,
        status: "excluded",
        ruleId: null,
        ruleVersion: null,
        commissionRate: null,
        revenueShareRate: null,
        commission: "0",
        adjustments: "0",
        otherDeductions: "0",
        payable: "0",
        breakdown: { reason: "unallocated" },
      };
    }
    const rule = applicableRule(
      rules,
      transaction.userId,
      transaction.user.planId,
      period.endDate,
    );
    const commissionRate = rule?.commissionRate ?? ZERO;
    const revenueShareRate = rule?.revenueShareRate ?? null;
    const amounts = calculateRoyaltyAmounts({
      upstreamNet: transaction.sourceNetRevenueUsd,
      commissionRate,
      revenueShareRate,
      fixedAdjustment: rule?.fixedAdjustment ?? ZERO,
      otherDeduction: rule?.otherDeduction ?? ZERO,
      manualAdjustment: transactionAdjustments.get(transaction.id) ?? ZERO,
    });
    return {
      id: transaction.id,
      status: "calculated",
      ruleId: rule?.id ?? null,
      ruleVersion: rule?.version ?? null,
      commissionRate: commissionRate.toString(),
      revenueShareRate: revenueShareRate?.toString() ?? null,
      commission: amounts.commission.toString(),
      adjustments: amounts.adjustments.toString(),
      otherDeductions: amounts.otherDeductions.toString(),
      payable: amounts.payable.toString(),
      breakdown: {
        basis: "source_net_revenue_usd",
        upstreamNet: transaction.sourceNetRevenueUsd.toString(),
        commissionRate: commissionRate.toString(),
        revenueShareRate: revenueShareRate?.toString() ?? null,
        commission: amounts.commission.toString(),
        fixedAndManualAdjustments: amounts.adjustments.toString(),
        otherDeductions: amounts.otherDeductions.toString(),
        payable: amounts.payable.toString(),
        ruleName: rule?.name ?? "No deduction default",
        ruleVersion: rule?.version ?? null,
      },
    };
  });

  await prisma.$transaction(
    async (tx) => {
      // One statement can contain hundreds of thousands of rows. Update calculated
      // values in bounded batches instead of issuing one database round trip per row.
      for (let offset = 0; offset < updates.length; offset += 500) {
        const values = updates
          .slice(offset, offset + 500)
          .map(
            (row) =>
              Prisma.sql`(${row.id}::text, ${row.status}::"RoyaltyCalculationStatus", ${row.ruleId}::text, ${row.ruleVersion}::integer, ${row.commissionRate}::numeric, ${row.revenueShareRate}::numeric, ${row.commission}::numeric, ${row.adjustments}::numeric, ${row.otherDeductions}::numeric, ${row.payable}::numeric, ${JSON.stringify(row.breakdown)}::jsonb)`,
          );
        await tx.$executeRaw(Prisma.sql`
          UPDATE "RoyaltyTransaction" AS transaction
          SET "calculationStatus" = calculated."status",
              "royaltyRuleId" = calculated."ruleId",
              "royaltyRuleVersion" = calculated."ruleVersion",
              "appliedCommissionRate" = calculated."commissionRate",
              "appliedRevenueShareRate" = calculated."revenueShareRate",
              "rdistroCommissionUsd" = calculated."commission",
              "rdistroAdjustmentsUsd" = calculated."adjustments",
              "rdistroOtherDeductionsUsd" = calculated."otherDeductions",
              "userPayableUsd" = calculated."payable",
              "calculationTimestamp" = ${calculatedAt},
              "calculationBreakdown" = calculated."breakdown",
              "updatedAt" = NOW()
          FROM (VALUES ${Prisma.join(values)}) AS calculated("id", "status", "ruleId", "ruleVersion", "commissionRate", "revenueShareRate", "commission", "adjustments", "otherDeductions", "payable", "breakdown")
          WHERE transaction."id" = calculated."id"
        `);
      }
      await tx.royaltyPeriod.update({
        where: { id: periodId },
        data: { status: "calculated", calculatedAt: new Date() },
      });
      await tx.royaltyImport.updateMany({
        where: { royaltyPeriodId: periodId },
        data: { status: "calculated" },
      });
    },
    { timeout: 120_000 },
  );

  return getReconciliation(periodId);
}

export async function getReconciliation(periodId: string) {
  const [totals, unallocated] = await Promise.all([
    prisma.royaltyTransaction.aggregate({
      where: { royaltyPeriodId: periodId },
      _sum: {
        sourceGrossUsd: true,
        sourceTotalLabelGridFee: true,
        sourceNetRevenueUsd: true,
        rdistroCommissionUsd: true,
        rdistroAdjustmentsUsd: true,
        rdistroOtherDeductionsUsd: true,
        userPayableUsd: true,
      },
    }),
    prisma.royaltyTransaction.aggregate({
      where: {
        royaltyPeriodId: periodId,
        matchStatus: { in: ["unmatched", "conflict", "unallocated"] },
      },
      _sum: { sourceNetRevenueUsd: true },
    }),
  ]);
  return {
    sourceGross: totals._sum.sourceGrossUsd ?? ZERO,
    sourceFees: totals._sum.sourceTotalLabelGridFee ?? ZERO,
    sourceNet: totals._sum.sourceNetRevenueUsd ?? ZERO,
    deductions: (totals._sum.rdistroCommissionUsd ?? ZERO)
      .plus(totals._sum.rdistroAdjustmentsUsd ?? ZERO)
      .plus(totals._sum.rdistroOtherDeductionsUsd ?? ZERO),
    unallocated: unallocated._sum.sourceNetRevenueUsd ?? ZERO,
    userPayable: totals._sum.userPayableUsd ?? ZERO,
  };
}

export async function publishRoyaltyPeriod(
  periodId: string,
  adminId: string,
  approveUnresolved: boolean,
) {
  const period = await prisma.royaltyPeriod.findUnique({
    where: { id: periodId },
    include: { transactions: true },
  });
  if (!period) throw new Error("Royalty period not found.");
  if (period.status === "published")
    throw new Error("This period is already published.");
  if (!period.calculatedAt)
    throw new Error("Calculate royalties before publishing.");
  const conflicts = period.transactions.filter(
    (row) => row.matchStatus === "conflict",
  );
  const unresolved = period.transactions.filter((row) =>
    ["unmatched", "unallocated"].includes(row.matchStatus),
  );
  if (conflicts.length)
    throw new Error("Resolve every ownership conflict before publishing.");
  if (unresolved.length && !approveUnresolved)
    throw new Error(
      "Unmatched revenue must be explicitly approved as unallocated.",
    );
  const reconciliation = await getReconciliation(periodId);
  // LabelGrid exports fees as signed negative values, so gross + source fees = source net.
  const upstreamDifference = reconciliation.sourceGross
    .plus(reconciliation.sourceFees)
    .minus(reconciliation.sourceNet)
    .abs();
  const allocationDifference = reconciliation.sourceNet
    .minus(reconciliation.deductions)
    .minus(reconciliation.unallocated)
    .minus(reconciliation.userPayable)
    .abs();
  const tolerance = new Prisma.Decimal("0.000001");
  if (upstreamDifference.gt(tolerance) || allocationDifference.gt(tolerance))
    throw new Error(
      `Reconciliation failed. Difference: ${Prisma.Decimal.max(upstreamDifference, allocationDifference).toString()}`,
    );

  const grouped = new Map<string, typeof period.transactions>();
  for (const row of period.transactions)
    if (row.userId && ["matched", "manual_match"].includes(row.matchStatus))
      grouped.set(row.userId, [...(grouped.get(row.userId) ?? []), row]);
  const publishedAt = new Date();
  return prisma.$transaction(
    async (tx) => {
      for (const [userId, rows] of grouped) {
        const sourceNetTotal = rows.reduce(
          (sum, row) => sum.plus(row.sourceNetRevenueUsd),
          ZERO,
        );
        const totalDeductions = rows.reduce(
          (sum, row) =>
            sum
              .plus(row.rdistroCommissionUsd)
              .plus(row.rdistroAdjustmentsUsd)
              .plus(row.rdistroOtherDeductionsUsd),
          ZERO,
        );
        const userPayableTotal = rows.reduce(
          (sum, row) => sum.plus(row.userPayableUsd),
          ZERO,
        );
        const statement = await tx.userRoyaltyStatement.create({
          data: {
            userId,
            royaltyPeriodId: periodId,
            sourceNetTotal,
            totalDeductions,
            userPayableTotal,
            transactionCount: rows.length,
            status: "pending",
            publishedAt,
          },
        });
        await tx.royaltyTransaction.updateMany({
          where: { id: { in: rows.map((row) => row.id) } },
          data: { userStatementId: statement.id },
        });
      }
      await tx.royaltyPeriod.update({
        where: { id: periodId },
        data: {
          status: "published",
          publishedAt,
          publishedById: adminId,
          unresolvedApprovedAt: unresolved.length ? publishedAt : null,
          unresolvedApprovedBy: unresolved.length ? adminId : null,
        },
      });
      await tx.royaltyImport.updateMany({
        where: { royaltyPeriodId: periodId },
        data: { status: "published" },
      });
      return { statements: grouped.size, publishedAt };
    },
    { timeout: 60_000 },
  );
}
