import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getRelease } from "@/lib/labelgrid";
import { unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import type { ReleaseData } from "@/lib/labelgrid/types";
import { submitLabelGridDraftForReview } from "@/lib/labelgrid/sync-submit";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";
import { syncReleaseQualityReport } from "@/lib/labelgrid/quality-report";
import { withSubmissionLock } from "@/lib/releases/submission-lock";
import { validateReleaseForSubmit } from "@/lib/releases/submit-validate";
import { canAdminResubmitMetadata, metadataResubmitError } from "@/lib/releases/admin-resubmit";
import { logReleaseActivity } from "@/lib/releases/activity";
import { writeAuditLog } from "@/lib/admin/audit";
import { LabelGridApiError, labelGridApiErrorMessage } from "@/lib/labelgrid/client";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("releases.moderate");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  try {
    if (!await prisma.release.findUnique({ where: { id }, select: { id: true } })) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const outcome = await withSubmissionLock(id, async () => {
      const release = await prisma.release.findUniqueOrThrow({ where: { id }, include: { artist: true, tracks: { orderBy: { trackNumber: "asc" } } } });
      if (!canAdminResubmitMetadata(release.status, release.permanentlyLocked, Boolean(release.labelgridId))) return NextResponse.json({ error: "This release is not eligible for metadata resubmission." }, { status: 409 });
      const remote = unwrapLabelGridData<ReleaseData>(await getRelease(release.labelgridId!));
      const stateError = metadataResubmitError(remote.review_status, remote.delivery_status);
      if (stateError) return NextResponse.json({ error: stateError }, { status: 409 });
      const errors = validateReleaseForSubmit(release);
      if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });
      const missingDocuments = await prisma.releaseReviewIssue.count({ where: { releaseId: id, resolved: false, requiresDocument: true, documents: { none: {} } } });
      if (missingDocuments) return NextResponse.json({ error: "Upload the requested documents before resubmitting." }, { status: 409 });
      const result = await submitLabelGridDraftForReview({ release, artwork: null, audios: [] });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
      await prisma.release.update({ where: { id }, data: { status: "submitting_to_labelgrid", syncError: null, reviewedAt: new Date(), reviewedById: gate.admin.id } });
      await logReleaseActivity({ releaseId: id, actorUserId: gate.admin.id, type: "submitting_labelgrid", title: "Updated metadata resubmitted to LabelGrid" });
      await writeAuditLog({ actorUserId: gate.admin.id, action: "labelgrid_sync", targetType: "release", targetId: id, summary: "Resubmitted saved release metadata", metadata: { operation: "metadata_resubmit", labelgridId: release.labelgridId } });
      // Submission already succeeded; a follow-up read failure must not invite a duplicate submit.
      try {
        await reconcileLabelGridReleaseStatus(id, { deep: false });
        await syncReleaseQualityReport(id);
      } catch (error) { console.error("[admin/resubmit] status refresh failed", id, error); }
      return NextResponse.json({ ok: true });
    });
    return outcome.ok ? outcome.result : NextResponse.json({ error: "Another operation is in progress. Retry shortly." }, { status: 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof LabelGridApiError ? labelGridApiErrorMessage(error) : "Could not resubmit. Refresh release data before retrying." }, { status: 502 });
  }
}
