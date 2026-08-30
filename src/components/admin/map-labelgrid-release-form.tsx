"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MapLabelGridReleaseForm({ labelgridId }: { labelgridId: number }) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function mapRelease() {
    const email = userEmail.trim().toLowerCase();
    if (!email) { setError("Enter the owner's email address first."); return; }
    if (!window.confirm(`Assign LabelGrid release ${labelgridId} to ${email}? This creates or reuses the user's matching RDISTRO catalog record.`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/labelgrid/releases/${labelgridId}/map`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userEmail: email }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Could not map release."); setBusy(false); return; }
    router.push(`/admin/releases/${body.releaseId}`);
    router.refresh();
  }

  return <div className="border border-amber-300 bg-amber-50"><div className="border-b border-amber-200 px-4 py-3"><h2 className="text-sm font-semibold text-amber-950">Assign to a user</h2><p className="mt-1 text-[11px] text-amber-900/80">Enter the RDISTRO account email that owns this release. An exact UPC match is reused; otherwise a local catalog record is imported from LabelGrid.</p></div><div className="p-4"><label className="text-xs font-semibold text-amber-950">User email<input type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} placeholder="artist@example.com" autoComplete="off" className="mt-1 h-10 w-full border border-amber-300 bg-white px-3 text-xs" /></label><button type="button" onClick={() => void mapRelease()} disabled={busy || !userEmail.trim()} className="mt-3 h-9 bg-amber-900 px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Assigning..." : "Assign release"}</button>{error ? <p className="mt-2 text-xs font-semibold text-red-700" role="alert">{error}</p> : null}</div></div>;
}
