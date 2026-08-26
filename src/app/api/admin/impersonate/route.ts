import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi, isAdminUser } from "@/lib/auth/admin";
import { startImpersonation } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";

const schema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(5).max(500),
});

/** Admin: login as a user (impersonate). Requires reason + audit. */
export async function POST(request: Request) {
  const gate = await requirePermissionApi("users.impersonate");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = schema.parse(await request.json());
    const target = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (isAdminUser(target) && target.id !== gate.admin.id) {
      return NextResponse.json(
        { error: "Cannot login as another admin" },
        { status: 403 }
      );
    }
    if (target.terminated) {
      return NextResponse.json(
        { error: "Cannot impersonate a terminated account" },
        { status: 403 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    await prisma.impersonationSession.create({
      data: {
        adminUserId: gate.admin.id,
        targetUserId: target.id,
        reason: body.reason.trim(),
        ip: ip ?? null,
        userAgent: userAgent?.slice(0, 400) ?? null,
      },
    });

    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "impersonation_started",
      targetType: "user",
      targetId: target.id,
      summary: `Impersonation started for ${target.email}`,
      metadata: { reason: body.reason.trim() },
      ip: ip ?? null,
    });

    await startImpersonation(gate.admin, target);
    return NextResponse.json({
      ok: true,
      user: { id: target.id, email: target.email, name: target.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/impersonate]", error);
    return NextResponse.json({ error: "Impersonation failed" }, { status: 500 });
  }
}
