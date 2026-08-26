import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      summary: input.summary.slice(0, 500),
      metadataJson: JSON.stringify(input.metadata ?? {}),
      ip: input.ip ?? null,
    },
  });
}

export async function listAuditLogs(opts: {
  take?: number;
  skip?: number;
  action?: AuditAction;
  targetType?: string;
  targetId?: string;
}) {
  const where: Prisma.AuditLogWhereInput = {
    ...(opts.action ? { action: opts.action } : {}),
    ...(opts.targetType ? { targetType: opts.targetType } : {}),
    ...(opts.targetId ? { targetId: opts.targetId } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total };
}
