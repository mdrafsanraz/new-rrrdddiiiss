"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Match = {
  acrId: string | null;
  title: string | null;
  artists: string[];
  album: string | null;
  label: string | null;
  releaseDate: string | null;
  score: number | null;
  isrc: string | null;
  upc: string | null;
};

type Result = {
  trackId: string;
  trackNumber: number;
  submittedTitle: string;
  submittedIsrc: string | null;
  recognized: boolean;
  message: string;
  matches: Match[];
  error: string | null;
};

export function ReleaseAcrPanel({ releaseId, configured, canRun }: { releaseId: string; configured: boolean; canRun: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/releases/${releaseId}/acr`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "ACRCloud scan failed.");
      setResults(payload.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ACRCloud scan failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="acr" className="scroll-mt-20 border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">ACRCloud audio recognition</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Identify submitted masters against ACRCloud before reviewing Preflight QC.</p>
        </div>
        {canRun && configured ? <Button type="button" variant="outline" className="h-8 px-3 text-xs" disabled={busy} onClick={run}>{busy ? "Scanning tracks…" : results ? "Run again" : "Scan all tracks"}</Button> : null}
      </div>
      <div className="p-4">
        {!configured ? <p className="text-sm text-muted-foreground">Set ACRCLOUD_HOST, ACRCLOUD_ACCESS_KEY, and ACRCLOUD_ACCESS_SECRET to enable recognition.</p> : !canRun ? <p className="text-sm text-muted-foreground">You do not have permission to run release QC checks.</p> : !results ? <p className="text-sm text-muted-foreground">No scan has been run in this session. Results inform manual review and never change release status automatically.</p> : <div className="space-y-3">{results.map((result) => <article key={result.trackId} className="border border-border p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{String(result.trackNumber).padStart(2, "0")} / {result.submittedTitle}</p><p className="mt-0.5 text-xs text-muted-foreground">Submitted ISRC: {result.submittedIsrc ?? "Not assigned"}</p></div><span className={result.error ? "text-xs font-semibold text-red-800" : result.recognized ? "text-xs font-semibold text-emerald-800" : "text-xs font-semibold text-amber-800"}>{result.error ? "Failed" : result.recognized ? "Match found" : "No match"}</span></div>{result.error ? <p className="mt-3 text-xs text-red-800">{result.error}</p> : result.matches.length ? <div className="mt-3 space-y-2">{result.matches.map((match, index) => <dl key={`${match.acrId ?? "match"}-${index}`} className="grid gap-2 bg-muted/35 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><Item label="Matched title" value={match.title} /><Item label="Artist" value={match.artists.join(", ")} /><Item label="Score" value={match.score === null ? null : `${match.score}%`} /><Item label="ISRC" value={match.isrc} /><Item label="Album" value={match.album} /><Item label="Label" value={match.label} /><Item label="Release date" value={match.releaseDate} /><Item label="ACR ID" value={match.acrId} /></dl>)}</div> : <p className="mt-3 text-xs text-muted-foreground">{result.message}</p>}</article>)}</div>}
        {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || "Not returned"}</dd></div>;
}
