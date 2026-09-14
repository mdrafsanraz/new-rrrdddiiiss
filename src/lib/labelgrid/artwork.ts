import { getRelease } from "./index";
import { unwrapLabelGridData } from "./catalog";
import type { ReleaseData } from "./types";

/** A local URL or an upload acknowledgement is not proof of an attached cover. */
export async function getSubmittedArtworkUrl(
  releaseId: string | number,
  load: (id: string | number) => Promise<unknown> = getRelease,
): Promise<string | null> {
  const release = unwrapLabelGridData<ReleaseData>(await load(releaseId));
  const url = release?.front_cover?.url;
  return typeof url === "string" && url.trim() ? url : null;
}
