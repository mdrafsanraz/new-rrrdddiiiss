/** Subset of LabelGrid OpenAPI types used by RDISTRO (from document.json). */

export type ArtistData = {
  id: number;
  public_id: string | null;
  artist_name: string | null;
  full_name?: string | null;
  email?: string | null;
  location?: string | null;
  bio_short?: string | null;
  bio_full?: string | null;
  website?: string | null;
  isni?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  soundcloud_url?: string | null;
  youtube_url?: string | null;
  youtubemusic_url?: string | null;
  spotify_url?: string | null;
  beatport_url?: string | null;
  juno_url?: string | null;
  bandcamp_url?: string | null;
  applemusic_url?: string | null;
  amazon_url?: string | null;
  deezer_url?: string | null;
  tidal_url?: string | null;
  pandora_url?: string | null;
  anghami_url?: string | null;
  boomplay_url?: string | null;
  iheartradio_url?: string | null;
  jiosaavn_url?: string | null;
  awa_url?: string | null;
  netease_url?: string | null;
  tencentku_url?: string | null;
  tencentqq_url?: string | null;
  yandex_url?: string | null;
  preferred_url?: string | null;
  spotify_artist_id?: string | null;
  apple_artist_id?: string | null;
};

/** Per document.json — release-title localization row. */
export type ReleaseTitleLocalizationData = {
  iso_code?: string | null;
  text?: string | null;
  phonetic?: string | null;
};

export type ReleaseArtistRow = {
  artist?: { id?: number; artist_name?: string } | null;
  artistic_role?: string | null;
};

export type DspConfigRow = { distro_outlet_id: string; enabled: boolean };
export type ReleaseDateExclusionRow = {
  countries?: string[];
  exclude?: boolean;
};

export type ReleaseData = {
  id: number;
  public_id: string;
  /** Runtime shape nests the artist under `.artist` (confirmed via the live
   * labelgrid-snapshot endpoint) — not the flat shape the field name alone
   * suggests. */
  artists?: ReleaseArtistRow[] | null;
  titles?: ReleaseTitleLocalizationData[];
  mix_versions?: ReleaseTitleLocalizationData[];
  title?: string | null;
  mix_version?: string | null;
  cat?: string;
  release_date?: string | null;
  barcode_number?: string | null;
  review_status?: string | null;
  delivery_status?: string | null;
  locked?: boolean;
  front_cover?: FileData | null;
  content_type?: string | null;
  primary_genre?: { id?: number; name?: string } | null;
  preferred_localization?: string | null;
  artwork_ai_usage?: string | null;
  explicit?: string | null;
  cline_year?: number | null;
  cline_name?: string | null;
  pline_year?: number | null;
  pline_name?: string | null;
  dsp_configs?: DspConfigRow[] | null;
  release_dates?: ReleaseDateExclusionRow[] | null;
  tracks?: TrackData[] | null;
};

export type FileData = {
  filename?: string;
  url?: string;
  filesize?: number | null;
  status?: string | null;
};

export type WriterData = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

/**
 * A track's `contributors[]`/`writers[]` entry. document.json types these as
 * TrackContributorUpdateData/TrackWriterUpdateData (writer_id + roles only)
 * even on read responses — `writer` is read defensively in case the live
 * API embeds it despite the spec, with a local-mapping-cache fallback for
 * display name (see live-release.ts).
 */
export type TrackCreditRow = {
  writer_id: number;
  roles?: Record<string, string> | null;
  writer?: { id?: number; first_name?: string | null; last_name?: string | null } | null;
};

export type TrackWriterRow = TrackCreditRow & { percentage_share?: number | null };
export type TrackContributorRow = TrackCreditRow & { ai_contribution?: string | null };

export type TrackPublisherRow = {
  id: number;
  regions?: Record<string, string> | null;
  percentage_share?: number | null;
  publisher?: { id?: number; name?: string | null } | null;
};

export type TrackArtistRow = {
  artist_id: number;
  artist?: { id?: number; artist_name?: string } | null;
  artistic_role: string;
  position?: number | null;
};

export type TrackData = {
  id: number;
  public_id?: string;
  release_id?: number | null;
  track_num?: number | null;
  titles?: { iso_code?: string; text?: string }[];
  title?: string | null;
  mix_version?: string | null;
  mix_versions?: { iso_code?: string; text?: string }[];
  artists?: TrackArtistRow[] | null;
  default_display_artist?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  explicit?: string | null;
  audio_preview_url?: string | null;
  writers?: TrackWriterRow[] | null;
  contributors?: TrackContributorRow[] | null;
  publishers?: TrackPublisherRow[] | null;
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

export type GenreData = {
  id: number;
  name: string;
  category?: string | null;
  base_genre?: string | null;
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
