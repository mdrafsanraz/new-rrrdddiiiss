const AUDD_ENDPOINT = "https://api.audd.io/";
const AUDD_TIMEOUT_MS = 60_000;

export type AuddMatch = {
  artist: string | null;
  title: string | null;
  album: string | null;
  label: string | null;
  releaseDate: string | null;
  timecode: string | null;
  songLink: string | null;
  isrc: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
};

export type AuddIdentification = {
  recognized: boolean;
  message: string;
  match: AuddMatch | null;
};

export function isAuddConfigured(): boolean {
  return Boolean(process.env.AUDD_API_TOKEN?.trim());
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export async function identifyAudioUrlWithAudd(
  audioUrl: string,
): Promise<AuddIdentification> {
  const token = process.env.AUDD_API_TOKEN?.trim();
  if (!token) throw new Error("AudD is not configured.");

  const form = new FormData();
  form.set("api_token", token);
  form.set("url", audioUrl);
  form.set("return", "apple_music,spotify");

  let response: Response;
  try {
    response = await fetch(AUDD_ENDPOINT, {
      method: "POST",
      body: form,
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(AUDD_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("AudD recognition timed out.");
    }
    throw error;
  }

  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!response.ok || !payload) {
    throw new Error(`AudD recognition returned ${response.status}.`);
  }
  if (payload.status !== "success") {
    const error = object(payload.error);
    throw new Error(text(error.error_message) ?? "AudD recognition failed.");
  }
  if (!payload.result) {
    return { recognized: false, message: "No match", match: null };
  }

  const result = object(payload.result);
  const spotify = object(result.spotify);
  const spotifyExternalIds = object(spotify.external_ids);
  const spotifyExternalUrls = object(spotify.external_urls);
  const appleMusic = object(result.apple_music);
  return {
    recognized: true,
    message: "Success",
    match: {
      artist: text(result.artist),
      title: text(result.title),
      album: text(result.album),
      label: text(result.label),
      releaseDate: text(result.release_date),
      timecode: text(result.timecode),
      songLink: text(result.song_link),
      isrc: text(spotifyExternalIds.isrc) ?? text(result.isrc),
      spotifyUrl: text(spotifyExternalUrls.spotify),
      appleMusicUrl: text(appleMusic.url),
    },
  };
}
