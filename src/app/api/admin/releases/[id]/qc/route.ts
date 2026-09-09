import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import {
  requestQualityReportRefresh,
  syncReleaseQualityReport,
} from "@/lib/labelgrid/quality-report";
import { writeAuditLog } from "@/lib/admin/audit";
import { logReleaseActivity } from "@/lib/releases/activity";
import { prisma } from "@/lib/db";
import { confirmReleaseReview } from "@/lib/labelgrid";
import { LabelGridApiError, labelGridApiErrorMessage } from "@/lib/labelgrid/client";
import { qcConfirmationError } from "@/lib/labelgrid/qc-state";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";

const schema = z.object({
  action: z.enum(["sync", "refresh", "confirm"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.qc");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json());

    if (body.action === "confirm") {
      const moderation = await requirePermissionApi("releases.moderate");
      if ("error" in moderation) return NextResponse.json({ error: moderation.error }, { status: moderation.status });
      const release = await prisma.release.findUnique({ where: { id }, select: { labelgridId: true, permanentlyLocked: true } });
      if (!release?.labelgridId || release.permanentlyLocked) return NextResponse.json({ error: "Release is unavailable or locked." }, { status: 409 });
      // Always check a fresh provider report, not the browser/cache snapshot.
      const current = await syncReleaseQualityReport(id);
      if (!current.ok || !current.report) return NextResponse.json({ error: current.error ?? "QC report unavailable" }, { status: 502 });
      const error = qcConfirmationError(current.report);
      if (error) return NextResponse.json({ error }, { status: 409 });
      await confirmReleaseReview(release.labelgridId);
      await reconcileLabelGridReleaseStatus(id, { deep: false });
      const updated = await syncReleaseQualityReport(id);
      await logReleaseActivity({ releaseId: id, type: "labelgrid_in_review", title: "Preflight QC confirmed into LabelGrid review", actorUserId: gate.admin.id });
      await writeAuditLog({ actorUserId: gate.admin.id, action: "release_approved", targetType: "release", targetId: id, summary: "Confirmed Preflight QC into LabelGrid review" });
      return NextResponse.json({ ok: true, report: updated.report ?? null });
    }

    if (body.action === "refresh") {
      const result = await requestQualityReportRefresh(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      await logReleaseActivity({
        releaseId: id,
        type: "qc_refreshed",
        title: "Preflight QC refresh requested",
        actorUserId: gate.admin.id,
      });
      return NextResponse.json({ ok: true });
    }

    const result = await syncReleaseQualityReport(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "labelgrid_sync",
      targetType: "release",
      targetId: id,
      summary: "Fetched Preflight QC report",
      metadata: { qcStatus: result.report?.status },
    });

    return NextResponse.json({ ok: true, report: result.report });
  } catch (error) {
    if (error instanceof LabelGridApiError) return NextResponse.json({ error: labelGridApiErrorMessage(error) }, { status: error.status >= 400 && error.status < 500 ? error.status : 502 });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/releases/qc]", error);
    return NextResponse.json({ error: "QC request failed" }, { status: 500 });
  }
}
