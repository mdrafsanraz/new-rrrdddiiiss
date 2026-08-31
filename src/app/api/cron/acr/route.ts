import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runReleaseAcrScan } from "@/lib/acrcloud/release-scan";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 1;
const LEASE_MS = 10 * 60 * 1000;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

async function processDueScans(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.release.findMany({
    where: {
      acrStatus: { in: ["pending", "running"] },
      acrScheduledAt: { lte: now },
    },
    orderBy: { acrScheduledAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  });

  const results: Array<{ releaseId: string; ok: boolean; error?: string }> = [];
  for (const release of due) {
    const claimed = await prisma.release.updateMany({
      where: {
        id: release.id,
        acrStatus: { in: ["pending", "running"] },
        acrScheduledAt: { lte: now },
      },
      data: { acrScheduledAt: new Date(Date.now() + LEASE_MS) },
    });
    if (claimed.count === 0) continue;

    try {
      await runReleaseAcrScan({
        releaseId: release.id,
        source: "submission",
      });
      results.push({ releaseId: release.id, ok: true });
    } catch (error) {
      results.push({
        releaseId: release.id,
        ok: false,
        error: error instanceof Error ? error.message : "ACR scan failed",
      });
    }
  }

  return NextResponse.json({ checked: due.length, processed: results.length, results });
}

export async function GET(request: Request) {
  return processDueScans(request);
}

export async function POST(request: Request) {
  return processDueScans(request);
}
