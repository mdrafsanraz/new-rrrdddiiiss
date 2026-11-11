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
import { withdrawalSchema, withdrawalStatuses, withdrawalStatusUpdate } from "@/lib/releases/withdraw-review";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("releases.moderate");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  let body: unknown;
  try { const text = await request.text(); body = text.trim() ? JSON.parse(text) : {}; }
  catch { return NextResponse.json({ error: "Invalid withdrawal request." }, { status: 400 }); }
  const parsed = withdrawalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid RDISTRO status." }, { status: 400 });
  const destination = parsed.data.status;
  const destinationLabel = withdrawalStatuses.find(option => option.value === destination)!.label;
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
          ...withdrawalStatusUpdate(destination), labelgridReviewStatus: "draft", syncError: null,
          holdReason: null, heldAt: null, heldById: null,
          reviewedAt: new Date(), reviewedById: gate.admin.id,
        } });
        await tx.releaseReviewIssue.updateMany({ where: { releaseId: id, resolved: false },
          data: { resolved: true, resolvedAt: new Date(), status: "withdrawn" } });
      });
      await logReleaseActivity({ releaseId: id, actorUserId: gate.admin.id,
        type: "edited", title: "Withdrawn from LabelGrid review",
        description: `Withdrawn from LabelGrid review. RDISTRO status set to ${destinationLabel}; artwork and audio were retained.` });
      await writeAuditLog({ actorUserId: gate.admin.id, action: "labelgrid_sync",
        metadata: { operation: "withdraw_review", labelgridId: release.labelgridId, previousStatus: release.status, nextStatus: withdrawalStatusUpdate(destination).status },
        targetType: "release", targetId: id, summary: `Withdrew ${release.title} from LabelGrid review` });
      return NextResponse.json({ ok: true, status: withdrawalStatusUpdate(destination).status });
    });
    return outcome.ok ? outcome.result : NextResponse.json({ error: "Another release operation is in progress. Please retry." }, { status: 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof LabelGridApiError
      ? labelGridApiErrorMessage(error) : error instanceof Error ? error.message : "Withdrawal failed." },
    { status: error instanceof LabelGridApiError && error.status === 409 ? 409 : 502 });
  }
}
