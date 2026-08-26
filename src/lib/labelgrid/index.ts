import { labelgridFetch } from "@/lib/labelgrid/client";
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

export function distributeRelease(id: number | string) {
  return labelgridFetch<unknown>(`/releases/${id}/distribute`, {
    method: "POST",
  });
}

export function listDistroOutlets() {
  return labelgridFetch<unknown>("/distro-outlets");
}
