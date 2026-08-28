import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Issues a single-use reset token; only its hash is persisted. Returns the raw token for the emailed link. */
export async function createPasswordResetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return rawToken;
}

/** Validates a raw token from a reset link. Does not mark it used — call `consumePasswordResetToken` after the password update succeeds. */
export async function findPasswordResetToken(rawToken: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }
  return record;
}

export async function consumePasswordResetToken(id: string) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
