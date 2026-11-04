import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";
import { syncReleaseQualityReport } from "@/lib/labelgrid/quality-report";
import { hasPermission } from "@/lib/auth/permissions";

type Params = { params: Promise<{ id: string }> };

/** Refresh release status and the current provider QC report (no analysis request). */
export async function POST(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const release = await prisma.release.findUnique({ where: { id } });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!release.labelgridId) {
    return NextResponse.json(
      { error: "Release has no LabelGrid id yet." },
      { status: 400 }
    );
  }

  const [result, qc] = await Promise.all([
    reconcileLabelGridReleaseStatus(id, {
      deep: true,
      forceLog: true,
      actorUserId: gate.admin.id,
    }),
    hasPermission(gate.admin.role, "releases.qc")
      ? syncReleaseQualityReport(id)
      : Promise.resolve(null),
  ]);

  const fresh = await prisma.release.findUnique({
    where: { id },
    include: { reviewIssues: true },
  });

  return NextResponse.json({ result, qc: qc ? { ok: qc.ok, error: qc.error } : null, release: fresh });
}
