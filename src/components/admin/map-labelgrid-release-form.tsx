"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { id: string; title: string; owner: string; upc: string | null };

export function MapLabelGridReleaseForm({ labelgridId, candidates }: { labelgridId: number; candidates: Candidate[] }) {
  const router = useRouter();
  const [localReleaseId, setLocalReleaseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function mapRelease() {
    if (!localReleaseId) { setError("Select an RDISTRO release first."); return; }
    const selected = candidates.find((candidate) => candidate.id === localReleaseId);
    const targetLabel = selected ? selected.title : `RDISTRO release ${localReleaseId}`;
    if (!window.confirm(`Map LabelGrid release ${labelgridId} to ${targetLabel}? This changes catalog ownership linkage.`)) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/labelgrid/releases/${labelgridId}/map`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ localReleaseId }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Could not map release."); setBusy(false); return; }
    router.push(`/admin/releases/${body.releaseId}`);
    router.refresh();
  }

  return <div className="border border-amber-300 bg-amber-50"><div className="border-b border-amber-200 px-4 py-3"><h2 className="text-sm font-semibold text-amber-950">Map to RDISTRO</h2><p className="mt-1 text-[11px] text-amber-900/80">Choose the existing RDISTRO release that owns this provider catalog record. Tracks with unique exact ISRC matches are linked automatically.</p></div><div className="p-4"><label className="text-xs font-semibold text-amber-950">Unmapped RDISTRO release<input list={`mapping-candidates-${labelgridId}`} value={localReleaseId} onChange={(event) => setLocalReleaseId(event.target.value)} placeholder="Select a recent release or enter its RDISTRO ID" className="mt-1 h-10 w-full border border-amber-300 bg-white px-3 text-xs" /><datalist id={`mapping-candidates-${labelgridId}`}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} / {candidate.owner}{candidate.upc ? ` / ${candidate.upc}` : ""}</option>)}</datalist></label><button type="button" onClick={() => void mapRelease()} disabled={busy || !localReleaseId} className="mt-3 h-9 bg-amber-900 px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Mapping..." : "Confirm mapping"}</button>{!candidates.length ? <p className="mt-2 text-xs text-amber-900">No recent unmapped releases were found. You can still enter an exact RDISTRO release ID.</p> : null}{error ? <p className="mt-2 text-xs font-semibold text-red-700" role="alert">{error}</p> : null}</div></div>;
}
