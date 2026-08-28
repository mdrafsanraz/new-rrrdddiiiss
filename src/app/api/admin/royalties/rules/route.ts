import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const optionalRate = z.union([z.number().min(0).max(100), z.null()]);
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  scope: z.enum(["global", "plan", "user"]),
  userId: z.string().trim().nullable().optional(),
  planId: z.enum(["free", "starter", "pro"]).nullable().optional(),
  commissionRate: optionalRate,
  revenueShareRate: optionalRate,
  fixedAdjustment: z.number().min(-1_000_000).max(1_000_000).default(0),
  effectiveFrom: z.coerce.date(),
}).refine((value) => !(value.commissionRate !== null && value.revenueShareRate !== null), { message: "Choose commission or revenue share, not both." }).refine((value) => value.scope !== "user" || Boolean(value.userId), { message: "A user rule requires a user." }).refine((value) => value.scope !== "plan" || Boolean(value.planId), { message: "A plan rule requires a plan." });

export async function POST(request: Request) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const input = schema.parse(await request.json());
    const latest = await prisma.royaltyRule.findFirst({ where: { name: input.name }, orderBy: { version: "desc" }, select: { version: true } });
    const rule = await prisma.royaltyRule.create({ data: { name: input.name, scope: input.scope, userId: input.scope === "user" ? input.userId : null, planId: input.scope === "plan" ? input.planId : null, commissionRate: input.commissionRate, revenueShareRate: input.revenueShareRate, fixedAdjustment: input.fixedAdjustment, effectiveFrom: input.effectiveFrom, version: (latest?.version ?? 0) + 1, createdById: gate.admin.id } });
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_rule", targetId: rule.id, summary: `Created royalty rule ${rule.name} v${rule.version}`, metadata: { scope: rule.scope, commissionRate: rule.commissionRate?.toString(), revenueShareRate: rule.revenueShareRate?.toString(), effectiveFrom: rule.effectiveFrom } });
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create rule." }, { status: 422 });
  }
}
