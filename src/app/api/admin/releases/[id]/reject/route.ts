import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

const schema = z.object({
  notes: z.string().min(1).max(2000),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    if (!["in_review", "submitted", "syncing", "error"].includes(release.status)) {
      return NextResponse.json(
        { error: `Cannot reject release in status "${release.status}"` },
        { status: 400 }
      );
    }

    const fresh = await prisma.release.update({
      where: { id },
      data: {
        status: "rejected",
        reviewNotes: body.notes.trim(),
        reviewedAt: new Date(),
        reviewedById: gate.admin.id,
        syncError: null,
      },
      include: { tracks: true, artist: true, user: true },
    });

    return NextResponse.json({ release: fresh });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Notes are required to reject" },
        { status: 400 }
      );
    }
    console.error("[admin/releases/reject]", error);
    return NextResponse.json({ error: "Reject failed" }, { status: 500 });
  }
}
