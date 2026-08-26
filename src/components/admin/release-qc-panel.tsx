"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { QcReportSnapshot } from "@/lib/labelgrid/quality-report";
import { QcBadge } from "@/components/admin/status-badges";

export function ReleaseQcPanel({
  releaseId,
  labelgridId,
  qcEnabled,
  qcStatus,
  qcStale,
  qcChecksInProgress,
  qcFetchedAt,
  report,
  canRefresh,
}: {
  releaseId: string;
  labelgridId: string | null;
  qcEnabled: boolean;
  qcStatus: string | null;
  qcStale: boolean;
  qcChecksInProgress: boolean;
  qcFetchedAt: string | null;
  report: QcReportSnapshot | null;
  canRefresh: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"idle" | "sync" | "refresh">("idle");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function run(action: "sync" | "refresh") {
    setError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/qc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "QC request failed");
        setBusy("idle");
        return;
      }
      router.refresh();
      setBusy("idle");
    } catch {
      setError("Network error");
      setBusy("idle");
    }
  }

  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Preflight QC</h2>
          <p className="text-[11px] text-muted-foreground">
            LabelGrid quality-report · informs review, does not auto-decide
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QcBadge status={qcStatus} />
          {canRefresh && labelgridId ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                disabled={busy !== "idle"}
                onClick={() => run("sync")}
              >
                {busy === "sync" ? "Fetching…" : "Fetch report"}
              </Button>
              {qcEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={busy !== "idle"}
                  onClick={() => run("refresh")}
                >
                  {busy === "refresh" ? "Refreshing…" : "Re-run analysis"}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-3">
        {!labelgridId ? (
          <p className="text-sm text-muted-foreground">
            Sync a LabelGrid draft before Preflight QC is available.
          </p>
        ) : !qcEnabled || qcStatus === "not_enabled" ? (
          <p className="text-sm text-muted-foreground">
            Preflight QC is not enabled on this LabelGrid account
            (`pre_review_qc_not_enabled`). Contact LabelGrid to enable the
            add-on. Local moderation continues without it.
          </p>
        ) : (
          <>
            <dl className="grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Overall</dt>
                <dd className="font-medium capitalize">
                  {qcStatus?.replace("_", " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stale</dt>
                <dd className="font-medium">{qcStale ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last fetched</dt>
                <dd className="font-medium">
                  {qcFetchedAt
                    ? new Date(qcFetchedAt).toLocaleString()
                    : "Never"}
                </dd>
              </div>
            </dl>
            {qcChecksInProgress ? (
              <p className="mt-3 text-xs text-amber-900">
                Checks in progress — refresh again when complete.
              </p>
            ) : null}
            {report?.issues?.length ? (
              <ul className="mt-4 space-y-2">
                {report.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-start justify-between gap-2 text-left"
                      onClick={() =>
                        setExpanded((v) => (v === issue.id ? null : issue.id))
                      }
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {issue.isBlocking ? "● " : "⚠ "}
                          {issue.title ?? issue.code}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {issue.affectedTracks.length
                            ? issue.affectedTracks
                                .map((t) => t.title)
                                .join(", ")
                            : "Release-level"}{" "}
                          · {issue.severity}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {expanded === issue.id ? "Hide" : "Details"}
                      </span>
                    </button>
                    {expanded === issue.id ? (
                      <div className="mt-2 space-y-2 border-t border-border pt-2 text-xs">
                        <p>{issue.message}</p>
                        {issue.customDescription ? (
                          <p className="text-muted-foreground">
                            {issue.customDescription}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {qcStatus === "passed"
                  ? "No issues reported."
                  : "No cached report yet — fetch to load findings."}
              </p>
            )}
          </>
        )}
        {error ? (
          <p className="mt-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
