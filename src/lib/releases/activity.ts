import type { Prisma, ReleaseActivityType } from "@prisma/client";
import { prisma } from "@/lib/db";

type LogInput = {
  releaseId: string;
  type: ReleaseActivityType;
  title: string;
  description?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};

/** Append-only release timeline entry. */
export async function logReleaseActivity(input: LogInput) {
  const client = input.tx ?? prisma;
  return client.releaseActivity.create({
    data: {
      releaseId: input.releaseId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      actorUserId: input.actorUserId ?? null,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    },
  });
}
