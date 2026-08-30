import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * Deactivates an active royalty rule — never a hard delete. RoyaltyTransaction
 * .royaltyRuleId is onDelete: SetNull, so removing the row would silently
 * orphan the rule reference on every past published transaction that used
 * it, breaking the page's own stated guarantee that published statements
 * retain their applied rule. calculation.ts only selects active rules, so
 * deactivating is what actually stops it from applying going forward.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await params;
  const existing = await prisma.royaltyRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }
  if (!existing.active) {
    return NextResponse.json({ error: "This rule is already inactive." }, { status: 409 });
  }
  const now = new Date();
  const rule = await prisma.royaltyRule.update({
    where: { id },
    data: { active: false, effectiveTo: existing.effectiveTo ?? now },
  });
  await writeAuditLog({
    actorUserId: gate.admin.id,
    action: "other",
    targetType: "royalty_rule",
    targetId: rule.id,
    summary: `Deactivated royalty rule ${rule.name} v${rule.version}`,
    metadata: { scope: rule.scope },
  });
  return NextResponse.json({ ok: true, rule });
}
