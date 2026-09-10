/** Limit confirmed by LabelGrid's contributor-role validation response. */
export const MAX_CONTRIBUTOR_ROLES = 10;

export function contributorRoleLimitError(contributor: {
  firstName?: string;
  lastName?: string;
  roles: readonly string[];
}): string | null {
  if (contributor.roles.length <= MAX_CONTRIBUTOR_ROLES) return null;
  const name = [contributor.firstName, contributor.lastName].filter(Boolean).join(" ") || "this contributor";
  return `Choose no more than ${MAX_CONTRIBUTOR_ROLES} roles for ${name}. Remove the extra roles before continuing.`;
}

export function requiredWriterSplitsError(rows: readonly unknown[]): string | null {
  return rows.length > 0 ? null :
    "Add at least one writer in Writers & Composition Splits, select the required composition roles, and set shares totaling 100%. Contributor credits alone do not provide composition splits.";
}

/** Composition roles are covered across selected writers, not required per person. */
export function requiredCompositionRolesError(
  writers: readonly { writerId?: number | null; roles: readonly string[] }[],
  tracks: readonly { audioLanguage?: string }[],
): string | null {
  if (!tracks.some((track) => track.audioLanguage?.trim().toLowerCase() !== "zxx")) return null;
  const roles = new Set(writers.filter((writer) => writer.writerId).flatMap((writer) =>
    writer.roles.map((role) => role.trim().toLowerCase())
  ));
  const missing = ["Composer", "Lyricist"].filter((role) => !roles.has(role.toLowerCase()));
  return missing.length
    ? `Select ${missing.join(" and ")} in Writers & Composition Splits. Tracks with a vocal audio language require both Composer and Lyricist; only No linguistic content (zxx) is exempt. The roles can belong to the same writer or different writers.`
    : null;
}
