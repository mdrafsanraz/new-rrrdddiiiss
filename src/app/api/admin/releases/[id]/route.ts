import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { deleteRelease as deleteLabelGridRelease } from "@/lib/labelgrid";
import { prisma } from "@/lib/db";
import { canAdminDeleteRelease } from "@/lib/releases/status";

type Params = { params: Promise<{ id: string }> };

/** Permanently delete a release from RDISTRO (and best-effort on LabelGrid). */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.moderate");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  const release = await prisma.release.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      labelgridId: true,
      userId: true,
    },
  });
  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  if (!canAdminDeleteRelease(release.status)) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a release that is live or delivering. Request a takedown first.",
      },
      { status: 400 }
    );
  }

  if (release.labelgridId && isLabelGridLive()) {
    try {
      await deleteLabelGridRelease(release.labelgridId);
    } catch (error) {
      console.warn("[admin/releases/delete] LabelGrid delete failed", error);
      // Continue — local delete is primary for ops cleanup.
    }
  }

  await prisma.release.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: gate.admin.id,
    action: "other",
    targetType: "release",
    targetId: id,
    summary: `Deleted release ${release.title}`,
    metadata: {
      kind: "release_deleted",
      userId: release.userId,
      labelgridId: release.labelgridId,
    },
  });

  return NextResponse.json({ ok: true, deletedId: id });
}
