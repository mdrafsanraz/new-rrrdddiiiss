import type { QcIssue } from "./quality-report";

export function deriveQcStatus(input: {
  checksInProgress: boolean;
  stale: boolean;
  hold: boolean;
  generatedAt: string | null;
  issues: QcIssue[];
}): string {
  if (input.checksInProgress) return "pending";
  if (input.stale) return "stale";
  if (!input.generatedAt) return "not_run";
  // The API hides findings outside a completed customer-review hold.
  if (!input.hold) return "not_held";
  if (!input.issues.length) return "passed";
  return input.issues.some((issue) => issue.isBlocking) ? "review_required" : "warning";
}

export function safeEvidenceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function qcConfirmationError(report: {
  enabled: boolean; hold: boolean; checksInProgress: boolean; stale: boolean; generatedAt: string | null;
}): string | null {
  if (!report.enabled) return "Preflight QC is not enabled.";
  if (!report.hold) return "This release is not awaiting your Preflight QC review.";
  if (report.checksInProgress) return "Wait for the QC checks to finish before confirming.";
  if (report.stale) return "The report is stale. Re-run analysis after your edits before confirming.";
  if (!report.generatedAt) return "A completed QC report is required before confirming.";
  return null;
}
