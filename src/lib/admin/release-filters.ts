import type { Prisma, ReleaseStatus } from "@prisma/client";

export type AdminReleaseFilter =
  | "all"
  | "draft"
  | "pending_review"
  | "priority"
  | "qc_flagged"
  | "documents_required"
  | "changes_required"
  | "labelgrid_review"
  | "approved"
  | "delivering"
  | "live"
  | "rejected"
  | "takedown"
  | "takedown_pending"
  | "taken_down"
  | "action_required"
  | "sync_issues"
  | "on_hold";

export const ADMIN_RELEASE_FILTERS: {
  value: AdminReleaseFilter;
  label: string;
}[] = [
  { value: "all", label: "All Releases" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "In RDISTRO Review" },
  { value: "priority", label: "Priority" },
  { value: "qc_flagged", label: "QC Flagged" },
  { value: "documents_required", label: "Documents Required" },
  { value: "changes_required", label: "Changes Required" },
  { value: "labelgrid_review", label: "LabelGrid Review" },
  { value: "action_required", label: "Action Required" },
  { value: "approved", label: "Approved" },
  { value: "delivering", label: "Delivering" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "takedown_pending", label: "Takedown Pending" },
  { value: "taken_down", label: "Taken Down" },
  { value: "sync_issues", label: "Sync Issues" },
  { value: "on_hold", label: "On Hold" },
];

const PENDING: ReleaseStatus[] = [
  "pending_internal_review",
  "submitted",
  "in_review",
];
const CHANGES: ReleaseStatus[] = [
  "internal_changes_required",
  "changes_required",
  "labelgrid_changes_required",
];
const LG_REVIEW: ReleaseStatus[] = [
  "labelgrid_in_review",
  "submitting_to_labelgrid",
  "approved",
  "syncing",
  "internal_approved",
];
const REJECTED: ReleaseStatus[] = [
  "internal_rejected",
  "rejected",
  "labelgrid_rejected",
];
const TAKEDOWN: ReleaseStatus[] = ["takedown_pending", "taken_down"];
const SYNC: ReleaseStatus[] = ["sync_error", "error"];

export function adminReleaseWhere(
  filter: AdminReleaseFilter,
  q?: string,
  advanced: {
    user?: string;
    artist?: string;
    label?: string;
    upc?: string;
    isrc?: string;
    dateFrom?: Date;
    dateTo?: Date;
    dspStatus?: string;
    qc?: "yes" | "no";
    docs?: "yes" | "no";
  } = {}
): Prisma.ReleaseWhereInput {
  const search = q?.trim();
  const searchClause: Prisma.ReleaseWhereInput | undefined = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { catalogNumber: { contains: search, mode: "insensitive" } },
          { upc: { contains: search, mode: "insensitive" } },
          { labelgridId: { contains: search, mode: "insensitive" } },
          { id: { equals: search } },
          { artist: { name: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          {
            tracks: {
              some: { isrc: { contains: search, mode: "insensitive" } },
            },
          },
        ],
      }
    : undefined;

  let filterClause: Prisma.ReleaseWhereInput = {};
  switch (filter) {
    case "draft":
      filterClause = {
        status: { in: ["draft", "incomplete", "ready_to_submit"] },
      };
      break;
    case "pending_review":
      filterClause = { status: { in: PENDING } };
      break;
    case "priority":
      filterClause = { priorityReview: true, status: { in: PENDING } };
      break;
    case "qc_flagged":
      filterClause = {
        OR: [
          { qcStatus: { in: ["warning", "review_required", "failed"] } },
          {
            reviewIssues: {
              some: { source: "LABELGRID", resolved: false },
            },
          },
        ],
      };
      break;
    case "documents_required":
      filterClause = {
        OR: [
          {
            reviewIssues: {
              some: { requiresDocument: true, resolved: false },
            },
          },
          {
            documents: { some: { reviewStatus: "pending" } },
          },
        ],
      };
      break;
    case "changes_required":
      filterClause = { status: { in: CHANGES } };
      break;
    case "labelgrid_review":
      filterClause = { status: { in: LG_REVIEW } };
      break;
    case "approved":
      filterClause = { status: "labelgrid_approved" };
      break;
    case "delivering":
      filterClause = { status: "delivering" };
      break;
    case "live":
      filterClause = { status: "live" };
      break;
    case "rejected":
      filterClause = { status: { in: REJECTED } };
      break;
    case "takedown":
      filterClause = { status: { in: TAKEDOWN } };
      break;
    case "takedown_pending":
      filterClause = { status: "takedown_pending" };
      break;
    case "taken_down":
      filterClause = { status: "taken_down" };
      break;
    case "action_required":
      filterClause = {
        OR: [
          { status: { in: [...CHANGES, ...SYNC] } },
          { qcStatus: { in: ["warning", "review_required", "failed"] } },
          { reviewIssues: { some: { resolved: false, isBlocking: true } } },
          { documents: { some: { reviewStatus: "pending" } } },
        ],
      };
      break;
    case "sync_issues":
      filterClause = { status: { in: SYNC } };
      break;
    case "on_hold":
      filterClause = { status: "on_hold" };
      break;
    case "all":
    default:
      filterClause = {};
  }

  const advancedClauses: Prisma.ReleaseWhereInput[] = [];
  if (advanced.user) {
    advancedClauses.push({
      user: {
        OR: [
          { name: { contains: advanced.user, mode: "insensitive" } },
          { email: { contains: advanced.user, mode: "insensitive" } },
        ],
      },
    });
  }
  if (advanced.artist) {
    advancedClauses.push({
      artist: { name: { contains: advanced.artist, mode: "insensitive" } },
    });
  }
  if (advanced.label) {
    advancedClauses.push({
      label: { name: { contains: advanced.label, mode: "insensitive" } },
    });
  }
  if (advanced.upc) {
    advancedClauses.push({ upc: { contains: advanced.upc, mode: "insensitive" } });
  }
  if (advanced.isrc) {
    advancedClauses.push({
      tracks: { some: { isrc: { contains: advanced.isrc, mode: "insensitive" } } },
    });
  }
  if (advanced.dateFrom || advanced.dateTo) {
    advancedClauses.push({
      releaseDate: {
        ...(advanced.dateFrom ? { gte: advanced.dateFrom } : {}),
        ...(advanced.dateTo ? { lte: advanced.dateTo } : {}),
      },
    });
  }
  if (advanced.dspStatus) {
    advancedClauses.push({ deliveryState: advanced.dspStatus });
  }
  if (advanced.qc === "yes") {
    advancedClauses.push({
      qcStatus: { in: ["warning", "review_required", "failed"] },
    });
  } else if (advanced.qc === "no") {
    advancedClauses.push({
      OR: [
        { qcStatus: null },
        { qcStatus: { in: ["passed", "not_run", "not_enabled"] } },
      ],
    });
  }
  if (advanced.docs === "yes") {
    advancedClauses.push({
      OR: [
        { documents: { some: { reviewStatus: "pending" } } },
        { reviewIssues: { some: { requiresDocument: true, resolved: false } } },
      ],
    });
  } else if (advanced.docs === "no") {
    advancedClauses.push({ documents: { none: { reviewStatus: "pending" } } });
  }

  return {
    AND: [filterClause, ...(searchClause ? [searchClause] : []), ...advancedClauses],
  };
}

export const PIPELINE_STAGES = [
  {
    key: "draft",
    label: "Draft",
    href: "/admin/releases?filter=draft",
    statuses: ["draft", "incomplete", "ready_to_submit"] as ReleaseStatus[],
  },
  {
    key: "rdistro_review",
    label: "RDISTRO Review",
    href: "/admin/releases?filter=pending_review",
    statuses: PENDING,
  },
  {
    key: "labelgrid_review",
    label: "LabelGrid Review",
    href: "/admin/releases?filter=labelgrid_review",
    statuses: LG_REVIEW,
  },
  {
    key: "delivering",
    label: "Delivering",
    href: "/admin/releases?filter=delivering",
    statuses: ["delivering"] as ReleaseStatus[],
  },
  {
    key: "live",
    label: "Live",
    href: "/admin/releases?filter=live",
    statuses: ["live"] as ReleaseStatus[],
  },
] as const;
