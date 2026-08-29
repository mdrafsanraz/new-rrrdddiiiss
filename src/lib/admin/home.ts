import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRateLimit } from "@/lib/labelgrid";
import { getLabelGridToken } from "@/lib/labelgrid/config";
import { calculateWalletBalances } from "@/lib/wallet";

export type HealthState = "operational" | "degraded" | "down" | "unknown";

const DRAFT = ["draft", "incomplete", "ready_to_submit"] as const;
const RDISTRO_REVIEW = ["pending_internal_review", "submitted", "in_review"] as const;
const CHANGES_REQUIRED = [
  "internal_changes_required",
  "changes_required",
  "labelgrid_changes_required",
] as const;
const LABELGRID_REVIEW = [
  "internal_approved",
  "submitting_to_labelgrid",
  "syncing",
  "approved",
  "labelgrid_in_review",
] as const;

export async function getAdminHomeSnapshot() {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [
    usersTotal,
    activeArtists,
    releasesTotal,
    tracksTotal,
    draftReleases,
    pendingReview,
    changesRequired,
    approvedReleases,
    deliveringLive,
    takedownRequests,
    openSupport,
    pendingWithdrawals,
    qcFlagged,
    docsPending,
    syncFailures,
    submittedTotal,
    labelgridReview,
    delivering,
    liveCount,
    recentUsers,
    recentReleases,
    recentAdminActivity,
    recentWebhooks,
    walletGroups,
    currentRoyaltyPeriod,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count({
      where: {
        releases: { some: {} },
        user: { suspended: false, terminated: false },
      },
    }),
    prisma.release.count(),
    prisma.track.count(),
    prisma.release.count({ where: { status: { in: [...DRAFT] } } }),
    prisma.release.count({ where: { status: { in: [...RDISTRO_REVIEW] } } }),
    prisma.release.count({ where: { status: { in: [...CHANGES_REQUIRED] } } }),
    prisma.release.count({ where: { status: "labelgrid_approved" } }),
    prisma.release.count({ where: { status: { in: ["delivering", "live"] } } }),
    prisma.takedownRequest.count({
      where: { status: { in: ["requested", "submitted", "processing"] } },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "in_progress"] } },
    }),
    prisma.withdrawal.count({
      where: { status: { in: ["pending", "processing"] } },
    }),
    prisma.release.count({
      where: {
        OR: [
          { qcStatus: { in: ["warning", "review_required", "failed"] } },
          { reviewIssues: { some: { source: "LABELGRID", resolved: false } } },
        ],
      },
    }),
    prisma.releaseDocument.count({ where: { reviewStatus: "pending" } }),
    prisma.release.count({ where: { status: { in: ["sync_error", "error"] } } }),
    prisma.release.count({ where: { submittedAt: { not: null } } }),
    prisma.release.count({ where: { status: { in: [...LABELGRID_REVIEW] } } }),
    prisma.release.count({ where: { status: "delivering" } }),
    prisma.release.count({ where: { status: "live" } }),
    prisma.user.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        planId: true,
        createdAt: true,
        _count: { select: { artists: true, releases: true } },
      },
    }),
    prisma.release.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        contentType: true,
        artworkUrl: true,
        labelgridId: true,
        createdAt: true,
        artist: { select: { name: true } },
        user: { select: { name: true, email: true } },
        _count: { select: { tracks: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.providerWebhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { createdAt: true, processed: true, error: true },
    }),
    prisma.walletTransaction.groupBy({
      by: ["direction", "status", "type"],
      _sum: { amount: true },
    }),
    prisma.royaltyPeriod.findFirst({
      where: {
        startDate: { lt: startOfNextMonth },
        endDate: { gte: startOfMonth },
      },
      orderBy: { startDate: "desc" },
      include: {
        imports: { select: { totalSourceNet: true } },
        _count: { select: { transactions: true, statements: true } },
      },
    }),
  ]);

  const wallet = calculateWalletBalances(walletGroups);
  const royaltyAggregate = currentRoyaltyPeriod
    ? await prisma.royaltyTransaction.aggregate({
        where: { royaltyPeriodId: currentRoyaltyPeriod.id },
        _sum: { userPayableUsd: true },
      })
    : null;
  const health = await probePlatformHealth(recentWebhooks[0] ?? null);

  return {
    summary: {
      usersTotal,
      activeArtists,
      releasesTotal,
      tracksTotal,
      draftReleases,
      pendingReview,
      changesRequired,
      approvedReleases,
      deliveringLive,
      takedownRequests,
      openSupport,
      pendingWithdrawals,
      availableRoyalties: wallet.available.toString(),
      qcFlagged,
      docsPending,
      syncFailures,
    },
    pipeline: [
      { key: "submitted", label: "Submitted", count: submittedTotal, href: "/admin/releases?filter=all", note: "All time" },
      { key: "rdistro_review", label: "RDISTRO Review", count: pendingReview, href: "/admin/releases?filter=pending_review", note: "Current" },
      { key: "labelgrid_review", label: "LabelGrid Review", count: labelgridReview, href: "/admin/releases?filter=labelgrid_review", note: "Current" },
      { key: "delivering", label: "Delivering", count: delivering, href: "/admin/releases?filter=delivering", note: "Current" },
      { key: "live", label: "Live", count: liveCount, href: "/admin/releases?filter=live", note: "Current" },
    ],
    royaltyMonth: currentRoyaltyPeriod
      ? {
          id: currentRoyaltyPeriod.id,
          period: currentRoyaltyPeriod.period,
          status: currentRoyaltyPeriod.status,
          sourceNet: currentRoyaltyPeriod.imports
            .reduce(
              (total, item) => total.plus(item.totalSourceNet),
              new Prisma.Decimal(0)
            )
            .toString(),
          payable: (royaltyAggregate?._sum.userPayableUsd ?? new Prisma.Decimal(0)).toString(),
          transactions: currentRoyaltyPeriod._count.transactions,
          statements: currentRoyaltyPeriod._count.statements,
        }
      : null,
    recentUsers,
    recentReleases,
    recentAdminActivity,
    health,
  };
}

async function probePlatformHealth(
  lastWebhook: { createdAt: Date; processed: boolean; error: string | null } | null
) {
  const configured = Boolean(getLabelGridToken());
  let labelgrid: HealthState = "unknown";

  if (configured) {
    try {
      await getRateLimit();
      labelgrid = "operational";
    } catch {
      labelgrid = "degraded";
    }
  }

  const webhooks: HealthState = !lastWebhook
    ? "unknown"
    : lastWebhook.error || !lastWebhook.processed
      ? "degraded"
      : "operational";

  return {
    rdistroApi: "operational" as HealthState,
    labelgrid,
    webhooks,
    lastWebhookAt: lastWebhook?.createdAt ?? null,
    lastSyncedReleaseAt: await prisma.release
      .findFirst({
        where: { lastSyncedAt: { not: null } },
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      })
      .then((release) => release?.lastSyncedAt ?? null),
  };
}
