import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { PAYOUT_METHODS } from "@/lib/payout-settings";

const money = z.string().regex(/^\d+(\.\d{1,6})?$/);
const percentage = money.refine((value) => Number(value) <= 100, "Percentage fee cannot exceed 100.");
const methodSchema = z.object({ enabled: z.boolean(), minimum: money, fixedFee: money, percentageFee: percentage, instructions: z.string().trim().max(1000), processingText: z.string().trim().max(500) });
const schema = z.object({ currency: z.enum(["USD"]), availabilityRules: z.string().trim().max(2000), methods: z.object({ wise: methodSchema, paypal: methodSchema, payoneer: methodSchema }) });

export async function PATCH(request: Request) {
  const gate = await requirePermissionApi("settings.manage");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const input = schema.parse(await request.json());
    await prisma.$transaction([
      prisma.payoutConfiguration.upsert({ where: { id: "default" }, create: { id: "default", currency: input.currency, availabilityRules: input.availabilityRules || null }, update: { currency: input.currency, availabilityRules: input.availabilityRules || null } }),
      ...PAYOUT_METHODS.map((method) => prisma.payoutMethodConfiguration.upsert({ where: { method }, create: { method, enabled: input.methods[method].enabled, minimum: input.methods[method].minimum, fixedFee: input.methods[method].fixedFee, percentageFee: input.methods[method].percentageFee, instructions: input.methods[method].instructions || null, processingText: input.methods[method].processingText || null }, update: { enabled: input.methods[method].enabled, minimum: input.methods[method].minimum, fixedFee: input.methods[method].fixedFee, percentageFee: input.methods[method].percentageFee, instructions: input.methods[method].instructions || null, processingText: input.methods[method].processingText || null } })),
    ]);
    await writeAuditLog({ actorUserId: gate.admin.id, action: "settings_changed", targetType: "payout_settings", targetId: "default", summary: "Updated global payout settings", metadata: { currency: input.currency, methods: Object.fromEntries(PAYOUT_METHODS.map((method) => [method, { enabled: input.methods[method].enabled, minimum: input.methods[method].minimum, fixedFee: input.methods[method].fixedFee, percentageFee: input.methods[method].percentageFee }])) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payout configuration." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update payout settings." }, { status: 422 });
  }
}
