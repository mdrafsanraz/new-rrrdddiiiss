import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

/** Ownership-checked release load, shared by every /api/releases/[id]/submit/* route. */
export async function loadOwnedReleaseForSubmit(releaseId: string) {
  const user = await getSessionUser();
  if (!user) return { user: null, release: null } as const;
  const release = await prisma.release.findFirst({
    where: { id: releaseId, userId: user.id },
    include: { artist: true, tracks: { orderBy: { trackNumber: "asc" } } },
  });
  return { user, release } as const;
}

export async function loadOwnedTrackForSubmit(
  releaseId: string,
  trackId: string
) {
  const { user, release } = await loadOwnedReleaseForSubmit(releaseId);
  if (!user || !release) return { user, release: null, track: null } as const;
  const track = release.tracks.find((t) => t.id === trackId) ?? null;
  return { user, release, track } as const;
}
