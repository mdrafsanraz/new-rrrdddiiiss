import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { isStaffRole, STAFF_ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";

const promoteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["super_admin", "admin", "reviewer", "support", "finance"]).default("admin"),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  role: z.enum(["super_admin", "admin", "reviewer", "support", "finance"]).default("admin"),
});

/** List staff. */
export async function GET() {
  const gate = await requirePermissionApi("staff.manage");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      planId: true,
    },
  });
  return NextResponse.json({ admins });
}

/**
 * Add staff:
 * - { email, role? } promotes an existing user
 * - { name, email, password, role? } creates a new staff account
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi("staff.manage");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const raw = await request.json();

    if (raw?.password || raw?.name) {
      const body = createSchema.parse(raw);
      const email = body.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          {
            error:
              "That email already has an account. Use “Promote existing user” instead.",
          },
          { status: 409 }
        );
      }
      const passwordHash = await bcrypt.hash(body.password, 12);
      const user = await prisma.user.create({
        data: {
          name: body.name.trim(),
          email,
          passwordHash,
          role: body.role,
          planId: "pro",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
      await writeAuditLog({
        actorUserId: gate.admin.id,
        action: "staff_role_changed",
        targetType: "user",
        targetId: user.id,
        summary: `Created staff ${user.email} as ${body.role}`,
      });
      return NextResponse.json({ admin: user, created: true }, { status: 201 });
    }

    const body = promoteSchema.parse(raw);
    const email = body.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "No user found with that email" },
        { status: 404 }
      );
    }
    if (isStaffRole(user.role)) {
      return NextResponse.json(
        { error: "That user is already staff" },
        { status: 400 }
      );
    }

    const admin = await prisma.user.update({
      where: { id: user.id },
      data: { role: body.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "staff_role_changed",
      targetType: "user",
      targetId: admin.id,
      summary: `Promoted ${admin.email} to ${body.role}`,
    });
    return NextResponse.json({ admin, promoted: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/admins]", error);
    return NextResponse.json({ error: "Could not add admin" }, { status: 500 });
  }
}
