import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * User resubmits after changes_required.
 * Re-enters RDISTRO admin review (LabelGrid stays draft until admin approves again).
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (release.permanentlyLocked || release.status === "rejected") {
    return NextResponse.json(
      {
        error:
          "This release was permanently rejected and cannot be resubmitted.",
      },
      { status: 403 }
    );
  }

  if (release.status !== "changes_required") {
    return NextResponse.json(
      {
        error:
          "Only releases marked “changes required” can be resubmitted for review.",
      },
      { status: 400 }
    );
  }

  const fresh = await prisma.release.update({
    where: { id },
    data: {
      status: "in_review",
      submittedAt: new Date(),
      // Keep prior notes so admin sees history; user may add context later.
      syncError: null,
    },
    include: { tracks: true, artist: true },
  });

  return NextResponse.json({ release: fresh });
}
