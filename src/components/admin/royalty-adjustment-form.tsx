"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Plus } from "@phosphor-icons/react";

export function RoyaltyAdjustmentForm({ periodId }: { periodId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(form: FormData) {
    setBusy(true); setError("");
    const response = await fetch("/api/admin/royalties/adjustments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ royaltyPeriodId: periodId, transactionId: form.get("transactionId"), type: form.get("type"), amount: form.get("amount"), reason: form.get("reason") }) });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not add adjustment."); else router.refresh();
    setBusy(false);
  }
  const input = "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";
  return <form action={(form) => void submit(form)} className="grid gap-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_160px_140px_1.3fr_auto]"><div className="lg:col-span-5"><h2 className="text-sm font-semibold">Explicit transaction adjustment</h2><p className="mt-1 text-xs text-muted-foreground">Enter a positive deduction or negative credit. Recalculate the period afterward.</p></div><label className="grid gap-1.5 text-xs font-medium">Transaction ID<input required name="transactionId" className={input} /></label><label className="grid gap-1.5 text-xs font-medium">Type<select name="type" className={input}><option value="manual">Manual</option><option value="tax_withholding">Tax / withholding</option><option value="processing">Processing</option><option value="correction">Correction</option><option value="other">Other</option></select></label><label className="grid gap-1.5 text-xs font-medium">Amount<input required name="amount" inputMode="decimal" pattern="-?\d+(\.\d{1,12})?" className={input} /></label><label className="grid gap-1.5 text-xs font-medium">Reason<input required name="reason" minLength={3} className={input} /></label><div className="flex items-end"><button disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-60">{busy ? <CircleNotch className="animate-spin" /> : <Plus />}Add</button></div>{error ? <p className="text-xs text-red-600 lg:col-span-5">{error}</p> : null}</form>;
}
