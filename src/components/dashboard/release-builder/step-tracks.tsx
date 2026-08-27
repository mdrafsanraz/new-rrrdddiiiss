"use client";

/**
 * Step 3 — Tracks. Audio uses LabelGrid's real Track Files flow server-side
 * (presigned upload + 202 processing polling); this step captures the file
 * and every TrackCreateData field the API needs: titles, artists (primary
 * inherits the release artist; featured artists listed), mix_versions,
 * isrc (optional — auto-assigned), explicit, composition_type,
 * audio/composition AI usage, commercial_samples, audio_language, lyrics,
 * and the cover/sample license document when clearance is required.
 */

import { useEffect, useMemo, useRef } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { cn } from "@/lib/utils";
import {
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  LOCALES,
} from "@/lib/releases/constants";
import {
  newTrack,
  type WizardState,
  type WizardTrack,
} from "@/lib/releases/wizard-types";
import {
  AudioStatusPill,
  formatDuration,
  MediaDropzone,
  Panel,
  ChipGroup,
} from "./shared";

const EXPLICIT_FRIENDLY = [
  { value: "off" as const, label: "No" },
  { value: "on" as const, label: "Yes" },
  { value: "edited" as const, label: "Clean" },
];

const AI_USAGE_LABELS = [
  { value: "none", label: "No AI" },
  { value: "some", label: "Some AI" },
  { value: "material", label: "Mostly AI" },
  { value: "all", label: "Fully AI" },
] as const;

function TrackAudioDropzone({
  track,
  onFile,
}: {
  track: WizardTrack;
  onFile: (file: File | null) => void;
}) {
  const localPreview = useMemo(() => {
    if (!track.audioFile) return null;
    return URL.createObjectURL(track.audioFile);
  }, [track.audioFile]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  return (
    <MediaDropzone
      id={`audio-${track.clientId}`}
      label="Audio"
      accept="audio/wav,audio/x-wav,audio/wave,audio/flac,audio/x-flac,.wav,.flac"
      kind="audio"
      file={track.audioFile}
      audioUrl={track.audioUrl}
      previewUrl={localPreview}
      audioStatus={
        track.audioProcessing
          ? "processing"
          : track.audioProcessingError
            ? "failed"
            : null
      }
      onFile={onFile}
    />
  );
}

/**
 * Cover/sample clearance license — shown only when composition_type is
 * cover_song or commercial_samples isn't "no" (LabelGrid POST
 * /tracks/{id}/licenses, type: cover|sample).
 */
function TrackLicenseUpload({
  track,
  onFile,
  onOriginalTrackLinkChange,
}: {
  track: WizardTrack;
  onFile: (file: File | null) => void;
  onOriginalTrackLinkChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label =
    track.licenseType === "cover"
      ? "Cover license"
      : track.licenseType === "sample"
        ? "Sample clearance"
        : "License document";
  const hasFile = Boolean(track.licenseFile || track.licenseUrl);

  return (
    <div className="space-y-3 border border-border bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {track.licenseFile
              ? track.licenseFile.name
              : track.licenseUrl
                ? "Uploaded — will sync to your distributor."
                : `Required — ${track.licenseType === "cover" ? "proof you cleared this cover" : "proof the sample is cleared"}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            onClick={() => inputRef.current?.click()}
          >
            {hasFile ? "Replace" : "Upload"}
          </Button>
          {track.licenseFile ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2 text-destructive"
              onClick={() => onFile(null)}
            >
              <Trash size={16} weight="regular" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {track.licenseType === "cover" ? (
        <div className="grid gap-1.5">
          <label
            htmlFor={`original-track-link-${track.clientId}`}
            className="text-sm font-medium text-foreground"
          >
            Link to original recording{" "}
            <span className="text-destructive">*</span>
          </label>
          <input
            id={`original-track-link-${track.clientId}`}
            type="url"
            required
            value={track.originalTrackLink ?? ""}
            onChange={(e) => onOriginalTrackLinkChange(e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            className="h-9 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Required by LabelGrid for cover licenses — a streaming or store
            link to the original track being covered.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function StepTracks({
  state,
  setState,
  updateTrack,
  editingTrackId,
  setEditingTrackId,
  primaryArtistName,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  updateTrack: (clientId: string, partial: Partial<WizardTrack>) => void;
  editingTrackId: string | null;
  setEditingTrackId: (id: string | null) => void;
  primaryArtistName: string;
}) {
  return (
    <Panel className="space-y-4">
      <div className="space-y-2">
        {state.tracks.map((t, i) => (
          <div key={t.clientId} className="border border-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted text-xs font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {t.title.trim() || "Untitled track"}
                </p>
                {t.audioProcessing || t.audioProcessingError ? (
                  <div className="mt-1">
                    <AudioStatusPill
                      status={t.audioProcessingError ? "failed" : "processing"}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(t.audioDurationSec)}
                    {t.audioFile || t.audioUrl ? " · Audio ready" : " · No audio"}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 px-3"
                onClick={() =>
                  setEditingTrackId(
                    editingTrackId === t.clientId ? null : t.clientId
                  )
                }
              >
                <PencilSimple size={14} weight="bold" aria-hidden />
                Edit
              </Button>
              {state.contentType !== "Single" && state.tracks.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-2 text-destructive"
                  aria-label="Remove track"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      tracks: prev.tracks.filter(
                        (x) => x.clientId !== t.clientId
                      ),
                    }))
                  }
                >
                  <Trash size={16} />
                </Button>
              ) : null}
            </div>

            {editingTrackId === t.clientId ? (
              <div className="space-y-5 border-t border-border bg-muted/30 p-4 sm:p-5">
                <TrackAudioDropzone
                  track={t}
                  onFile={(file) => {
                    if (!file) {
                      updateTrack(t.clientId, {
                        audioFile: null,
                        audioUrl: null,
                        audioDurationSec: null,
                      });
                      return;
                    }
                    updateTrack(t.clientId, { audioFile: file });
                    const url = URL.createObjectURL(file);
                    const audio = new Audio(url);
                    audio.addEventListener("loadedmetadata", () => {
                      updateTrack(t.clientId, {
                        audioDurationSec: Number.isFinite(audio.duration)
                          ? audio.duration
                          : null,
                      });
                      URL.revokeObjectURL(url);
                    });
                  }}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id={`title-${t.clientId}`}
                    label="Track title"
                    required
                    value={t.title}
                    onChange={(e) =>
                      updateTrack(t.clientId, { title: e.target.value })
                    }
                  />
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Primary artist</p>
                    <p className="flex h-10 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
                      {primaryArtistName || "Release artist"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id={`featured-${t.clientId}`}
                    label="Featured artists"
                    value={t.featuredArtistNames.join(", ")}
                    onChange={(e) =>
                      updateTrack(t.clientId, {
                        featuredArtistNames: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    helper="Comma-separated — optional."
                    placeholder="Optional"
                  />
                  <Field
                    id={`version-${t.clientId}`}
                    label="Version / mix version"
                    value={t.mixVersion}
                    onChange={(e) =>
                      updateTrack(t.clientId, { mixVersion: e.target.value })
                    }
                    placeholder="e.g. Acoustic — optional"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id={`isrc-${t.clientId}`}
                    label="ISRC"
                    value={t.isrc}
                    maxLength={15}
                    onChange={(e) =>
                      updateTrack(t.clientId, { isrc: e.target.value })
                    }
                    helper="Already have one? Enter it. Otherwise it's assigned automatically."
                    placeholder="Optional"
                  />
                  <Field
                    id={`lang-${t.clientId}`}
                    label="Audio language"
                    as="select"
                    value={t.audioLanguage}
                    onChange={(e) =>
                      updateTrack(t.clientId, { audioLanguage: e.target.value })
                    }
                  >
                    {LOCALES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Field>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Explicit</p>
                  <ChipGroup
                    options={EXPLICIT_FRIENDLY}
                    value={t.explicit}
                    onChange={(v) =>
                      updateTrack(t.clientId, {
                        explicit: v as WizardTrack["explicit"],
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Composition</p>
                  <ChipGroup
                    options={COMPOSITION_TYPES.map((c) => ({
                      value: c.value,
                      label: c.label
                        .replace(" composition", "")
                        .replace(" song", ""),
                    }))}
                    value={t.compositionType}
                    onChange={(v) =>
                      updateTrack(t.clientId, {
                        compositionType: v as WizardTrack["compositionType"],
                        hasMechanicalLicense:
                          v === "cover_song" || t.commercialSamples !== "no",
                        licenseType:
                          v === "cover_song"
                            ? "cover"
                            : t.commercialSamples !== "no"
                              ? "sample"
                              : null,
                      })
                    }
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id={`audio-ai-${t.clientId}`}
                    label="Audio AI usage"
                    as="select"
                    value={t.audioAiUsage}
                    onChange={(e) =>
                      updateTrack(t.clientId, {
                        audioAiUsage: e.target
                          .value as WizardTrack["audioAiUsage"],
                      })
                    }
                  >
                    {ARTWORK_AI_USAGE.map((v) => (
                      <option key={v} value={v}>
                        {AI_USAGE_LABELS.find((l) => l.value === v)?.label ?? v}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id={`comp-ai-${t.clientId}`}
                    label="Composition AI usage"
                    as="select"
                    value={t.compositionAiUsage}
                    onChange={(e) =>
                      updateTrack(t.clientId, {
                        compositionAiUsage: e.target
                          .value as WizardTrack["compositionAiUsage"],
                      })
                    }
                  >
                    {ARTWORK_AI_USAGE.map((v) => (
                      <option key={v} value={v}>
                        {AI_USAGE_LABELS.find((l) => l.value === v)?.label ?? v}
                      </option>
                    ))}
                  </Field>
                </div>

                <Field
                  id={`samples-${t.clientId}`}
                  label="Commercial samples"
                  as="select"
                  value={t.commercialSamples}
                  onChange={(e) => {
                    const v = e.target
                      .value as WizardTrack["commercialSamples"];
                    updateTrack(t.clientId, {
                      commercialSamples: v,
                      hasMechanicalLicense:
                        v !== "no" || t.compositionType === "cover_song",
                      licenseType:
                        v !== "no"
                          ? "sample"
                          : t.compositionType === "cover_song"
                            ? "cover"
                            : null,
                    });
                  }}
                >
                  {COMMERCIAL_SAMPLES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Field>

                {t.compositionType === "cover_song" ||
                t.commercialSamples !== "no" ? (
                  <TrackLicenseUpload
                    track={t}
                    onFile={(file) =>
                      updateTrack(t.clientId, { licenseFile: file })
                    }
                    onOriginalTrackLinkChange={(value) =>
                      updateTrack(t.clientId, { originalTrackLink: value })
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {state.contentType !== "Single" ? (
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 w-full sm:w-auto")}
          onClick={() =>
            setState((prev) => {
              const track = newTrack();
              return { ...prev, tracks: [...prev.tracks, track] };
            })
          }
        >
          <Plus size={14} weight="bold" aria-hidden />
          Add track
        </Button>
      ) : null}
    </Panel>
  );
}
