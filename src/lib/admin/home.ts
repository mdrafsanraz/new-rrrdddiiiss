import { prisma } from "@/lib/db";
import { getRateLimit } from "@/lib/labelgrid";
import { getLabelGridToken } from "@/lib/labelgrid/config";
import { PIPELINE_STAGES } from "@/lib/admin/release-filters";

export type HealthState = "operational" | "degraded" | "down" | "unknown";

export async function getAdminHomeSnapshot() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    usersTotal,
    usersToday,
    releasesTotal,
    submittedToday,
    pendingReview,
    changesRequired,
    qcFlagged,
    liveCount,
    openSupport,
    docsPending,
    syncFailures,
    pipelineCounts,
    recentActivities,
    recentWebhooks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.release.count(),
    prisma.release.count({ where: { submittedAt: { gte: startOfDay } } }),
    prisma.release.count({
      where: {
        status: {
          in: ["pending_internal_review", "submitted", "in_review"],
        },
      },
    }),
    prisma.release.count({
      where: {
        status: {
          in: [
            "internal_changes_required",
            "changes_required",
            "labelgrid_changes_required",
          ],
        },
      },
    }),
    prisma.release.count({
      where: {
        OR: [
          { qcStatus: { in: ["warning", "review_required", "failed"] } },
          {
            reviewIssues: {
              some: { source: "LABELGRID", resolved: false },
            },
          },
        ],
      },
    }),
    prisma.release.count({ where: { status: "live" } }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "in_progress"] } },
    }),
    prisma.releaseDocument.count({ where: { reviewStatus: "pending" } }),
    prisma.release.count({
      where: { status: { in: ["sync_error", "error"] } },
    }),
    Promise.all(
      PIPELINE_STAGES.map(async (stage) => ({
        key: stage.key,
        label: stage.label,
        href: stage.href,
        count: await prisma.release.count({
          where: { status: { in: [...stage.statuses] } },
        }),
      }))
    ),
    prisma.releaseActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        release: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.providerWebhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { createdAt: true, processed: true, error: true },
    }),
  ]);

  const health = await probePlatformHealth(recentWebhooks[0] ?? null);

  return {
    summary: {
      usersTotal,
      usersToday,
      releasesTotal,
      submittedToday,
      pendingReview,
      changesRequired,
      qcFlagged,
      liveCount,
      openSupport,
      docsPending,
      syncFailures,
    },
    pipeline: pipelineCounts,
    activities: recentActivities,
    health,
  };
}

async function probePlatformHealth(
  lastWebhook: {
    createdAt: Date;
    processed: boolean;
    error: string | null;
  } | null
) {
  const configured = Boolean(getLabelGridToken());
  let labelgrid: HealthState = "unknown";
  let rateLimitDetail: string | null = null;

  if (configured) {
    try {
      await getRateLimit();
      labelgrid = "operational";
      rateLimitDetail = "Rate-limit endpoint reachable";
    } catch {
      labelgrid = "degraded";
      rateLimitDetail = "Rate-limit probe failed";
    }
  }

  const webhook: HealthState = !lastWebhook
    ? "unknown"
    : lastWebhook.error
      ? "degraded"
      : "operational";

  const stripe: HealthState = process.env.STRIPE_SECRET_KEY
    ? "unknown"
    : "unknown";

  return {
    rdistroApi: "operational" as HealthState,
    labelgrid,
    labelgridSandbox: configured ? labelgrid : ("unknown" as HealthState),
    webhooks: webhook,
    stripe,
    backgroundJobs: "unknown" as HealthState,
    lastWebhookAt: lastWebhook?.createdAt ?? null,
    rateLimitDetail,
    lastSyncedReleaseAt: await prisma.release
      .findFirst({
        where: { lastSyncedAt: { not: null } },
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      })
      .then((r) => r?.lastSyncedAt ?? null),
  };
}
