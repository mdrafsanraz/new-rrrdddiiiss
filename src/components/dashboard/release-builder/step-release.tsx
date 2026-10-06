"use client";

/**
 * Step 1 — Release. Every field maps to a real LabelGrid release field:
 * artwork (+ artwork_ai_usage), transfer_from_distributor + original
 * release date, titles, artists, content_type, mix_versions,
 * primary_genre_id (live GET /genres), release_date, barcode_number,
 * preferred_localization. The label is the configured shared RDISTRO
 * LabelGrid label (server-side LABELGRID_LABEL_ID) — shown, not editable.
 */

import { Field } from "@/components/site/field";
import { MetadataLanguage } from "./metadata-language";
import type { WizardState } from "@/lib/releases/wizard-types";
import {
  CatalogStatus,
  MediaDropzone,
  Panel,
  ChipGroup,
  YesNo,
  REQUIRED_ARTWORK_SIZE,
  readImageFileDimensions,
  type CatalogState,
  type GenreOption,
  type TerritoryOption,
} from "./shared";

const CONTENT_TYPE_OPTIONS = ["Single", "EP", "Album"] as const;
const AI_USAGE_LABELS = [
  { value: "none", label: "No AI" },
  { value: "some", label: "Some AI" },
  { value: "material", label: "Mostly AI" },
  { value: "all", label: "Fully AI" },
] as const;

export type ArtistOption = { id: string; name: string };

function ArtistDropdown({ id, label, artists, selected, excluded, onChange }: {
  id: string; label: string; artists: ArtistOption[]; selected: string[];
  excluded: string[]; onChange: (ids: string[]) => void;
}) {
  const available = artists.filter((artist) => !selected.includes(artist.id) && !excluded.includes(artist.id));
  return (
    <div className="space-y-2">
      <Field id={id} label={label} as="select" value="" disabled={!available.length}
        onChange={(event) => { if (event.target.value) onChange([...selected, event.target.value]); }}>
        <option value="">{available.length ? "Select artist to add" : "No more artists available"}</option>
        {available.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}
      </Field>
      {selected.length ? <div className="flex flex-wrap gap-1.5">
        {selected.map((artistId) => {
          const name = artists.find((artist) => artist.id === artistId)?.name ?? "Unavailable artist";
          return <button key={artistId} type="button" aria-label={`Remove ${name} from ${label}`}
            onClick={() => onChange(selected.filter((value) => value !== artistId))}
            className="rounded border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/60">
            {name} <span aria-hidden="true">×</span>
          </button>;
        })}
      </div> : null}
    </div>
  );
}

export function StepRelease({
  state,
  patch,
  artists,
  genres,
  territories,
  setError,
}: {
  state: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  artists: ArtistOption[];
  genres: CatalogState<GenreOption>;
  territories: CatalogState<TerritoryOption>;
  setError: (message: string) => void;
}) {
  return (
    <>
      <Panel className="space-y-5">
        <MediaDropzone
          id="artwork"
          label="Cover artwork"
          required
          accept="image/jpeg,image/png,image/webp"
          kind="image"
          file={state.artworkFile}
          previewUrl={state.artworkPreview ?? state.artworkUrl}
          onFile={async (file) => {
            if (!file) {
              patch({ artworkFile: null, artworkPreview: null, artworkUrl: null });
              return;
            }
            setError("");
            const dims = await readImageFileDimensions(file);
            if (
              !dims ||
              dims.width !== REQUIRED_ARTWORK_SIZE ||
              dims.height !== REQUIRED_ARTWORK_SIZE
            ) {
              setError(
                dims
                  ? `Cover artwork must be exactly ${REQUIRED_ARTWORK_SIZE}×${REQUIRED_ARTWORK_SIZE}px — this file is ${dims.width}×${dims.height}px.`
                  : "Could not read this image. Try a different file."
              );
              return;
            }
            patch({
              artworkFile: file,
              artworkPreview: URL.createObjectURL(file),
              artworkUrl: null,
            });
          }}
          helper={`Exactly ${REQUIRED_ARTWORK_SIZE}×${REQUIRED_ARTWORK_SIZE}px required — square JPEG, PNG, or WebP.`}
        />

        <div className="grid gap-2">
          <p className="text-sm font-medium">Artwork AI usage <span className="text-destructive" aria-hidden="true">*</span></p>
          <ChipGroup
            options={AI_USAGE_LABELS}
            value={state.artworkAiUsage}
            onChange={(v) =>
              patch({ artworkAiUsage: v as WizardState["artworkAiUsage"] })
            }
          />
        </div>
      </Panel>

      <Panel className="space-y-5">
        <YesNo
          label="Are you transferring this release from another distributor?"
          required
          value={state.isTransfer}
          onChange={(yes) =>
            patch({
              isTransfer: yes,
              ...(yes
                ? {}
                : {
                    transferFromDistributor: "",
                    originalReleaseDate: "",
                    ...(state.releaseDate
                      ? { clineYear: state.releaseDate.slice(0, 4), plineYear: state.releaseDate.slice(0, 4) }
                      : {}),
                  }),
            })
          }
        />
        {state.isTransfer ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="transferFrom"
              label="Previous distributor"
              required
              value={state.transferFromDistributor}
              onChange={(e) =>
                patch({ transferFromDistributor: e.target.value })
              }
              placeholder="e.g. DistroKid"
            />
            <Field
              id="originalReleaseDate"
              label="Original release date"
              type="date"
              required
              value={state.originalReleaseDate}
              onChange={(e) => {
                const date = e.target.value;
                patch({
                  originalReleaseDate: date,
                  ...(date ? { clineYear: date.slice(0, 4), plineYear: date.slice(0, 4) } : {}),
                });
              }}
              helper="The date this release first went live with your previous distributor."
            />
          </div>
        ) : null}
      </Panel>

      <Panel className="space-y-5">
        <Field
          id="title"
          label="Release title"
          required
          value={state.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Release title"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="artist"
            label="Primary artist"
            as="select"
            required
            value={state.artistId}
            onChange={(e) => patch({ artistId: e.target.value,
              additionalArtistIds: (state.additionalArtistIds ?? []).filter((id) => id !== e.target.value),
              featuredArtistIds: (state.featuredArtistIds ?? []).filter((id) => id !== e.target.value),
            })}
          >
            <option value="" disabled>Select primary artist</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Field>

          <ArtistDropdown id="additionalArtists" label="Additional main artists"
            artists={artists} selected={state.additionalArtistIds ?? []}
            excluded={[state.artistId, ...(state.featuredArtistIds ?? [])]}
            onChange={(ids) => patch({ additionalArtistIds: ids })} />
          <ArtistDropdown id="featuredArtists" label="Featured artists"
            artists={artists} selected={state.featuredArtistIds ?? []}
            excluded={[state.artistId, ...(state.additionalArtistIds ?? [])]}
            onChange={(ids) => patch({ featuredArtistIds: ids })} />
          <p className="text-xs text-muted-foreground sm:col-span-2">Main and featured artists selected here are credited on this release and all its tracks.</p>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Release type <span className="text-destructive" aria-hidden="true">*</span></p>
            <ChipGroup
              options={CONTENT_TYPE_OPTIONS}
              value={state.contentType}
              onChange={(v) =>
                patch({ contentType: v as WizardState["contentType"] })
              }
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="mixVersion"
            label="Version / mix version"
            value={state.mixVersion}
            onChange={(e) => patch({ mixVersion: e.target.value })}
            placeholder="e.g. Radio Edit — optional"
          />

          <div className="grid gap-2">
            <label htmlFor="genre" className="text-sm font-medium">
              Primary genre <span className="text-destructive">*</span>
            </label>
            <CatalogStatus catalog={genres} emptyLabel="No genres available." />
            {genres.loaded && !genres.error && genres.items.length > 0 ? (
              <select
                id="genre"
                value={state.primaryGenreId ?? ""}
                className="h-10 border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const genre = genres.items.find((g) => g.id === id);
                  patch({
                    primaryGenreId: genre?.id ?? null,
                    primaryGenreName: genre?.name ?? "",
                  });
                }}
              >
                <option value="" disabled>
                  Choose a genre
                </option>
                {genres.items.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="releaseDate"
            label="Release date"
            type="date"
            required
            value={state.releaseDate}
            onChange={(e) => {
              const date = e.target.value;
              patch({
                releaseDate: date,
                ...(!state.isTransfer && date
                  ? { clineYear: date.slice(0, 4), plineYear: date.slice(0, 4) }
                  : {}),
              });
            }}
          />
          <Field
            id="upc"
            label="UPC / Barcode"
            value={state.upc}
            maxLength={13}
            onChange={(e) => patch({ upc: e.target.value })}
            helper="Already have a UPC? Enter it here. Otherwise one is assigned automatically."
            placeholder="Optional"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <MetadataLanguage value={state.preferredLocalization} onChange={(value) => patch({ preferredLocalization: value })} />
          <div className="grid gap-2">
            <Field
              id="recordingCountry"
              label="Recording country"
              required
              as="select"
              value={state.recordingCountry ?? ""}
              onChange={(e) => patch({ recordingCountry: e.target.value })}
              helper="Required. Select where the audio was recorded. Applies to every track."
            >
              <option value="" disabled>Choose a recording country</option>
              {state.recordingCountry && !territories.items.some((country) => country.code === state.recordingCountry) ? (
                <option value={state.recordingCountry}>{state.recordingCountry}</option>
              ) : null}
              {territories.items.map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </Field>
            <CatalogStatus catalog={territories} emptyLabel="No countries available." />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Label</p>
            <p className="flex h-10 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
              RDISTRO (default label)
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
