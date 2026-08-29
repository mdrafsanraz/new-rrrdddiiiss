import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { updateArtist } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";

type Params = { params: Promise<{ id: string }> };
const patchSchema = z.object({ name: z.string().trim().min(2).max(64) });

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("users.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  try {
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.artist.findUnique({ where: { id }, select: { id: true, name: true, locked: true, labelgridId: true } });
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

    if (existing.labelgridId && isLabelGridLive()) {
      try { await updateArtist(existing.labelgridId, { artist_name: body.name }); }
      catch (error) { console.error("[admin/artists/patch] LabelGrid update failed", error); return NextResponse.json({ error: "LabelGrid artist update failed. Local data was not changed." }, { status: 502 }); }
    }
    const artist = await prisma.artist.update({ where: { id }, data: { name: body.name } });
    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "other",
      targetType: "artist",
      targetId: id,
      summary: `Changed artist name from ${existing.name} to ${body.name}`,
      metadata: { kind: "artist_name_changed", previousName: existing.name, newName: body.name, wasLocked: existing.locked },
    });
    return NextResponse.json({ artist });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid name" }, { status: 400 });
    console.error("[admin/artists/patch]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
