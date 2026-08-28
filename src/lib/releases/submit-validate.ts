import type { Artist, Release, Track } from "@prisma/client";
import {
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";

type ReleaseForValidate = Release & {
  artist: Artist | null;
  tracks: Track[];
};

function splitTotal(rows: Array<{ share: number }>): number {
  return rows.reduce((sum, r) => sum + (Number.isFinite(r.share) ? r.share : 0), 0);
}

/**
 * Stage 1 (Prepare & Validate) of the Step-5 submission flow — a
 * server-side re-check of the same completeness rules the wizard's client-
 * side `validateStep` already enforced, run against the persisted DB row
 * rather than trusting the client. Returns human-readable error strings
 * (empty = valid). Deliberately does not re-resolve the live
 * contributor-role catalog (category coverage etc.) — that's the client's
 * job for fast feedback, and LabelGrid's own track-create call is the
 * final authority on role validity regardless.
 */
export function validateReleaseForSubmit(
  release: ReleaseForValidate
): string[] {
  const errors: string[] = [];
  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);

  if (!release.title.trim() || release.title === "Untitled release") {
    errors.push("Please enter a release title.");
  }
  if (!release.artist || !release.artistId) {
    errors.push("Please select an artist.");
  }
  if (!rMeta.primaryGenreId) {
    errors.push("Please choose a primary genre.");
  }
  if (!release.releaseDate) {
    errors.push("Please choose a release date.");
  }

  const stores = parseJsonObject<{ allStores?: boolean; outletKeys?: string[] }>(
    release.storesJson
  );
  const allStores = stores.allStores ?? rMeta.allStores ?? true;
  if (!allStores && (stores.outletKeys ?? rMeta.selectedOutletKeys ?? []).length === 0) {
    errors.push("Select all stores, or choose at least one store.");
  }
  const territories = parseJsonObject<{ worldwide?: boolean; codes?: string[] }>(
    release.territoriesJson
  );
  const worldwide = territories.worldwide ?? rMeta.worldwide ?? true;
  if (!worldwide && (territories.codes ?? rMeta.territoryCodes ?? []).length === 0) {
    errors.push("Choose worldwide, or select at least one territory.");
  }

  if (release.tracks.length === 0) {
    errors.push("Please add at least one track.");
  }
  if (release.contentType === "Single" && release.tracks.length !== 1) {
    errors.push("A single must contain exactly one track.");
  }

  let anyContributor = false;
  for (const t of release.tracks) {
    const tMeta = parseJsonObject<TrackMetadata>(t.metadataJson);
    if (!t.title.trim()) {
      errors.push(`Track ${t.trackNumber} is missing a title.`);
    }
    if (
      release.contentType === "Single" &&
      t.title.trim() !== release.title.trim()
    ) {
      errors.push(
        "For a single, the release title and track title must match exactly."
      );
    }
    if (tMeta.licenseType === "cover" && !tMeta.originalTrackLink?.trim()) {
      errors.push(
        `"${t.title}" needs a link to the original recording (required for cover licenses).`
      );
    }
    if (tMeta.contributors?.some((c) => c.writerId && c.roles.length > 0)) {
      anyContributor = true;
    }
  }
  if (!anyContributor) {
    errors.push("Add at least one contributor with a writer and at least one role.");
  }

  const writerSplits = rMeta.writerSplits ?? [];
  if (writerSplits.length > 0) {
    for (const w of writerSplits) {
      if (!w.writerId) errors.push("Every publishing split needs a writer.");
      if (!w.roles?.length) {
        errors.push(`Pick at least one role for the publishing split of ${w.firstName} ${w.lastName}.`);
      }
    }
    if (Math.abs(splitTotal(writerSplits) - 100) > 0.001) {
      errors.push("Publishing splits must total exactly 100%.");
    }
  }

  if (!rMeta.selfPublished) {
    const publisherSplits = rMeta.publisherSplits ?? [];
    if (publisherSplits.length === 0) {
      errors.push("Add a publisher, or mark the release self-published.");
    } else {
      for (const p of publisherSplits) {
        if (!p.publisherId) errors.push("Every publisher row needs a publisher.");
      }
      if (Math.abs(splitTotal(publisherSplits) - 100) > 0.001) {
        errors.push("Publisher shares must total exactly 100%.");
      }
    }
  }

  if (!rMeta.clineName?.trim() || !rMeta.plineName?.trim()) {
    errors.push("Please fill in © and ℗ owner names.");
  }
  if (!rMeta.clineYear || !rMeta.plineYear) {
    errors.push("Please fill in © and ℗ years.");
  }

  return errors;
}
