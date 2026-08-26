import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import type { PlanId } from "@prisma/client";

const patchSchema = z.object({
  planId: z.enum(["free", "starter", "pro"]).optional(),
  name: z.string().min(1).max(120).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { artists: true, releases: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { passwordHash: _, ...safe } = user;
  return NextResponse.json({ user: safe });
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const data: { planId?: PlanId; name?: string } = {};
    if (body.planId) data.planId = body.planId;
    if (body.name) data.name = body.name.trim();

    const user = await prisma.user.update({
      where: { id },
      data,
    });
    const { passwordHash: _, ...safe } = user;
    return NextResponse.json({ user: safe });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/users/patch]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
