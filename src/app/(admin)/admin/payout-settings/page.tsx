import { Gear, Wallet } from "@phosphor-icons/react/dist/ssr";
import { PayoutConfigurationForm } from "@/components/admin/payout-configuration-form";
import { requirePermission } from "@/lib/auth/admin";
import { getPayoutPolicy } from "@/lib/payout-settings";

export const metadata = { title: "Payout Settings | Admin" };
export const dynamic = "force-dynamic";

export default async function PayoutSettingsPage() {
  await requirePermission("settings.manage");
  const policy = await getPayoutPolicy();
  return <div className="mx-auto max-w-[1280px] space-y-6"><header className="border-b border-border pb-6"><div className="flex items-center gap-2 text-primary"><Wallet size={18} weight="duotone" /><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">Financial configuration</span></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Payout settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Control which payout methods are available and enforce their actual minimums, fees, instructions and processing expectations.</p><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Gear /> Every change is written to the admin audit log.</p></header><PayoutConfigurationForm initial={policy} /></div>;
}
