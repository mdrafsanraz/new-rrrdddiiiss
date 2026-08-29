import { SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";
import { PlanConfigurationForm } from "@/components/admin/plan-configuration-form";
import { requirePermission } from "@/lib/auth/admin";
import { getPlanCatalog } from "@/lib/plans";

export const metadata = { title: "Plans | Admin" }; export const dynamic = "force-dynamic";
export default async function PlansPage() { await requirePermission("settings.manage"); const plans = await getPlanCatalog(); return <div className="mx-auto max-w-[1400px] space-y-6"><header className="border-b border-border pb-6"><div className="flex items-center gap-2 text-primary"><SlidersHorizontal size={18} weight="duotone" /><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">Commercial configuration</span></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Plans</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Configure pricing, catalog limits, features, commission and Stripe mapping from one audited workspace. Published royalty statements remain unchanged.</p></header><PlanConfigurationForm initial={plans.map((plan) => ({ ...plan, royaltyCommissionPercent: 100 - plan.royaltyKeepPercent }))} /></div>; }
