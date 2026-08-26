import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const demoteSchema = z.object({
  confirm: z.literal(true),
});

/** Remove admin role (demote to user). Cannot demote yourself. */
export async function DELETE(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (id === gate.admin.id) {
    return NextResponse.json(
      { error: "Cannot remove your own admin access" },
      { status: 400 }
    );
  }

  try {
    demoteSchema.parse(await request.json().catch(() => ({ confirm: true })));
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: "user" },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/admins/delete]", error);
    return NextResponse.json({ error: "Could not remove admin" }, { status: 500 });
  }
}
