import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ban"), reason: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal("unban") }),
]);

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("users.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  try {
    const body = schema.parse(await request.json());
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role !== "user") {
      return NextResponse.json({ error: "Staff accounts must be managed from Admins." }, { status: 403 });
    }

    const banning = body.action === "ban";
    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        suspended: banning,
        suspendedAt: banning ? new Date() : null,
        suspendedReason: banning ? body.reason : null,
      },
    });

    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: banning ? "user_suspended" : "user_unsuspended",
      targetType: "user",
      targetId: target.id,
      summary: `${banning ? "Banned" : "Unbanned"} ${target.email}`,
      metadata: banning ? { reason: body.reason } : {},
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ ok: true, suspended: user.suspended });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    console.error("[admin/users/ban]", error);
    return NextResponse.json({ error: "Could not update account access." }, { status: 500 });
  }
}
