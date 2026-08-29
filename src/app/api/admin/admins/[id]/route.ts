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
const roleSchema = z.object({ role: z.enum(["super_admin", "admin", "reviewer", "support", "finance"]) });

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("staff.manage"); if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status }); const { id } = await params;
  if (id === gate.admin.id) return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  try { const input = roleSchema.parse(await request.json()); const existing = await prisma.user.findUnique({ where: { id } }); if (!existing || !isStaffRole(existing.role)) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    if (existing.role === "super_admin" && input.role !== "super_admin" && await prisma.user.count({ where: { role: "super_admin" } }) <= 1) return NextResponse.json({ error: "The final super admin cannot be reassigned." }, { status: 409 });
    const user = await prisma.user.update({ where: { id }, data: { role: input.role }, select: { id: true, name: true, email: true, role: true } }); await writeAuditLog({ actorUserId: gate.admin.id, action: "staff_role_changed", targetType: "user", targetId: id, summary: `Changed ${user.email} from ${existing.role} to ${input.role}`, metadata: { previousRole: existing.role, nextRole: input.role } }); return NextResponse.json({ user });
  } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid role." }, { status: 400 }); return NextResponse.json({ error: "Could not change role." }, { status: 500 }); }
}

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
    if (user.role === "super_admin" && await prisma.user.count({ where: { role: "super_admin" } }) <= 1) return NextResponse.json({ error: "The final super admin cannot be removed." }, { status: 409 });

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
