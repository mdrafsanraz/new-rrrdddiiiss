import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { withdrawReleaseFromReview } from "@/lib/labelgrid";
import { unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import { LabelGridApiError, labelGridApiErrorMessage } from "@/lib/labelgrid/client";
import type { ReleaseData } from "@/lib/labelgrid/types";
import { withSubmissionLock } from "@/lib/releases/submission-lock";
import { logReleaseActivity } from "@/lib/releases/activity";
import { writeAuditLog } from "@/lib/admin/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("releases.moderate");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  try {
    if (!await prisma.release.findUnique({ where: { id }, select: { id: true } })) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }
    const outcome = await withSubmissionLock(id, async () => {
      const release = await prisma.release.findUnique({ where: { id } });
      if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
      if (release.permanentlyLocked || !release.labelgridId || release.status !== "labelgrid_in_review") {
        return NextResponse.json({ error: "Only releases awaiting LabelGrid review can be withdrawn." }, { status: 409 });
      }
      // document.json: POST /releases/{release}/withdraw-review returns ReleaseData.
      // Provider withdrawal must succeed before changing any local state.
      const remote = unwrapLabelGridData<ReleaseData>(await withdrawReleaseFromReview(release.labelgridId));
      if (String(remote.id) !== release.labelgridId || remote.review_status !== "draft") {
        throw new Error("LabelGrid did not confirm withdrawal to draft. Refresh release data before retrying.");
      }
      await prisma.$transaction(async (tx) => {
        await tx.release.update({ where: { id }, data: {
          // Keep RDISTRO's approval; only the provider returns to draft.
          // internal_approved is shown to users as In Review and permits admin resubmission.
          status: "internal_approved", labelgridReviewStatus: "draft", syncError: null,
          holdReason: null, heldAt: null, heldById: null,
          reviewedAt: new Date(), reviewedById: gate.admin.id,
          reviewNotes: "RDISTRO is preparing this release for resubmission. Your release remains in review.",
        } });
        await tx.releaseReviewIssue.updateMany({ where: { releaseId: id, resolved: false },
          data: { resolved: true, resolvedAt: new Date(), status: "withdrawn" } });
      });
      await logReleaseActivity({ releaseId: id, actorUserId: gate.admin.id,
        type: "edited", title: "Withdrawn from LabelGrid review",
        description: "Withdrawn from LabelGrid for admin resubmission. The release remains in RDISTRO review; artwork and audio were retained." });
      await writeAuditLog({ actorUserId: gate.admin.id, action: "labelgrid_sync",
        metadata: { operation: "withdraw_review", labelgridId: release.labelgridId },
        targetType: "release", targetId: id, summary: `Withdrew ${release.title} from LabelGrid review` });
      return NextResponse.json({ ok: true });
    });
    return outcome.ok ? outcome.result : NextResponse.json({ error: "Another release operation is in progress. Please retry." }, { status: 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof LabelGridApiError
      ? labelGridApiErrorMessage(error) : error instanceof Error ? error.message : "Withdrawal failed." },
    { status: error instanceof LabelGridApiError && error.status === 409 ? 409 : 502 });
  }
}
