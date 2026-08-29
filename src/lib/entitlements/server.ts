import { prisma } from "@/lib/db";
import { buildUsageSnapshot } from "@/lib/entitlements";
import type { PlanId } from "@prisma/client";
import { getConfiguredPlan } from "@/lib/plans";

/** Free-plan release quota: only genuinely submitted releases this month. */
export async function getUserUsage(userId: string, planId: PlanId) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const [artistsUsed, releasesSubmittedThisMonth, totalReleases, totalTracks, limits] =
    await Promise.all([
      prisma.artist.count({ where: { userId } }),
      prisma.release.count({
        where: {
          userId,
          submittedAt: { gte: start },
        },
      }),
      prisma.release.count({ where: { userId } }),
      prisma.track.count({ where: { userId } }),
      getConfiguredPlan(planId),
    ]);

  return {
    ...buildUsageSnapshot(planId, artistsUsed, releasesSubmittedThisMonth, limits),
    totalReleases,
    totalTracks,
  };
}

export async function assertCanCreateArtist(userId: string, planId: PlanId) {
  const usage = await getUserUsage(userId, planId);
  if (!usage.canCreateArtist) {
    throw new Error(
      `Artist limit reached (${usage.artistsUsed}/${usage.artistsLimit}). Upgrade your plan to add more artists.`
    );
  }
  return usage;
}

/** Draft creation is always allowed; submission is gated separately. */
export async function assertCanSubmitRelease(userId: string, planId: PlanId) {
  const usage = await getUserUsage(userId, planId);
  if (!usage.canCreateRelease) {
    throw new Error(
      `Monthly submission limit reached (${usage.releasesThisMonth}/${usage.releasesLimit}). Upgrade to submit more.`
    );
  }
  return usage;
}
