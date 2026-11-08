import type { TrackCreditsDraft, WizardTrack } from "./wizard-types";
import { contributorRoleLimitError, requiredWriterSplitsError, requiredCompositionRolesError } from "./credit-validation";

function splitTotal(rows: { share: number }[]) {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.share) ? row.share : 0), 0);
}

/**
 * LabelGrid requires every track's contributors to cover these role
 * categories (its 422 lists whichever are still missing: "Each track needs
 * at least one contributor assigned to the role of …").
 */
const REQUIRED_ROLE_CATEGORIES = [
  "Performer",
  "Composition & Lyrics",
  "Production & Engineering",
] as const;

export function validateTrackCreditDraft(credits: TrackCreditsDraft, track: Pick<WizardTrack, "audioLanguage">, roleCategories?: Map<string, string>): string | null {
  const writerError = requiredWriterSplitsError(credits.writerSplits);
  if (writerError) return writerError;
  const compositionError = requiredCompositionRolesError(credits.writerSplits, [track]);
  if (compositionError) return compositionError;
  const contributorIds = new Set<number>();
  for (const contributor of credits.contributors) {
    const roleError = contributorRoleLimitError(contributor);
    if (roleError) return roleError;
    if (!contributor.writerId) continue;
    if (contributorIds.has(contributor.writerId)) {
      return `${contributor.firstName} ${contributor.lastName} is listed more than once in Contributors. Keep one row per person and add all their roles to that row.`;
    }
    contributorIds.add(contributor.writerId);
  }
  const ok = credits.contributors.some(
    (c) => c.writerId && c.roles.length > 0
  );
  if (!ok) {
    return "Add at least one contributor with a writer and at least one role.";
  }
  for (const c of credits.contributors) {
    if (c.writerId && c.roles.length === 0) {
      return `Pick at least one role for ${c.firstName} ${c.lastName}.`;
    }
  }
  const hasInstrumentalTrack = track.audioLanguage === "zxx";
  const contributorHasLyricist = credits.contributors.some((contributor) =>
    contributor.roles.some((role) => role.trim().toLowerCase() === "lyricist")
  );
  const writerHasLyricist = credits.writerSplits.some((writer) =>
    writer.roles.some((role) => role.trim().toLowerCase() === "lyricist")
  );
  if (hasInstrumentalTrack && (contributorHasLyricist || writerHasLyricist)) {
    return "An instrumental track cannot credit a Lyricist. Remove the Lyricist role, or select the track's vocal audio language.";
  }
  // Category coverage: LabelGrid rejects tracks whose contributors don't
  // span all required categories. Only checkable once the live catalog
  // (role → category) has loaded; the server still enforces it.
  if (roleCategories && roleCategories.size > 0) {
    const covered = new Set<string>();
    for (const c of credits.contributors) {
      for (const role of c.roles) {
        const category = roleCategories.get(role.trim().toLowerCase());
        if (category) covered.add(category.trim().toLowerCase());
      }
    }
    const missing = REQUIRED_ROLE_CATEGORIES.filter(
      (cat) => !covered.has(cat.toLowerCase())
    );
    if (missing.length > 0) {
      return `Contributors must cover ${missing.join(", ")} — add the matching role(s). The same contributor can hold multiple roles.`;
    }
  }
  if (credits.writerSplits.length > 0) {
    for (const w of credits.writerSplits) {
      if (!w.writerId) return "Every publishing split needs a writer.";
      if (w.roles.length === 0) {
        return `Pick at least one role for the publishing split of ${w.firstName} ${w.lastName}.`;
      }
    }
    if (Math.abs(splitTotal(credits.writerSplits) - 100) > 0.001) {
      return "Publishing splits must total exactly 100%.";
    }
  }
  if (!credits.selfPublished) {
    if (credits.publisherSplits.length === 0) {
      return "Add a publisher, or mark the release self-published.";
    }
    for (const p of credits.publisherSplits) {
      if (!p.publisherId) return "Every publisher row needs a publisher.";
    }
    if (Math.abs(splitTotal(credits.publisherSplits) - 100) > 0.001) {
      return "Publisher shares must total exactly 100%.";
    }
  }
  return null;
}
