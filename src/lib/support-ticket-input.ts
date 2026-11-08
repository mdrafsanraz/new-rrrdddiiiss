import { z } from "zod";

export const userSupportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum(["general", "release", "billing", "account", "technical"]),
  body: z.string().trim().min(10).max(8000),
  releaseReference: z.string().trim().transform((value) => value.replace(/^#+\s*/, "").trim())
    .pipe(z.string().max(100).refine((value) => !/[\r\n]/.test(value), "Enter the UPC or catalog number on one line."))
    .optional(),
}).superRefine((data, context) => {
  if (data.category === "release" && !data.releaseReference) {
    context.addIssue({ code: "custom", path: ["releaseReference"], message: "Enter the release UPC or catalog number." });
  }
});

export function supportTicketMessage(input: z.infer<typeof userSupportTicketSchema>) {
  return input.category === "release" ? `#${input.releaseReference} - ${input.body}` : input.body;
}
