import type { PlanId } from "@prisma/client";
import { planLimits, type PlanLimits } from "@/lib/plans";

export type UsageSnapshot = {
  planId: PlanId;
  limits: PlanLimits;
  artistsUsed: number;
  artistsLimit: number | null;
  artistsRemaining: number | null;
  canCreateArtist: boolean;
  releasesThisMonth: number;
  releasesLimit: number | null;
  releasesRemaining: number | null;
  canCreateRelease: boolean;
};

export function getArtistUsage(planId: PlanId, artistsUsed: number) {
  const limit = planLimits[planId].artists;
  const remaining = limit === null ? null : Math.max(0, limit - artistsUsed);
  return {
    used: artistsUsed,
    limit,
    remaining,
    canCreate: limit === null ? true : artistsUsed < limit,
  };
}

export function getReleaseUsage(planId: PlanId, releasesThisMonth: number) {
  const limit = planLimits[planId].releasesPerMonth;
  const remaining =
    limit === null ? null : Math.max(0, limit - releasesThisMonth);
  return {
    used: releasesThisMonth,
    limit,
    remaining,
    canCreate: limit === null ? true : releasesThisMonth < limit,
  };
}

export function buildUsageSnapshot(
  planId: PlanId,
  artistsUsed: number,
  releasesThisMonth: number
): UsageSnapshot {
  const artists = getArtistUsage(planId, artistsUsed);
  const releases = getReleaseUsage(planId, releasesThisMonth);
  return {
    planId,
    limits: planLimits[planId],
    artistsUsed: artists.used,
    artistsLimit: artists.limit,
    artistsRemaining: artists.remaining,
    canCreateArtist: artists.canCreate,
    releasesThisMonth: releases.used,
    releasesLimit: releases.limit,
    releasesRemaining: releases.remaining,
    canCreateRelease: releases.canCreate,
  };
}

export { canCreateArtist, canCreateRelease } from "@/lib/plans";
