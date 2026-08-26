import Stripe from "stripe";
import type { PlanId } from "@prisma/client";

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
export function priceIdForPlan(planId: PlanId): string | null {
  if (planId === "starter") {
    return process.env.STRIPE_PRICE_STARTER?.trim() || null;
  }
  if (planId === "pro") {
    return process.env.STRIPE_PRICE_PRO?.trim() || null;
  }
  return null;
}

export function planIdFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

export function appUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
