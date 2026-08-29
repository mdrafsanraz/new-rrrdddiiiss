import type { PlanId } from "@prisma/client";
import { plans } from "@/lib/site";
import { prisma } from "@/lib/db";

/** null = unlimited */
export type PlanLimits = {
  artists: number | null;
  releasesPerMonth: number | null;
  royaltyKeepPercent: number;
  analytics: boolean;
  priorityReview: boolean;
};

export const planLimits: Record<PlanId, PlanLimits> = {
  free: {
    artists: 1,
    releasesPerMonth: 5,
    royaltyKeepPercent: 90,
    analytics: false,
    priorityReview: false,
  },
  starter: {
    artists: 1,
    releasesPerMonth: null,
    royaltyKeepPercent: 100,
    analytics: true,
    priorityReview: false,
  },
  pro: {
    artists: 3,
    releasesPerMonth: null,
    royaltyKeepPercent: 100,
    analytics: true,
    priorityReview: true,
  },
};

export type ConfiguredPlan = PlanLimits & { id: PlanId; name: string; price: string; billingInterval: string; features: string[]; active: boolean; hidden: boolean; stripePriceId: string | null };

const fallbackCatalog: Record<PlanId, ConfiguredPlan> = Object.fromEntries(plans.map((plan) => [plan.id, { id: plan.id, name: plan.name, price: String(plan.amount), billingInterval: plan.period === "forever" ? "forever" : "year", features: [...plan.features], active: true, hidden: false, stripePriceId: plan.id === "starter" ? process.env.STRIPE_PRICE_STARTER?.trim() || null : plan.id === "pro" ? process.env.STRIPE_PRICE_PRO?.trim() || null : null, ...planLimits[plan.id] }])) as Record<PlanId, ConfiguredPlan>;

export async function getPlanCatalog(): Promise<ConfiguredPlan[]> {
  const rows = await prisma.planConfiguration.findMany();
  const byId = new Map(rows.map((row) => [row.planId, row]));
  return (["free", "starter", "pro"] as PlanId[]).map((id) => {
    const row = byId.get(id); if (!row) return fallbackCatalog[id];
    let features: string[] = []; try { const parsed = JSON.parse(row.featuresJson); if (Array.isArray(parsed)) features = parsed.filter((item): item is string => typeof item === "string"); } catch {}
    return { id, name: row.name, price: row.price.toString(), billingInterval: row.billingInterval, artists: row.artistLimit, releasesPerMonth: row.monthlyReleaseLimit, royaltyKeepPercent: 100 - Number(row.royaltyCommissionPercent), analytics: row.analytics, priorityReview: row.priorityReview, features, active: row.active, hidden: row.hidden, stripePriceId: row.stripePriceId };
  });
}

export async function getConfiguredPlan(planId: PlanId) { return (await getPlanCatalog()).find((plan) => plan.id === planId) ?? fallbackCatalog.free; }

export function getPlanLimits(planId: PlanId): PlanLimits {
  return planLimits[planId];
}

export function formatLimit(value: number | null) {
  return value === null ? "Unlimited" : String(value);
}

export function usagePercent(used: number, limit: number | null) {
  if (limit === null || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function canCreateArtist(planId: PlanId, artistCount: number) {
  const limit = planLimits[planId].artists;
  if (limit === null) return true;
  return artistCount < limit;
}

export function canCreateRelease(planId: PlanId, releasesThisMonth: number) {
  const limit = planLimits[planId].releasesPerMonth;
  if (limit === null) return true;
  return releasesThisMonth < limit;
}

export function planLabel(planId: PlanId) {
  return plans.find((p) => p.id === planId)?.name ?? "Free";
}
