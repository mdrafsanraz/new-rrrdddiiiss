/** Subset of LabelGrid OpenAPI types used by RDISTRO (from document.json). */

export type ArtistData = {
  id: number;
  public_id: string | null;
  artist_name: string | null;
  full_name?: string | null;
  email?: string | null;
  location?: string | null;
  bio_short?: string | null;
  spotify_url?: string | null;
  applemusic_url?: string | null;
};

export type ReleaseTitleLocalizationData = {
  locale?: string | null;
  title?: string | null;
};

export type ReleaseData = {
  id: number;
  public_id: string;
  artists?: { id?: number; artist_name?: string } | null;
  titles?: ReleaseTitleLocalizationData[];
  cat?: string;
  release_date?: string | null;
  barcode_number?: string | null;
  review_status?: string | null;
  delivery_status?: string | null;
  locked?: boolean;
};

export type UserResource = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username: string;
  stats: {
    tracks_count: number;
    labels_count: number;
    tracks_limit: number | null;
    labels_limit: number | null;
    tracks_remaining: number | null;
    labels_remaining: number | null;
  };
  release_submission_limit: string;
  terms_acceptance: string;
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};
