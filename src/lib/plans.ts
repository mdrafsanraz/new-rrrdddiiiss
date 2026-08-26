import type { PlanId } from "@prisma/client";
import { plans } from "@/lib/site";

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
    analytics: false,
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
