"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Plus } from "@phosphor-icons/react";

export function RoyaltyRuleForm({ users }: { users: Array<{ id: string; name: string; email: string }> }) {
  const router = useRouter();
  const [scope, setScope] = useState("global");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setBusy(true); setError("");
    const method = String(formData.get("method"));
    const rate = Number(formData.get("rate"));
    const response = await fetch("/api/admin/royalties/rules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: formData.get("name"), scope, userId: scope === "user" ? formData.get("userId") : null, planId: scope === "plan" ? formData.get("planId") : null, commissionRate: method === "commission" ? rate : null, revenueShareRate: method === "share" ? rate : null, fixedAdjustment: Number(formData.get("fixedAdjustment") || 0), effectiveFrom: formData.get("effectiveFrom") }) });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not create rule."); else router.refresh();
    setBusy(false);
  }

  const inputClass = "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";
  return <form action={(data) => void submit(data)} className="grid gap-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-4"><div className="lg:col-span-4"><h2 className="text-sm font-semibold">New royalty rule</h2><p className="mt-1 text-xs text-muted-foreground">New versions affect future calculations only. Published statements retain their applied version.</p></div><Field label="Rule name"><input required name="name" className={inputClass} placeholder="Standard commission" /></Field><Field label="Scope"><select name="scope" value={scope} onChange={(event) => setScope(event.target.value)} className={inputClass}><option value="global">Global</option><option value="plan">Plan</option><option value="user">User</option></select></Field>{scope === "plan" ? <Field label="Plan"><select name="planId" className={inputClass}><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option></select></Field> : scope === "user" ? <Field label="User"><select name="userId" className={inputClass}>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></Field> : <div /> }<Field label="Effective from"><input required name="effectiveFrom" type="date" className={inputClass} /></Field><Field label="Calculation"><select name="method" className={inputClass}><option value="commission">Commission %</option><option value="share">User revenue share %</option></select></Field><Field label="Rate"><input required name="rate" type="number" min="0" max="100" step="0.000001" className={inputClass} /></Field><Field label="Fixed adjustment / row"><input name="fixedAdjustment" type="number" step="0.000001" defaultValue="0" className={inputClass} /></Field><div className="flex items-end"><button disabled={busy} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-60">{busy ? <CircleNotch className="animate-spin" /> : <Plus />}Create version</button></div>{error ? <p className="text-xs text-red-600 lg:col-span-4">{error}</p> : null}</form>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-medium">{label}{children}</label>; }
