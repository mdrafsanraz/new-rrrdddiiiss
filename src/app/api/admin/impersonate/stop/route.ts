import { NextResponse } from "next/server";
import { getSessionContext, stopImpersonation } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";

export async function POST(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx.isImpersonating || !ctx.impersonator || !ctx.user) {
    return NextResponse.json(
      { error: "Not currently impersonating" },
      { status: 400 }
    );
  }

  const adminId = ctx.impersonator.id;
  const targetId = ctx.user.id;

  await prisma.impersonationSession.updateMany({
    where: {
      adminUserId: adminId,
      targetUserId: targetId,
      endedAt: null,
    },
    data: { endedAt: new Date() },
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await writeAuditLog({
    actorUserId: adminId,
    action: "impersonation_ended",
    targetType: "user",
    targetId: targetId,
    summary: `Impersonation ended for ${ctx.user.email}`,
    ip,
  });

  const ok = await stopImpersonation();
  if (!ok) {
    return NextResponse.json(
      { error: "Could not restore admin session" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
