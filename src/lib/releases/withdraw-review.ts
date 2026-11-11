import { z } from "zod";

export const withdrawalStatuses = [
  { value: "in_review", label: "In review" },
  { value: "taken_down", label: "Taken down" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
] as const;

export const withdrawalSchema = z.object({
  status: z.enum(["in_review", "taken_down", "rejected", "draft"]).default("in_review"),
}).strict();

export type WithdrawalStatus = z.infer<typeof withdrawalSchema>["status"];

export function withdrawalStatusUpdate(status: WithdrawalStatus) {
  return {
    status: status === "in_review" ? "internal_approved" as const
      : status === "rejected" ? "internal_rejected" as const : status,
    manualTakenDown: status === "taken_down",
    permanentlyLocked: status === "rejected",
    internalRejectionReason: null,
    reviewNotes: status === "in_review"
      ? "RDISTRO is preparing this release for resubmission. Your release remains in review."
      : null,
  };
}
