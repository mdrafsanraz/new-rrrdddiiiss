"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDown, CheckCircle, FileArrowUp, XCircle } from "@phosphor-icons/react";

export function DocumentReviewForm({ id, expiresAt, status }: { id: string; expiresAt: string; status: string }) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [expiry, setExpiry] = useState(expiresAt);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function submit(action: "approve" | "reject" | "request_replacement") {
    if (action !== "approve" && !reviewNote.trim()) { setError("Add a user-facing review note first."); return; }
    if (!window.confirm(`${action.replaceAll("_", " ")} this document?`)) return;
    setBusy(action); setError("");
    const response = await fetch(`/api/admin/documents/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reviewNote: reviewNote.trim() || undefined, internalNote: internalNote.trim() || undefined, expiresAt: expiry || null }) });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not review document.");
    else { setReviewNote(""); setInternalNote(""); router.refresh(); }
    setBusy("");
  }

  return <details className="group border-t border-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold hover:bg-muted/30">Review this document<span className="flex items-center gap-2 text-[10px] font-medium capitalize text-muted-foreground">Current: {status.replaceAll("_", " ")}<CaretDown className="transition-transform group-open:rotate-180" /></span></summary><div className="border-t border-border bg-muted/15 p-4"><p className="mb-3 text-[11px] text-muted-foreground">Rejection and replacement messages are visible to the user. Internal notes remain staff-only.</p><div className="grid gap-3 lg:grid-cols-2"><label className="text-xs font-semibold">User-facing review note<textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} maxLength={2000} className="mt-1 w-full border border-border bg-background p-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Internal note<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={3} maxLength={4000} className="mt-1 w-full border border-border bg-background p-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Expiry date, when applicable<input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm font-normal" /></label></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void submit("approve")} disabled={Boolean(busy)} className="flex h-9 items-center gap-2 bg-emerald-700 px-4 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle weight="fill" /> Approve</button><button type="button" onClick={() => void submit("request_replacement")} disabled={Boolean(busy)} className="flex h-9 items-center gap-2 border border-amber-300 px-4 text-xs font-semibold text-amber-800 disabled:opacity-50"><FileArrowUp /> Request replacement</button><button type="button" onClick={() => void submit("reject")} disabled={Boolean(busy)} className="flex h-9 items-center gap-2 border border-red-300 px-4 text-xs font-semibold text-red-700 disabled:opacity-50"><XCircle /> Reject</button>{error ? <p className="w-full text-xs font-semibold text-red-700">{error}</p> : null}</div></div></details>;
}
