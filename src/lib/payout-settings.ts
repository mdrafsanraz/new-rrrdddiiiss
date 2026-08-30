import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PAYOUT_METHODS = ["wise", "paypal", "payoneer", "bank_transfer"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export type PayoutPolicy = {
  currency: string;
  availabilityRules: string;
  methods: Record<PayoutMethod, {
    enabled: boolean;
    minimum: string;
    fixedFee: string;
    percentageFee: string;
    instructions: string;
    processingText: string;
  }>;
};

const DEFAULT_METHOD = {
  enabled: false,
  minimum: "50",
  fixedFee: "0",
  percentageFee: "0",
  instructions: "",
  processingText: "",
};

export const DEFAULT_PAYOUT_POLICY: PayoutPolicy = {
  currency: "USD",
  availabilityRules: "Available royalty earnings may be withdrawn after they clear.",
  methods: {
    wise: { ...DEFAULT_METHOD, enabled: true },
    paypal: { ...DEFAULT_METHOD, enabled: true },
    payoneer: { ...DEFAULT_METHOD },
    bank_transfer: { ...DEFAULT_METHOD, enabled: true },
  },
};

export async function getPayoutPolicy(): Promise<PayoutPolicy> {
  const [global, rows] = await Promise.all([
    prisma.payoutConfiguration.findUnique({ where: { id: "default" } }),
    prisma.payoutMethodConfiguration.findMany({ where: { method: { in: [...PAYOUT_METHODS] } } }),
  ]);
  const methods = structuredClone(DEFAULT_PAYOUT_POLICY.methods);
  for (const row of rows) {
    if (!PAYOUT_METHODS.includes(row.method as PayoutMethod)) continue;
    methods[row.method as PayoutMethod] = {
      enabled: row.enabled,
      minimum: row.minimum.toString(),
      fixedFee: row.fixedFee.toString(),
      percentageFee: row.percentageFee.toString(),
      instructions: row.instructions ?? "",
      processingText: row.processingText ?? "",
    };
  }
  return { currency: global?.currency ?? DEFAULT_PAYOUT_POLICY.currency, availabilityRules: global?.availabilityRules ?? DEFAULT_PAYOUT_POLICY.availabilityRules, methods };
}

export function payoutFee(amount: Prisma.Decimal, policy: PayoutPolicy["methods"][PayoutMethod]) {
  return new Prisma.Decimal(policy.fixedFee).plus(amount.mul(new Prisma.Decimal(policy.percentageFee)).div(100));
}
