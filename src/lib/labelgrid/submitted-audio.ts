import { getTrackFile } from "./index";
import { LabelGridApiError } from "./client";

export async function getSubmittedAudioUrl(
  trackId: string,
  load: (id: string) => Promise<unknown> = (id) => getTrackFile(id, "stereo"),
): Promise<string | null> {
  try {
    const raw = await load(trackId);
    if (!raw || typeof raw !== "object") return null;
    const file = "data" in raw ? raw.data : raw;
    if (!file || typeof file !== "object" || !("url" in file)) return null;
    return typeof file.url === "string" && file.url.trim() ? file.url : null;
  } catch (error) {
    if (error instanceof LabelGridApiError && error.status === 404) return null;
    throw error;
  }
}
