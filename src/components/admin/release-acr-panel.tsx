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

type ReleaseAcrPanelProps = {
  releaseId: string;
  acrConfigured: boolean;
  auddConfigured: boolean;
  canRun: boolean;
  initialAcrcloudReport: AcrReleaseReport | null;
  initialAuddReport: AcrReleaseReport | null;
  initialAcrcloudStatus: string | null;
  initialAuddStatus: string | null;
  acrcloudFetchedAt: string | null;
  auddFetchedAt: string | null;
  initialAcrcloudError: string | null;
  initialAuddError: string | null;
};

export function ReleaseAcrPanel({ releaseId, acrConfigured, auddConfigured, canRun, initialAcrcloudReport, initialAuddReport, initialAcrcloudStatus, initialAuddStatus, acrcloudFetchedAt, auddFetchedAt, initialAcrcloudError, initialAuddError }: ReleaseAcrPanelProps) {
  const configured = acrConfigured || auddConfigured;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acrcloudResults, setAcrcloudResults] = useState<Result[] | null>(initialAcrcloudReport?.results ?? null);
  const [auddResults, setAuddResults] = useState<Result[] | null>(initialAuddReport?.results ?? null);
  const [acrcloudStatus, setAcrcloudStatus] = useState(initialAcrcloudStatus);
  const [auddStatus, setAuddStatus] = useState(initialAuddStatus);
  const [acrcloudCompletedAt, setAcrcloudCompletedAt] = useState(acrcloudFetchedAt);
  const [auddCompletedAt, setAuddCompletedAt] = useState(auddFetchedAt);

  async function run() {
    setBusy(true);
    if (acrConfigured) setAcrcloudStatus("running");
    if (auddConfigured) setAuddStatus("running");
    setError("");
    try {
      const response = await fetch(`/api/admin/releases/${releaseId}/acr`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "ACRCloud scan failed.");
      const providerReports = payload.report.providerReports as AcrReleaseReport["providerReports"] | undefined;
      const acrcloudReport = providerReports?.acrcloud ?? (acrConfigured ? payload.report : null);
      const auddReport = providerReports?.audd ?? (auddConfigured ? payload.report : null);
      if (acrcloudReport) {
        setAcrcloudResults(acrcloudReport.results);
        setAcrcloudStatus(acrcloudReport.status);
        setAcrcloudCompletedAt(acrcloudReport.generatedAt);
      }
      if (auddReport) {
        setAuddResults(auddReport.results);
        setAuddStatus(auddReport.status);
        setAuddCompletedAt(auddReport.generatedAt);
      }
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
        <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{busy ? "Running" : "Provider caches"}</span>{canRun && configured ? <Button type="button" variant="outline" className="h-8 px-3 text-xs" disabled={busy} onClick={run}>{busy ? "Scanning tracks…" : "Scan again"}</Button> : null}</div>
      </div>
      <div className="p-4">
        {!configured ? <p className="text-sm text-muted-foreground">Configure ACRCloud and/or AUDD_API_TOKEN to enable recognition.</p> : null}
        {configured && !canRun ? <p className="text-sm text-muted-foreground">You do not have permission to run release QC checks.</p> : null}
        {configured && canRun ? (
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <ProviderCard
              provider="ACRCloud"
              configured={acrConfigured}
              results={acrcloudResults}
              completedAt={acrcloudCompletedAt}
              status={acrcloudStatus}
              cacheError={initialAcrcloudError}
              kind="acrcloud"
            />
            <ProviderCard
              provider="AudD"
              configured={auddConfigured}
              results={auddResults}
              completedAt={auddCompletedAt}
              status={auddStatus}
              cacheError={initialAuddError}
              kind="audd"
            />
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}

function ProviderCard({ provider, configured, results, completedAt, status, cacheError, kind }: { provider: "ACRCloud" | "AudD"; configured: boolean; results: Result[] | null; completedAt: string | null; status: string | null; cacheError: string | null; kind: "acrcloud" | "audd" }) {
  const recognized = results?.filter((result) => kind === "acrcloud" ? result.recognized : result.audd?.recognized).length ?? 0;
  const failures = results?.filter((result) => kind === "acrcloud" ? Boolean(result.error) : Boolean(result.audd?.error)).length ?? 0;

  return (
    <article className="border border-border bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{provider}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {configured ? "Independent recognition results" : "Recognition service is not configured"}
            </p>
          </div>
          <span className="border border-border bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {!configured ? "Not configured" : results ? "Cached" : status === "pending" || status === "running" ? "Processing" : "No cache"}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <Item label="Matches" value={results ? String(recognized) : null} />
          <Item label="Errors" value={results ? String(failures) : null} />
          <Item label="Cached at" value={results && completedAt ? new Date(completedAt).toLocaleString() : null} />
        </dl>
      </header>

      {!configured ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          {provider === "ACRCloud" ? "Add the ACRCloud credentials to enable this service." : "Add AUDD_API_TOKEN to enable this service."}
        </p>
      ) : !results ? (
        <p className={cacheError ? "px-4 py-5 text-sm text-red-800" : "px-4 py-5 text-sm text-muted-foreground"}>
          {cacheError ?? (status === "pending" || status === "running"
            ? "Automatic recognition is running. Results will be cached when it completes."
            : "No cached result is available yet.")}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {results.map((result) => (
            <ProviderTrackResult key={result.trackId} result={result} kind={kind} />
          ))}
        </div>
      )}
    </article>
  );
}

function ProviderTrackResult({ result, kind }: { result: Result; kind: "acrcloud" | "audd" }) {
  const match = kind === "acrcloud" ? result.matches[0] : result.audd?.match;
  const recognized = kind === "acrcloud" ? result.recognized : Boolean(result.audd?.recognized);
  const providerError = kind === "acrcloud" ? result.error : result.audd?.error;
  const message = kind === "acrcloud" ? result.message : result.audd?.message ?? "No result returned";

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{String(result.trackNumber).padStart(2, "0")} / {result.submittedTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Submitted ISRC: {result.submittedIsrc ?? "Not assigned"}</p>
        </div>
        <span className={providerError ? "text-xs font-medium text-red-800" : recognized ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-muted-foreground"}>
          {providerError ? "Error" : recognized ? "Match found" : "No match"}
        </span>
      </div>
      {providerError ? <p className="mt-3 text-xs text-red-800">{providerError}</p> : null}
      {!providerError && !match ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
      {kind === "acrcloud" && result.matches[0] ? (
        <dl className="mt-3 grid gap-3 bg-muted/25 p-3 text-xs sm:grid-cols-2">
          <Item label="Title" value={result.matches[0].title} />
          <Item label="Artist" value={result.matches[0].artists.join(", ")} />
          <Item label="ISRC" value={result.matches[0].isrc} />
          <Item label="Score" value={result.matches[0].score === null ? null : `${result.matches[0].score}%`} />
        </dl>
      ) : null}
      {kind === "audd" && result.audd?.match ? (
        <dl className="mt-3 grid gap-3 bg-muted/25 p-3 text-xs sm:grid-cols-2">
          <Item label="Title" value={result.audd.match.title} />
          <Item label="Artist" value={result.audd.match.artist} />
          <Item label="ISRC" value={result.audd.match.isrc} />
          <Item label="Album" value={result.audd.match.album} />
        </dl>
      ) : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || "Not returned"}</dd></div>;
}
