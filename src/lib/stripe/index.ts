import Stripe from "stripe";
import type { PlanId } from "@prisma/client";
import { getConfiguredPlan, getPlanCatalog } from "@/lib/plans";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Map RDISTRO plan → Stripe Price ID (env-driven). */
export async function priceIdForPlan(planId: PlanId): Promise<string | null> {
  return (await getConfiguredPlan(planId)).stripePriceId;
}

export async function planIdFromPriceId(priceId: string | null | undefined): Promise<PlanId> {
  if (!priceId) return "free";
  return (await getPlanCatalog()).find((plan) => plan.stripePriceId === priceId)?.id ?? "free";
}

export function appUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
