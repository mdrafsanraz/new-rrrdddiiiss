import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isAdminUser } from "@/lib/auth/admin";
import { startImpersonation } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({
  userId: z.string().min(1),
});

/** Admin: login as a user (impersonate). */
export async function POST(request: Request) {
  const gate = await requireAdminApi();
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
