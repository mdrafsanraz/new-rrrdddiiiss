import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const plan = z.object({ id: z.enum(["free", "starter", "pro"]), name: z.string().trim().min(1).max(60), price: z.string().regex(/^\d+(\.\d{1,2})?$/), billingInterval: z.enum(["forever", "month", "year"]), artists: z.number().int().positive().nullable(), releasesPerMonth: z.number().int().positive().nullable(), features: z.array(z.string().trim().min(1).max(160)).max(30), royaltyCommissionPercent: z.number().min(0).max(100), analytics: z.boolean(), priorityReview: z.boolean(), active: z.boolean(), hidden: z.boolean(), stripePriceId: z.string().trim().max(100).nullable() });
const schema = z.object({ plans: z.array(plan).length(3) }).refine((input) => new Set(input.plans.map((item) => item.id)).size === 3, "Each plan must appear exactly once.");

export async function PATCH(request: Request) {
  const gate = await requirePermissionApi("settings.manage");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const input = schema.parse(await request.json());
    const paidMissingStripe = input.plans.find((item) => item.id !== "free" && item.active && !item.stripePriceId);
    if (paidMissingStripe) return NextResponse.json({ error: `${paidMissingStripe.name} needs a Stripe Price ID before it can be active.` }, { status: 400 });
    await prisma.$transaction(input.plans.map((item) => prisma.planConfiguration.upsert({ where: { planId: item.id }, create: { planId: item.id, name: item.name, price: item.price, billingInterval: item.billingInterval, artistLimit: item.artists, monthlyReleaseLimit: item.releasesPerMonth, featuresJson: JSON.stringify(item.features), royaltyCommissionPercent: item.royaltyCommissionPercent, analytics: item.analytics, priorityReview: item.priorityReview, active: item.active, hidden: item.hidden, stripePriceId: item.stripePriceId || null }, update: { name: item.name, price: item.price, billingInterval: item.billingInterval, artistLimit: item.artists, monthlyReleaseLimit: item.releasesPerMonth, featuresJson: JSON.stringify(item.features), royaltyCommissionPercent: item.royaltyCommissionPercent, analytics: item.analytics, priorityReview: item.priorityReview, active: item.active, hidden: item.hidden, stripePriceId: item.stripePriceId || null } })));
    await writeAuditLog({ actorUserId: gate.admin.id, action: "settings_changed", targetType: "plan_configuration", targetId: "catalog", summary: "Updated subscription plan catalog", metadata: { plans: input.plans.map(({ id, active, hidden, price, billingInterval }) => ({ id, active, hidden, price, billingInterval })) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid plan configuration." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save plans." }, { status: 422 });
  }
}
