"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QcReportSnapshot } from "@/lib/labelgrid/quality-report";
import { deriveQcStatus, safeEvidenceUrl, qcConfirmationError } from "@/lib/labelgrid/qc-state";
import { QcBadge } from "@/components/admin/status-badges";

const descriptions: Record<string, string> = {
  pending: "Automated checks are running. The report-ready webhook saves the completed results. Fetch the report to update this panel; no confirmation happens automatically.",
  stale: "This release changed after the report was generated. Re-run analysis before relying on these findings.",
  not_run: "No generated report is available yet. QC runs as part of LabelGrid’s submission workflow.",
  not_held: "This release is not held for your QC review. LabelGrid hides findings outside a completed review hold; an empty list does not mean the release passed.",
  passed: "Checks are complete with no issues reported for this review hold. This does not automatically approve the release.",
  review_required: "Blocking findings need attention. Review the affected tracks and supporting evidence below.",
  warning: "Review these findings before proceeding. None are flagged as blocking.",
  not_enabled: "LabelGrid reported that Preflight QC is not enabled. If recently enabled, fetch the report again.",
};
function dateLabel(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export function ReleaseQcPanel({ releaseId, labelgridId, qcStatus, qcChecksInProgress, qcFetchedAt, report, canRefresh, canConfirm }: {
  releaseId: string; labelgridId: string | null; qcEnabled: boolean;
  qcStatus: string | null; qcStale: boolean; qcChecksInProgress: boolean;
  qcFetchedAt: string | null; report: QcReportSnapshot | null; canRefresh: boolean; canConfirm: boolean;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(report);
  const [fetchedAt, setFetchedAt] = useState(qcFetchedAt);
  const [pending, setPending] = useState(qcChecksInProgress);
  const [busy, setBusy] = useState<"sync" | "refresh" | "confirm" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  const run = useCallback(async (action: "sync" | "refresh" | "confirm", signal?: AbortSignal) => {
    if (action === "confirm" && !window.confirm("Confirm this release into LabelGrid review? Ensure you have reviewed all QC findings.")) return;
    signal ??= lifetime.current?.signal;
    setBusy(action); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/qc`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }), signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to fetch the QC report.");
      if (signal?.aborted) return;
      if (action === "refresh") {
        setPending(true); setNotice("Analysis requested. Waiting for LabelGrid’s updated report.");
      } else if (data.report) {
        setSnapshot(data.report); setPending(data.report.checksInProgress);
        setFetchedAt(new Date().toISOString());
      }
      if (action === "confirm") {
        setNotice("Confirmed into LabelGrid review.");
        router.refresh();
      }
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : "QC request failed.");
    } finally { if (!signal?.aborted) setBusy(null); }
  }, [releaseId, router]);

  useEffect(() => {
    if (!labelgridId || !canRefresh) return;
    const controller = new AbortController();
    lifetime.current = controller;
    const timer = setTimeout(() => { void run("sync", controller.signal); }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [labelgridId, canRefresh, run]);

  const status = pending ? "pending" : snapshot?.enabled === false ? "not_enabled" :
    snapshot ? deriveQcStatus(snapshot) : qcStatus === "not_enabled" ? "not_enabled" : "not_run";
  const available = Boolean(snapshot?.enabled && snapshot.hold && !pending && snapshot.generatedAt);
  const issues = available ? snapshot?.issues ?? [] : [];
  const canRerun = Boolean(snapshot?.enabled && snapshot.hold && !pending);
  const confirmError = snapshot ? qcConfirmationError({ ...snapshot, checksInProgress: pending }) : "Fetch a current report first.";
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-labelledby="preflight-qc-title" aria-busy={busy !== null}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3"><h2 id="preflight-qc-title" className="text-base font-semibold">Preflight QC</h2><QcBadge status={labelgridId ? status : "not_run"} /></div>
          <p className="text-xs text-muted-foreground">LabelGrid automated quality checks · Admin review remains required</p>
        </div>
        {canRefresh && labelgridId ? <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void run("sync")}>{busy === "sync" ? "Fetching…" : "Fetch report"}</Button>
          <Button type="button" variant="outline" disabled={busy !== null || !canRerun} title={!canRerun ? "Available only during a QC hold, with no checks running." : undefined} onClick={() => void run("refresh")}>{busy === "refresh" ? "Requesting…" : "Re-run analysis"}</Button>
          {snapshot?.hold && canConfirm ? <Button type="button" disabled={busy !== null || Boolean(confirmError)} title={confirmError ?? undefined} onClick={() => void run("confirm")}>{busy === "confirm" ? "Confirming…" : "Confirm into LabelGrid Review"}</Button> : null}
        </div> : null}
      </header>
      <div className="space-y-5 p-4 sm:p-5">
        <div className="border-l-2 border-primary bg-muted/40 px-4 py-3 text-sm leading-relaxed" role="status">{!labelgridId ? "Sync the release to LabelGrid to make its QC report available." : descriptions[status] ?? "Fetch the report for current findings."}</div>
        {error ? <p role="alert" className="border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error} {snapshot ? "The last fetched report remains visible below." : ""}</p> : null}
        {notice ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : null}
        {labelgridId && snapshot?.enabled ? <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs lg:grid-cols-3">
            {[
              ["Generated", dateLabel(snapshot.generatedAt)], ["Last fetched", dateLabel(fetchedAt)],
              ["Report profile", snapshot.profile ? `${snapshot.profile.name} · v${snapshot.profile.version}` : "Not available"],
              ["QC hold", snapshot.hold ? "Awaiting your review" : "Not on hold"],
              ["Review status", snapshot.reviewStatus?.replaceAll("_", " ") || "Not available"],
              ["Release status", snapshot.releaseStatus?.replaceAll("_", " ") || "Not available"],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
          </dl>
          {available ? <div className="border-t border-border pt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{snapshot.stale ? "Previous findings · Out of date" : "Findings"}</h3><p className="text-xs text-muted-foreground">{issues.length} total · {issues.filter((issue) => issue.isBlocking).length} blocking · {issues.filter((issue) => issue.requiresFeedback).length} need feedback</p></div>
            <div className="space-y-3">{issues.map((issue, index) => <details key={`${issue.id}-${index}`} className="border border-border p-3 sm:p-4" open={issue.isBlocking || undefined}>
              <summary className="cursor-pointer text-sm font-medium">{issue.title || issue.code || "QC finding"}<span className="ml-2 text-xs font-normal text-muted-foreground">{issue.severity || "Unspecified severity"} · {issue.isBlocking ? "Blocking" : "Non-blocking"}</span></summary>
              <div className="mt-3 space-y-3 text-sm">
                <p className="whitespace-pre-wrap break-words">{issue.customDescription || issue.message || "No description provided."}</p>
                {issue.customDescription && issue.message && issue.customDescription !== issue.message ? <p className="whitespace-pre-wrap text-muted-foreground">{issue.message}</p> : null}
                <p className="text-xs text-muted-foreground">Code: {issue.code || "Not supplied"} · Status: {issue.status || "Not supplied"}{issue.requiresFeedback ? " · Feedback required" : ""}</p>
                <div className="text-xs"><p className="font-medium">Affected tracks</p>{issue.affectedTracks.length ? <ul className="mt-1 space-y-1">{issue.affectedTracks.map((track) => <li key={track.id}>{track.title}{track.mixVersion ? ` (${track.mixVersion})` : ""} <span className="text-muted-foreground">· Track ID {track.id}</span></li>)}</ul> : <p className="mt-1 text-muted-foreground">Release-level finding</p>}</div>
                {issue.evidence.length ? <div className="space-y-2"><h4 className="text-xs font-semibold">Supporting evidence</h4>{issue.evidence.map((evidence, i) => <div key={i} className="space-y-1 bg-muted/40 p-3 text-xs">{Object.entries(evidence).filter(([, value]) => value !== null && value !== "").map(([key, value]) => {
                  const url = key === "store_url" ? safeEvidenceUrl(value) : null;
                  return <p key={key} className="break-words"><span className="text-muted-foreground">{key.replaceAll("_", " ")}: </span>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Open store reference</a> : typeof value === "object" ? JSON.stringify(value) : String(value)}</p>;
                })}</div>)}</div> : null}
              </div>
            </details>)}{!issues.length ? <p className="text-sm text-muted-foreground">{snapshot.stale ? "No findings in the previous report. Re-run checks for the current release." : "No issues reported for this completed hold."}</p> : null}</div>
          </div> : null}
        </> : null}
      </div>
    </section>
  );
}
