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
    "Add at least one writer in Writers & Composition Splits, select Composer and/or Lyricist, and set shares totaling 100%. Contributor credits alone do not provide composition splits.";
}
