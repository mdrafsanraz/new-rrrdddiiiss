export function artistSelectionError(primary: string, main: string[] = [], featured: string[] = []): string | null {
  const all = [primary, ...main, ...featured].filter(Boolean);
  return new Set(all).size !== all.length
    ? "Select each artist once, as either a main or featured artist."
    : null;
}

export function buildArtistCredits(primary: number, main: number[], featured: number[], primaryRole = "MainArtist") {
  if (artistSelectionError(String(primary), main.map(String), featured.map(String))) {
    throw new Error("Selected artists map to the same LabelGrid profile. Select each artist only once.");
  }
  return [
    { artist_id: primary, artistic_role: primaryRole },
    ...main.map((artist_id) => ({ artist_id, artistic_role: "MainArtist" })),
    ...featured.map((artist_id) => ({ artist_id, artistic_role: "FeaturedArtist" })),
  ].map((artist, index) => ({ ...artist, position: index + 1 }));
}
