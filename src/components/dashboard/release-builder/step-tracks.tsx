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

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleNotch, PencilSimple, Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Tooltip } from "@/components/ui/tooltip";
import { Field } from "@/components/site/field";
import {
  convertAudioTo16BitWav,
  inspectAudioCompatibility,
} from "@/lib/audio/compatibility";
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
  const [rejectedFile, setRejectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [converting, setConverting] = useState(false);
  const localPreview = useMemo(() => {
    if (!track.audioFile) return null;
    return URL.createObjectURL(track.audioFile);
  }, [track.audioFile]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function selectFile(file: File | null) {
    if (!file) {
      setRejectedFile(null);
      setValidationError(null);
      onFile(null);
      return;
    }
    setChecking(true);
    setValidationError(null);
    try {
      const result = await inspectAudioCompatibility(file);
      if (!result.compatible) {
        setRejectedFile(result.canConvert ? file : null);
        setValidationError(result.error);
        return;
      }
      setRejectedFile(null);
      onFile(file);
    } catch {
      setRejectedFile(null);
      setValidationError("Could not inspect this audio file. Select a valid WAV or FLAC file.");
    } finally {
      setChecking(false);
    }
  }

  async function convertRejectedFile() {
    if (!rejectedFile) return;
    setConverting(true);
    setValidationError(null);
    try {
      const converted = await convertAudioTo16BitWav(rejectedFile);
      setRejectedFile(null);
      onFile(converted);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Audio conversion failed.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-3">
      <MediaDropzone
        id={`audio-${track.clientId}`}
        label="Audio"
        required
        accept="audio/wav,audio/x-wav,audio/wave,audio/flac,audio/x-flac,.wav,.flac"
        kind="audio"
        file={track.audioFile}
        audioUrl={track.audioUrl}
        previewUrl={localPreview}
        helper={checking ? "Checking format and bit depth..." : undefined}
        audioStatus={
          track.audioProcessing
            ? "processing"
            : track.audioProcessingError
              ? "failed"
              : null
        }
        onFile={(file) => void selectFile(file)}
      />
      {validationError ? (
        <Callout tone="danger" icon={<WarningCircle size={18} weight="fill" aria-hidden />}>
          <p className="font-medium">Audio file is not compatible</p>
          <p className="mt-1 text-sm">{validationError}</p>
          {rejectedFile ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 px-3"
              disabled={converting}
              onClick={() => void convertRejectedFile()}
            >
              {converting ? <CircleNotch size={16} className="animate-spin" aria-hidden /> : null}
              {converting ? "Converting audio..." : "Convert to 16-bit WAV"}
            </Button>
          ) : null}
        </Callout>
      ) : null}
    </div>
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
            <Tooltip content="Remove file">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-2 text-destructive"
                aria-label="Remove file"
                onClick={() => onFile(null)}
              >
                <Trash size={16} weight="regular" aria-hidden />
              </Button>
            </Tooltip>
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
            Required for cover licenses — a streaming or store
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
        {state.tracks.map((t, i) => {
          const isEditing = editingTrackId === t.clientId;
          return (
          <div
            key={t.clientId}
            className={cn(
              "border transition-colors duration-200 ease-[var(--ease-rdistro)]",
              isEditing ? "border-primary/40" : "border-border"
            )}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center border text-xs font-semibold transition-colors",
                  isEditing
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted"
                )}
              >
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
                <Tooltip content="Remove track">
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
                </Tooltip>
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
                  <div>
                    <Field
                      id={`title-${t.clientId}`}
                      label="Track title"
                      required
                      value={t.title}
                      onChange={(e) =>
                        updateTrack(t.clientId, { title: e.target.value })
                      }
                    />
                    {state.contentType === "Single" &&
                    t.title.trim() &&
                    t.title.trim() !== state.title.trim() ? (
                      <p className="mt-2 text-xs font-medium text-destructive" role="alert">
                        Must match the release title exactly: “{state.title.trim()}”
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Primary artist <span className="text-destructive" aria-hidden="true">*</span></p>
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
                    required
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
                  <p className="text-sm font-medium">Explicit <span className="text-destructive" aria-hidden="true">*</span></p>
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
                  <p className="text-sm font-medium">Composition <span className="text-destructive" aria-hidden="true">*</span></p>
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
                    required
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
                    required
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
                  required
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
          );
        })}
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
