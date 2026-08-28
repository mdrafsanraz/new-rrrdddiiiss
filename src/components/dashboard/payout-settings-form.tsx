"use client";

import { useState } from "react";
import { Bank, CheckCircle, CurrencyDollar, PaypalLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { cn } from "@/lib/utils";

const METHODS = [
  { id: "bank_transfer", label: "Bank transfer", note: "Secure bank onboarding at payout", icon: Bank },
  { id: "paypal", label: "PayPal", note: "Send to your PayPal account", icon: PaypalLogo },
  { id: "wise", label: "Wise", note: "International payout via Wise", icon: CurrencyDollar },
] as const;

export function PayoutSettingsForm({ initial }: { initial: { method: string | null; email: string; currency: string; threshold: number } }) {
  const [method, setMethod] = useState(initial.method ?? "bank_transfer");
  const [email, setEmail] = useState(initial.email);
  const [currency, setCurrency] = useState(initial.currency);
  const [threshold, setThreshold] = useState(initial.threshold);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  return (
    <form className="overflow-hidden rounded-2xl border border-border bg-card" onSubmit={async (event) => {
      event.preventDefault(); setError(""); setStatus("saving");
      try {
        const response = await fetch("/api/account/payout", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method, email, currency, threshold }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error ?? "Could not save payout settings"); setStatus("idle"); return; }
        setStatus("saved");
      } catch { setError("Network error"); setStatus("idle"); }
    }}>
      <div className="border-b border-border px-5 py-5 sm:px-7"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Payout destination</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Where should earnings go?</h2><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Choose a preference now. Sensitive banking credentials are collected securely only when a payout is initiated.</p></div>
      <div className="space-y-6 p-5 sm:p-7">
        <fieldset><legend className="text-sm font-medium">Payout method <span className="text-destructive">*</span></legend><div className="mt-3 grid gap-3 md:grid-cols-3">{METHODS.map((item) => { const Icon = item.icon; const active = method === item.id; return <button key={item.id} type="button" onClick={() => { setMethod(item.id); setStatus("idle"); }} className={cn("cursor-pointer rounded-xl border p-4 text-left transition-[border-color,background-color,transform] active:translate-y-px", active ? "border-primary bg-primary/[0.06]" : "border-border hover:border-primary/30 hover:bg-muted/35")}><Icon size={21} className={active ? "text-primary" : "text-muted-foreground"} weight="duotone" /><span className="mt-3 block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{item.note}</span></button>; })}</div></fieldset>
        <div className="grid gap-5 md:grid-cols-2"><Field id="payout-email" label="Payout contact email" type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setStatus("idle"); }} helper={method === "paypal" || method === "wise" ? `Use the email connected to your ${method === "paypal" ? "PayPal" : "Wise"} account.` : "We use this email to coordinate secure bank onboarding."} /><Field id="payout-currency" label="Preferred currency" as="select" required value={currency} onChange={(event) => { setCurrency(event.target.value); setStatus("idle"); }}><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option></Field></div>
        <Field id="payout-threshold" label="Minimum payout" as="select" required value={String(threshold)} onChange={(event) => { setThreshold(Number(event.target.value)); setStatus("idle"); }}><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="250">250</option></Field>
        {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5"><Button type="submit" className="h-10 px-5" loading={status === "saving"}>{status === "saving" ? "Saving…" : "Save payout settings"}</Button>{status === "saved" ? <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle size={15} weight="fill" /> Settings saved</span> : null}</div>
      </div>
    </form>
  );
}
