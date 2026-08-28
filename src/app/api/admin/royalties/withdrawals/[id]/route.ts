import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const schema = z.object({
  status: z.enum(["processing", "paid", "declined"]),
  reference: z.string().trim().max(100).optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate)
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const existing = await prisma.withdrawal.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json(
        { error: "Withdrawal not found." },
        { status: 404 },
      );
    if (["paid", "declined"].includes(existing.status))
      return NextResponse.json(
        { error: "Completed withdrawal decisions cannot be silently changed." },
        { status: 409 },
      );
    const processedAt = ["paid", "declined"].includes(input.status)
      ? new Date()
      : null;
    const withdrawal = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id },
        data: {
          status: input.status,
          processedAt,
          failureReason:
            input.status === "declined"
              ? input.reason || "Declined by RDISTRO finance"
              : null,
          ...(input.reference ? { reference: input.reference } : {}),
        },
      });
      await tx.walletTransaction.update({
        where: {
          sourceType_sourceId: { sourceType: "withdrawal", sourceId: id },
        },
        data: { status: input.status },
      });
      return updated;
    });
    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "payout_action",
      targetType: "withdrawal",
      targetId: id,
      summary: `Withdrawal marked ${input.status}`,
      metadata: {
        previousStatus: existing.status,
        reference: withdrawal.reference,
        reason: input.reason,
      },
    });
    return NextResponse.json({ ok: true, withdrawal });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid status." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update withdrawal.",
      },
      { status: 422 },
    );
  }
}
