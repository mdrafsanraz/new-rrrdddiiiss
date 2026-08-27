import { prisma } from "@/lib/db";

/**
 * Server-side mutex for the Step-5 submission flow. A client-side disabled
 * button can't stop two browser tabs (or a double-fired request) from both
 * racing past a "does this LabelGrid object already exist" check before
 * either persists its result — that race spans an external LabelGrid API
 * call. This makes each stage atomic against concurrent runs for the same
 * release via a single conditional UPDATE (Postgres serializes concurrent
 * UPDATEs to the same row, so only one caller's `updateMany` can ever see
 * count===1 for a given claim).
 *
 * Locks older than STALE_MS are treated as abandoned (crashed tab, network
 * death mid-run) and are reclaimable rather than permanently blocking retry.
 */
const STALE_MS = 90_000;

export type LockResult = { acquired: true } | { acquired: false };

export async function acquireSubmissionLock(
  releaseId: string
): Promise<LockResult> {
  const staleCutoff = new Date(Date.now() - STALE_MS);
  const claimed = await prisma.release.updateMany({
    where: {
      id: releaseId,
      OR: [
        { submissionLockedAt: null },
        { submissionLockedAt: { lt: staleCutoff } },
      ],
    },
    data: { submissionLockedAt: new Date() },
  });
  return claimed.count > 0 ? { acquired: true } : { acquired: false };
}

export async function releaseSubmissionLock(releaseId: string): Promise<void> {
  await prisma.release.updateMany({
    where: { id: releaseId },
    data: { submissionLockedAt: null },
  });
}

/**
 * Acquire the lock, run `fn`, always release it (success or throw) — the
 * standard shape every submit/* stage route should wrap its LabelGrid work
 * in. Returns a 409-shaped result if the lock is already held instead of
 * running `fn` at all.
 */
export async function withSubmissionLock<T>(
  releaseId: string,
  fn: () => Promise<T>
): Promise<{ ok: true; result: T } | { ok: false; locked: true }> {
  const lock = await acquireSubmissionLock(releaseId);
  if (!lock.acquired) {
    return { ok: false, locked: true };
  }
  try {
    const result = await fn();
    return { ok: true, result };
  } finally {
    await releaseSubmissionLock(releaseId);
  }
}
