import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { isStaffRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";

type Params = { params: Promise<{ id: string }> };

const demoteSchema = z.object({
  confirm: z.literal(true),
});

/** Remove staff role (demote to user). Cannot demote yourself. */
export async function DELETE(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("staff.manage");
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
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: "user" },
      select: { id: true, name: true, email: true, role: true },
    });
    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "staff_role_changed",
      targetType: "user",
      targetId: id,
      summary: `Demoted ${updated.email} to user`,
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
