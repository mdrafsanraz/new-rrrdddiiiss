"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawalStatusForm({ id, current, reference }: { id: string; current: string; reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [payoutReference, setPayoutReference] = useState(reference);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  async function update(status: "processing" | "paid" | "declined") {
    if (["paid", "declined"].includes(status) && !window.confirm(`Mark this withdrawal ${status}? This changes the wallet ledger.`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/royalties/withdrawals/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, reference: payoutReference.trim() || undefined, note: note.trim() || undefined, reason: reason.trim() || undefined }) });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Update failed."); else { setExpanded(false); router.refresh(); }
    setBusy(false);
  }
  if (["paid", "declined", "reversed"].includes(current)) return <span className="text-xs font-semibold capitalize text-muted-foreground">{current}</span>;
  return <div className="min-w-52"><div className="flex flex-wrap justify-end gap-2">
    {current === "pending" ? <button type="button" onClick={() => void update("processing")} disabled={busy} className="h-8 rounded-md bg-foreground px-3 text-[11px] font-semibold text-background disabled:opacity-50">Start processing</button> : null}
    {current === "processing" ? <button type="button" onClick={() => void update("paid")} disabled={busy} className="h-8 rounded-md bg-emerald-700 px-3 text-[11px] font-semibold text-white disabled:opacity-50">Mark paid</button> : null}
    <button type="button" onClick={() => setExpanded((value) => !value)} className="h-8 rounded-md border border-border px-3 text-[11px] font-semibold hover:bg-muted">{expanded ? "Close" : "Review"}</button>
  </div>{expanded ? <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3 text-left">
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Payout or reference ID<input value={payoutReference} onChange={(event) => setPayoutReference(event.target.value)} maxLength={100} className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground" /></label>
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Internal audit note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs normal-case tracking-normal text-foreground" /></label>
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Decline reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs normal-case tracking-normal text-foreground" /></label>
    <button type="button" onClick={() => void update("declined")} disabled={busy || !reason.trim()} className="h-8 rounded-md border border-red-300 px-3 text-[11px] font-semibold text-red-700 disabled:opacity-40">Decline request</button>
  </div> : null}{error ? <p className="mt-2 text-[10px] text-red-600">{error}</p> : null}</div>;
}
