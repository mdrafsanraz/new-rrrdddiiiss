import type { Prisma, ReleaseStatus } from "@prisma/client";

export type AdminReleaseFilter =
  | "all"
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
  | "sync_issues"
  | "on_hold";

export const ADMIN_RELEASE_FILTERS: {
  value: AdminReleaseFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending Review" },
  { value: "priority", label: "Priority" },
  { value: "qc_flagged", label: "QC Flagged" },
  { value: "documents_required", label: "Documents Required" },
  { value: "changes_required", label: "Changes Required" },
  { value: "labelgrid_review", label: "LabelGrid Review" },
  { value: "approved", label: "Approved" },
  { value: "delivering", label: "Delivering" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "takedown", label: "Takedown" },
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
  q?: string
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

  if (!searchClause) return filterClause;
  return { AND: [filterClause, searchClause] };
}

export const PIPELINE_STAGES = [
  {
    key: "draft",
    label: "Draft",
    href: "/admin/releases?filter=all&stage=draft",
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
