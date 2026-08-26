import { labelgridFetch, labelgridUpload } from "@/lib/labelgrid/client";
import type {
  ArtistData,
  Paginated,
  ReleaseData,
  UserResource,
} from "@/lib/labelgrid/types";

export function getMe() {
  return labelgridFetch<UserResource>("/me");
}

export function listArtists(page = 1, perPage = 50) {
  return labelgridFetch<Paginated<ArtistData>>("/artists", {
    searchParams: { page, per_page: perPage },
  });
}

export function createArtist(body: {
  artist_name: string;
  full_name?: string;
  email?: string;
  location?: string;
  bio_short?: string;
}) {
  return labelgridFetch<{ data: ArtistData }>("/artists", {
    method: "POST",
    body,
  });
}

export function getArtist(id: number | string) {
  return labelgridFetch<{ data: ArtistData }>(`/artists/${id}`);
}

export function updateArtist(
  id: number | string,
  body: Partial<{
    artist_name: string;
    full_name: string;
    email: string;
    location: string;
    bio_short: string;
  }>
) {
  return labelgridFetch<{ data: ArtistData }>(`/artists/${id}`, {
    method: "PATCH",
    body,
  });
}

export function listReleases(page = 1, perPage = 50) {
  return labelgridFetch<Paginated<ReleaseData>>("/releases", {
    searchParams: { page, per_page: perPage },
  });
}

export function createRelease(body: Record<string, unknown>) {
  return labelgridFetch<{ data: ReleaseData }>("/releases", {
    method: "POST",
    body,
  });
}

export function getRelease(id: number | string) {
  return labelgridFetch<{ data: ReleaseData }>(`/releases/${id}`);
}

export function updateRelease(id: number | string, body: Record<string, unknown>) {
  return labelgridFetch<{ data: ReleaseData }>(`/releases/${id}`, {
    method: "PATCH",
    body,
  });
}

export function validateRelease(id: number | string) {
  return labelgridFetch<unknown>(`/releases/${id}/validate`, {
    method: "POST",
  });
}

/**
 * Submit a draft release into LabelGrid's distribution review queue.
 * (OpenAPI: POST /releases/{id}/distribute)
 */
export function submitReleaseForReview(id: number | string) {
  return labelgridFetch<unknown>(`/releases/${id}/distribute`, {
    method: "POST",
  });
}

/**
 * Pull a release back from LabelGrid review to draft (editable again).
 * Pair with changes_required locally.
 */
export function withdrawReleaseFromReview(id: number | string) {
  return labelgridFetch<unknown>(`/releases/${id}/withdraw-review`, {
    method: "POST",
  });
}

/** @deprecated Prefer submitReleaseForReview — same endpoint. */
export function distributeRelease(id: number | string) {
  return submitReleaseForReview(id);
}

export function listDistroOutlets() {
  return labelgridFetch<unknown>("/distro-outlets");
}

export function listLabels(page = 1, perPage = 50) {
  return labelgridFetch<Paginated<{ id: number; name?: string }>>("/labels", {
    searchParams: { page, per_page: perPage },
  });
}

export function listGenres(page = 1, perPage = 200) {
  return labelgridFetch<
    Paginated<{ id: number; name?: string; title?: string }>
  >("/genres", {
    searchParams: { page, per_page: perPage },
  });
}

export function createWriter(body: {
  first_name: string;
  last_name: string;
  email?: string;
}) {
  return labelgridFetch<{ data: { id: number } }>("/writers", {
    method: "POST",
    body,
  });
}

export function createTrack(body: Record<string, unknown>) {
  return labelgridFetch<{ data: { id: number } }>("/tracks", {
    method: "POST",
    body,
  });
}

export async function uploadReleasePhoto(
  releaseId: number | string,
  file: Blob,
  filename: string
) {
  const form = new FormData();
  form.append("file", file, filename);
  return labelgridUpload<unknown>(`/releases/${releaseId}/photo`, form);
}

export function getTrackFileUploadUrl(
  trackId: number | string,
  fileType: "stereo" | "dolby" | "lyrics",
  filename: string
) {
  return labelgridFetch<{ upload_url: string; key: string; expires_in: number }>(
    `/tracks/${trackId}/files/${fileType}/upload-url`,
    {
      method: "POST",
      body: { filename },
    }
  );
}

export function storeTrackFile(
  trackId: number | string,
  fileType: "stereo" | "dolby" | "lyrics",
  body: { s3_key: string; checksum?: string | null }
) {
  return labelgridFetch<unknown>(`/tracks/${trackId}/files/${fileType}`, {
    method: "PUT",
    body,
  });
}

export async function uploadTrackStereoAudio(
  trackId: number | string,
  file: { buffer: Buffer; filename: string; mimeType: string }
) {
  const raw = await getTrackFileUploadUrl(trackId, "stereo", file.filename);
  const payload =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data: { upload_url: string; key: string } }).data
      : (raw as { upload_url: string; key: string });

  const upload_url = payload.upload_url;
  const key = payload.key;
  if (!upload_url || !key) {
    throw new Error("LabelGrid did not return an upload URL for stereo audio");
  }

  const put = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
    },
    body: new Uint8Array(file.buffer),
  });

  if (!put.ok) {
    const text = await put.text().catch(() => "");
    throw new Error(
      `Presigned audio upload failed (${put.status})${text ? `: ${text.slice(0, 200)}` : ""}`
    );
  }

  await storeTrackFile(trackId, "stereo", { s3_key: key });
  return { key };
}
