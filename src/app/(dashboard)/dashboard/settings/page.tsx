import Link from "next/link";
import { ArrowRight, CheckCircle, EnvelopeSimple, IdentificationCard, MapPin, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { planLabel } from "@/lib/plans";
import { EditAccountForm } from "@/components/dashboard/edit-account-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const profileValues = [user.name, user.phone, user.addressLine1, user.city, user.region, user.postalCode, user.country];
  const completeness = Math.round((profileValues.filter(Boolean).length / profileValues.length) * 100);
  const initial = user.name.trim().charAt(0).toUpperCase() || "R";

  return (
    <div className="mx-auto max-w-[1180px] space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-foreground text-background">
        <div className="absolute -right-24 -top-28 size-80 rounded-full border border-background/10" /><div className="absolute right-12 top-10 size-32 rounded-full border border-background/10" />
        <div className="relative grid gap-7 p-6 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:items-end">
          <div className="flex size-24 items-center justify-center rounded-2xl border border-background/15 bg-background/10 text-6xl font-semibold leading-none shadow-2xl sm:size-28 sm:text-7xl" aria-hidden="true">{initial}</div>
          <div className="min-w-0"><div className="flex items-center gap-2 text-primary"><IdentificationCard size={17} weight="duotone" /><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]">RDISTRO identity</p></div><h1 className="mt-3 truncate text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{user.name}</h1><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-background/55"><span className="flex items-center gap-1.5"><EnvelopeSimple size={14} />{user.email}</span>{user.city || user.country ? <span className="flex items-center gap-1.5"><MapPin size={14} />{[user.city, user.country].filter(Boolean).join(", ")}</span> : null}</div></div>
          <Link href="/dashboard/settings/subscription" className="group flex min-w-52 items-center justify-between gap-4 rounded-xl border border-background/15 bg-background/10 px-4 py-3 transition-colors hover:bg-background/15"><span><span className="block text-[10px] uppercase tracking-wider text-background/45">Current plan</span><span className="mt-1 block font-semibold">{planLabel(user.planId)}</span></span><ArrowRight size={16} className="transition-transform group-hover:translate-x-1" weight="bold" /></Link>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-3">
        <div className="flex items-center gap-4 p-5 sm:p-6"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkle size={19} weight="duotone" /></div><div><p className="text-xl font-semibold tabular-nums">{completeness}%</p><p className="text-xs text-muted-foreground">Profile complete</p></div></div>
        <div className="flex items-center gap-4 border-y border-border p-5 md:border-x md:border-y-0 sm:p-6"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle size={19} weight="duotone" /></div><div><p className="text-sm font-semibold">Email verified</p><p className="mt-0.5 text-xs text-muted-foreground">Primary sign-in identity</p></div></div>
        <div className="p-5 sm:p-6"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Member since</p><p className="mt-2 text-lg font-semibold">{user.createdAt.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p></div>
      </section>

      <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Account controls</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Your details, your access.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Keep the personal information tied to your catalog accurate and your sign-in protected.</p></div>
      <SettingsTabs profile={<EditAccountForm account={{ name: user.name, phone: user.phone ?? "", addressLine1: user.addressLine1 ?? "", addressLine2: user.addressLine2 ?? "", city: user.city ?? "", region: user.region ?? "", postalCode: user.postalCode ?? "", country: user.country ?? "" }} />} password={<ChangePasswordForm />} />
    </div>
  );
}
