/**
 * Human labels + badge tones for LabelGrid's documented state enums —
 * review_status, delivery-status state/outlet state/operation, and QC
 * severity. Every key here comes straight from document.json; an
 * unrecognized value still renders (title-cased, neutral tone) instead of
 * being dropped, since LabelGrid may return states this file doesn't know
 * about yet — never invented, never silently hidden.
 */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// review_status — LabelGridReviewStatus (src/lib/releases/status.ts)
const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  to_review: "In Review",
  audit: "In Review",
  pending_customer_review: "Pending Your Review",
  require_changes: "Changes Required",
  rejected: "Rejected",
  approved: "Approved",
};
const REVIEW_STATUS_TONES: Record<string, Tone> = {
  draft: "neutral",
  to_review: "info",
  audit: "info",
  pending_customer_review: "warning",
  require_changes: "warning",
  rejected: "danger",
  approved: "success",
};
export function reviewStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return REVIEW_STATUS_LABELS[status] ?? titleCase(status);
}
export function reviewStatusTone(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  return REVIEW_STATUS_TONES[status] ?? "neutral";
}

// Overall delivery state — GET /releases/{id}/delivery-status `.state`
const DELIVERY_STATE_LABELS: Record<string, string> = {
  not_submitted: "Not Submitted",
  in_progress: "Delivering",
  live: "Live",
  removing: "Removing",
  removed: "Removed",
  action_needed: "Action Needed",
};
const DELIVERY_STATE_TONES: Record<string, Tone> = {
  not_submitted: "neutral",
  in_progress: "info",
  live: "success",
  removing: "warning",
  removed: "neutral",
  action_needed: "danger",
};
export function deliveryStateLabel(state: string | null | undefined): string {
  if (!state) return "—";
  return DELIVERY_STATE_LABELS[state] ?? titleCase(state);
}
export function deliveryStateTone(state: string | null | undefined): Tone {
  if (!state) return "neutral";
  return DELIVERY_STATE_TONES[state] ?? "neutral";
}

// Per-outlet state — GET /releases/{id}/delivery-status `.outlets[].state`
const OUTLET_STATE_LABELS: Record<string, string> = {
  queued: "Queued",
  preparing: "Preparing",
  scheduled: "Scheduled",
  delivered: "Delivered",
  action_needed: "Action Needed",
  removing: "Removing",
  removed: "Removed",
};
const OUTLET_STATE_TONES: Record<string, Tone> = {
  queued: "neutral",
  preparing: "info",
  scheduled: "info",
  delivered: "success",
  action_needed: "danger",
  removing: "warning",
  removed: "neutral",
};
export function outletStateLabel(state: string | null | undefined): string {
  if (!state) return "—";
  return OUTLET_STATE_LABELS[state] ?? titleCase(state);
}
export function outletStateTone(state: string | null | undefined): Tone {
  if (!state) return "neutral";
  return OUTLET_STATE_TONES[state] ?? "neutral";
}

const OPERATION_LABELS: Record<string, string> = {
  delivery: "Delivery",
  redelivery: "Redelivery",
  takedown: "Takedown",
};
export function operationLabel(op: string | null | undefined): string {
  if (!op) return "—";
  return OPERATION_LABELS[op] ?? titleCase(op);
}

// QC issue severity — free-text per document.json (not an enum); map the
// common values, fall back to a neutral title-cased render for anything else.
const QC_SEVERITY_TONES: Record<string, Tone> = {
  blocking: "danger",
  critical: "danger",
  error: "danger",
  required: "danger",
  warning: "warning",
  warn: "warning",
  info: "info",
  informational: "info",
  notice: "info",
};
export function qcSeverityLabel(severity: string | null | undefined): string {
  if (!severity) return "—";
  return titleCase(severity);
}
export function qcSeverityTone(
  severity: string | null | undefined,
  isBlocking?: boolean
): Tone {
  if (isBlocking) return "danger";
  if (!severity) return "neutral";
  return QC_SEVERITY_TONES[severity.toLowerCase()] ?? "neutral";
}

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-900 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-800 dark:text-red-400",
};
