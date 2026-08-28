import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: z.string().max(32).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  postalCode: z.string().max(32).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
});

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
        ...(body.addressLine1 !== undefined
          ? { addressLine1: body.addressLine1?.trim() || null }
          : {}),
        ...(body.addressLine2 !== undefined
          ? { addressLine2: body.addressLine2?.trim() || null }
          : {}),
        ...(body.city !== undefined ? { city: body.city?.trim() || null } : {}),
        ...(body.region !== undefined ? { region: body.region?.trim() || null } : {}),
        ...(body.postalCode !== undefined
          ? { postalCode: body.postalCode?.trim() || null }
          : {}),
        ...(body.country !== undefined ? { country: body.country?.trim() || null } : {}),
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        region: user.region,
        postalCode: user.postalCode,
        country: user.country,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[account]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
