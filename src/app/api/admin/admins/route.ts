import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

const promoteSchema = z.object({
  email: z.string().email(),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
});

/** List admins. */
export async function GET() {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      planId: true,
    },
  });
  return NextResponse.json({ admins });
}

/**
 * Add admin:
 * - { email } promotes an existing user
 * - { name, email, password } creates a new admin account
 */
export async function POST(request: Request) {
  const gate = await requireAdminApi();
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
          role: "admin",
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
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "That user is already an admin" },
        { status: 400 }
      );
    }

    const admin = await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
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
