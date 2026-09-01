"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AcrReleaseReport } from "@/lib/acrcloud/release-scan";

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
  audd?: {
    recognized: boolean;
    message: string;
    match: {
      artist: string | null;
      title: string | null;
      album: string | null;
      label: string | null;
      releaseDate: string | null;
      timecode: string | null;
      songLink: string | null;
      isrc: string | null;
      spotifyUrl: string | null;
      appleMusicUrl: string | null;
    } | null;
    error: string | null;
  } | null;
};

export function ReleaseAcrPanel({ releaseId, acrConfigured, auddConfigured, canRun, initialReport, initialStatus, fetchedAt, initialError }: { releaseId: string; acrConfigured: boolean; auddConfigured: boolean; canRun: boolean; initialReport: AcrReleaseReport | null; initialStatus: string | null; fetchedAt: string | null; initialError: string | null }) {
  const configured = acrConfigured || auddConfigured;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[] | null>(initialReport?.results ?? null);
  const [status, setStatus] = useState(initialStatus);
  const [completedAt, setCompletedAt] = useState(fetchedAt);

  async function run() {
    setBusy(true);
    setStatus("running");
    setError("");
    try {
      const response = await fetch(`/api/admin/releases/${releaseId}/acr`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "ACRCloud scan failed.");
      setResults(payload.results);
      setStatus(payload.report.status);
      setCompletedAt(payload.report.generatedAt);
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
          <h2 className="text-sm font-semibold">Audio recognition</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Cross-check submitted masters with {acrConfigured && auddConfigured ? "ACRCloud and AudD" : acrConfigured ? "ACRCloud" : "AudD"} before reviewing Preflight QC.</p>
        </div>
        <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{busy ? "Running" : status?.replaceAll("_", " ") ?? "Not run"}</span>{canRun && configured ? <Button type="button" variant="outline" className="h-8 px-3 text-xs" disabled={busy} onClick={run}>{busy ? "Scanning tracks…" : "Scan again"}</Button> : null}</div>
      </div>
      <div className="p-4">
        {!configured ? <p className="text-sm text-muted-foreground">Configure ACRCloud and/or AUDD_API_TOKEN to enable recognition.</p> : !canRun ? <p className="text-sm text-muted-foreground">You do not have permission to run release QC checks.</p> : !results && (status === "pending" || status === "running") ? <p className="text-sm text-muted-foreground">The audio-transcode webhook queued this scan. Refresh the page shortly to load its report.</p> : !results ? <p className="text-sm text-muted-foreground">{initialError ?? "No cached report yet. A scan starts automatically when LabelGrid confirms audio transcoding; scan again to request a fresh report now."}</p> : <div className="space-y-3"><p className="text-[11px] text-muted-foreground">Cached report{completedAt ? ` from ${new Date(completedAt).toLocaleString()}` : ""}. “Scan again” requests fresh results from every configured provider.</p>{results.map((result) => <article key={result.trackId} className="border border-border p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{String(result.trackNumber).padStart(2, "0")} / {result.submittedTitle}</p><p className="mt-0.5 text-xs text-muted-foreground">Submitted ISRC: {result.submittedIsrc ?? "Not assigned"}</p></div></div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="bg-muted/25 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide">ACRCloud</p><p className={result.error ? "mt-2 text-xs text-red-800" : "mt-2 text-xs"}>{result.error ?? (result.recognized ? "Match found" : result.message)}</p>{result.matches[0] ? <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><Item label="Title" value={result.matches[0].title} /><Item label="Artist" value={result.matches[0].artists.join(", ")} /><Item label="ISRC" value={result.matches[0].isrc} /><Item label="Score" value={result.matches[0].score === null ? null : `${result.matches[0].score}%`} /></dl> : null}</div><div className="bg-muted/25 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide">AudD</p><p className={result.audd?.error ? "mt-2 text-xs text-red-800" : "mt-2 text-xs"}>{result.audd?.error ?? (result.audd?.recognized ? "Match found" : result.audd?.message ?? "Not configured for this scan")}</p>{result.audd?.match ? <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><Item label="Title" value={result.audd.match.title} /><Item label="Artist" value={result.audd.match.artist} /><Item label="ISRC" value={result.audd.match.isrc} /><Item label="Album" value={result.audd.match.album} /></dl> : null}</div></div></article>)}</div>}
        {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || "Not returned"}</dd></div>;
}
