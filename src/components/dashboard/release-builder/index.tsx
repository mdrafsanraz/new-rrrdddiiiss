"use client";

/**
 * Release Builder — Release → Distribution → Tracks → Credits → Review.
 *
 * Network model (no autosave):
 * - Leaving Distribution (checkpoint A): Steps 1+2 combine into the FIRST
 *   LabelGrid Create Release (or Update if a labelgridId already exists —
 *   never a duplicate). Continue blocks until LabelGrid confirms.
 * - Leaving Credits (checkpoint B): tracks + audio + credits sync against
 *   the existing LabelGrid release id (create-or-update per track).
 * - Submit for Review: final defensive sync, then RDISTRO internal review;
 *   LabelGrid stays DRAFT until admin approval.
 * LabelGrid is the catalog source of truth; RDISTRO stores ownership,
 * mapping ids, and workflow state only.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  parseJsonObject,
  type TrackMetadata,
} from "@/lib/releases/constants";
import {
  newContributor,
  newTrack,
  STEP_CREDITS,
  STEP_DISTRIBUTION,
  STEP_RELEASE,
  STEP_REVIEW,
  STEP_TRACKS,
  WIZARD_STEPS,
  type WizardState,
  type WizardTrack,
} from "@/lib/releases/wizard-types";
import {
  StepRail,
  useCatalog,
  type ContributorRole,
  type GenreOption,
  type Outlet,
  type TerritoryOption,
} from "./shared";
import { StepRelease, type ArtistOption } from "./step-release";
import { StepDistribution } from "./step-distribution";
import { StepTracks } from "./step-tracks";
import { splitTotal, StepCredits } from "./step-credits";
import { StepReview, type LiveReleaseSnapshot } from "./step-review";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "sync-error";

type SaveDraftResult = {
  /** The local save request itself succeeded. */
  ok: boolean;
  /**
   * When syncToLabelGrid was requested: true only if LabelGrid confirmed.
   * Otherwise mirrors `ok`.
   */
  labelgridOk: boolean;
  error?: string;
};

const currentYear = new Date().getFullYear();

function initialState(
  artists: ArtistOption[],
  defaultArtistId?: string
): WizardState {
  const artistId =
    defaultArtistId && artists.some((a) => a.id === defaultArtistId)
      ? defaultArtistId
      : (artists[0]?.id ?? "");
  const artistName = artists.find((a) => a.id === artistId)?.name ?? "";
  return {
    releaseId: null,
    step: 0,
    artworkFile: null,
    artworkUrl: null,
    artworkPreview: null,
    artworkAiUsage: "none",
    isTransfer: false,
    transferFromDistributor: "",
    originalReleaseDate: "",
    title: "",
    artistId,
    contentType: "Single",
    mixVersion: "",
    primaryGenreId: null,
    primaryGenreName: "",
    releaseDate: "",
    upc: "",
    preferredLocalization: "en",
    allStores: true,
    selectedOutletKeys: [],
    worldwide: true,
    territoryCodes: [],
    tracks: [newTrack()],
    contributors: [newContributor()],
    writerSplits: [],
    publisherSplits: [],
    selfPublished: true,
    clineYear: String(currentYear),
    clineName: artistName,
    plineYear: String(currentYear),
    plineName: artistName,
    rightsConfirmed: false,
  };
}

/**
 * LabelGrid requires every track's contributors to cover these role
 * categories (its 422 lists whichever are still missing: "Each track needs
 * at least one contributor assigned to the role of …").
 */
const REQUIRED_ROLE_CATEGORIES = [
  "Performer",
  "Composition & Lyrics",
  "Production & Engineering",
] as const;

function validateStep(
  state: WizardState,
  step: number,
  roleCategories?: Map<string, string>
): string | null {
  if (step === STEP_RELEASE) {
    if (!state.artworkFile && !state.artworkUrl) {
      return "Please add cover artwork.";
    }
    if (!state.title.trim()) return "Please enter a release title.";
    if (!state.artistId) return "Please select an artist.";
    if (!state.primaryGenreId) return "Please choose a primary genre.";
    if (!state.releaseDate) return "Please choose a release date.";
    if (state.isTransfer) {
      if (!state.transferFromDistributor.trim()) {
        return "Please name the distributor you're transferring from.";
      }
      if (!state.originalReleaseDate) {
        return "Please enter the original release date for this transfer.";
      }
    }
    return null;
  }
  if (step === STEP_DISTRIBUTION) {
    if (!state.allStores && state.selectedOutletKeys.length === 0) {
      return "Select all stores, or choose at least one store.";
    }
    if (!state.worldwide && state.territoryCodes.length === 0) {
      return "Choose worldwide, or select at least one territory.";
    }
    return null;
  }
  if (step === STEP_TRACKS) {
    if (!state.tracks.length) return "Please add at least one track.";
    for (let i = 0; i < state.tracks.length; i++) {
      const t = state.tracks[i];
      if (!t.title.trim()) {
        return `Please enter a title for track ${i + 1}.`;
      }
      if (t.audioProcessingError) {
        return `Audio processing failed for “${t.title.trim() || `track ${i + 1}`}” — please re-upload it.`;
      }
      if (!t.audioFile && !t.audioUrl) {
        return `Please upload audio for “${t.title.trim() || `track ${i + 1}`}”.`;
      }
      if (t.licenseType === "cover" && !t.originalTrackLink?.trim()) {
        return `Please add a link to the original recording for “${t.title.trim() || `track ${i + 1}`}” (required for cover licenses).`;
      }
    }
    return null;
  }
  if (step === STEP_CREDITS) {
    const ok = state.contributors.some(
      (c) => c.writerId && c.roles.length > 0
    );
    if (!ok) {
      return "Add at least one contributor with a writer and at least one role.";
    }
    for (const c of state.contributors) {
      if (c.writerId && c.roles.length === 0) {
        return `Pick at least one role for ${c.firstName} ${c.lastName}.`;
      }
    }
    // Category coverage: LabelGrid rejects tracks whose contributors don't
    // span all required categories. Only checkable once the live catalog
    // (role → category) has loaded; the server still enforces it.
    if (roleCategories && roleCategories.size > 0) {
      const covered = new Set<string>();
      for (const c of state.contributors) {
        for (const role of c.roles) {
          const category = roleCategories.get(role.trim().toLowerCase());
          if (category) covered.add(category.trim().toLowerCase());
        }
      }
      const missing = REQUIRED_ROLE_CATEGORIES.filter(
        (cat) => !covered.has(cat.toLowerCase())
      );
      if (missing.length > 0) {
        return `Contributors must cover ${missing.join(", ")} — add the matching role(s). The same contributor can hold multiple roles.`;
      }
    }
    if (state.writerSplits.length > 0) {
      for (const w of state.writerSplits) {
        if (!w.writerId) return "Every publishing split needs a writer.";
        if (w.roles.length === 0) {
          return `Pick at least one role for the publishing split of ${w.firstName} ${w.lastName}.`;
        }
      }
      if (Math.abs(splitTotal(state.writerSplits) - 100) > 0.001) {
        return "Publishing splits must total exactly 100%.";
      }
    }
    if (!state.selfPublished) {
      if (state.publisherSplits.length === 0) {
        return "Add a publisher, or mark the release self-published.";
      }
      for (const p of state.publisherSplits) {
        if (!p.publisherId) return "Every publisher row needs a publisher.";
      }
      if (Math.abs(splitTotal(state.publisherSplits) - 100) > 0.001) {
        return "Publisher shares must total exactly 100%.";
      }
    }
    if (!state.clineName.trim() || !state.plineName.trim()) {
      return "Please fill in © and ℗ owner names.";
    }
    if (!state.clineYear.trim() || !state.plineYear.trim()) {
      return "Please fill in © and ℗ years.";
    }
    return null;
  }
  if (step === STEP_REVIEW) {
    if (!state.rightsConfirmed) {
      return "Please confirm you have the rights to distribute this release.";
    }
    return null;
  }
  return null;
}

function releasePayloadFields(state: WizardState) {
  return {
    artistId: state.artistId,
    title: state.title.trim(),
    contentType: state.contentType,
    primaryGenreId: state.primaryGenreId,
    primaryGenreName: state.primaryGenreName,
    releaseDate: state.releaseDate || "",
    originalReleaseDate: state.isTransfer ? state.originalReleaseDate : "",
    upc: state.upc,
    mixVersion: state.mixVersion,
    preferredLocalization: state.preferredLocalization,
    artworkAiUsage: state.artworkAiUsage,
    transferFromDistributor: state.isTransfer
      ? state.transferFromDistributor
      : "",
    clineYear: state.clineYear,
    clineName: state.clineName,
    plineYear: state.plineYear,
    plineName: state.plineName,
    allStores: state.allStores,
    selectedOutletKeys: state.selectedOutletKeys,
    worldwide: state.worldwide,
    territoryCodes: state.territoryCodes,
  };
}

function buildPayload(state: WizardState) {
  const validContributors = state.contributors
    .filter((c) => c.writerId && c.roles.length)
    .map((c) => ({
      writerId: c.writerId ?? null,
      firstName: c.firstName.trim() || "Writer",
      lastName: c.lastName.trim() || "Unknown",
      roles: c.roles,
      aiContribution: c.aiContribution ?? "none",
    }));

  const writerSplits = state.writerSplits
    .filter((w) => w.writerId && w.roles.length)
    .map((w) => ({
      writerId: w.writerId ?? null,
      firstName: w.firstName.trim() || "Writer",
      lastName: w.lastName.trim() || "Unknown",
      roles: w.roles,
      share: w.share,
    }));

  const publisherSplits = state.selfPublished
    ? []
    : state.publisherSplits
        .filter((p) => p.publisherId)
        .map((p) => ({
          publisherId: p.publisherId ?? null,
          name: p.name.trim() || "Publisher",
          share: p.share,
        }));

  const tracks = state.tracks.map((t, i) => ({
    id: t.id,
    clientId: t.clientId,
    title: t.title.trim() || state.title.trim() || `Track ${i + 1}`,
    mixVersion: t.mixVersion,
    isrc: t.isrc,
    compositionType: t.compositionType,
    explicit: t.explicit,
    audioAiUsage: t.audioAiUsage,
    compositionAiUsage: t.compositionAiUsage,
    commercialSamples: t.commercialSamples,
    audioLanguage: t.audioLanguage || state.preferredLocalization || "en",
    featuredArtistNames: t.featuredArtistNames,
    hasMechanicalLicense: t.hasMechanicalLicense,
    lyrics: t.lyrics,
    licenseType: t.licenseType,
    originalTrackLink: t.originalTrackLink,
    contributors: validContributors,
  }));

  return {
    ...releasePayloadFields(state),
    tracks,
    contributors: validContributors,
    writerSplits,
    publisherSplits,
    selfPublished: state.selfPublished,
  };
}

export function ReleaseBuilder({
  artists,
  defaultArtistId,
  initialWizard,
}: {
  artists: ArtistOption[];
  defaultArtistId?: string;
  /** Pre-fill wizard when editing an existing release. */
  initialWizard?: WizardState;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const errorRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<WizardState>(
    initialWizard ?? initialState(artists, defaultArtistId)
  );
  const createInFlight = useRef<Promise<{
    id: string | null;
    labelgridOk: boolean;
    error?: string;
  }> | null>(null);
  const saveInFlight = useRef<Promise<SaveDraftResult> | null>(null);
  const queuedSaveOpts = useRef<{
    forceArtwork?: boolean;
    syncToLabelGrid?: boolean;
  } | null>(null);

  const [state, setState] = useState<WizardState>(
    () => initialWizard ?? initialState(artists, defaultArtistId)
  );
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveReleaseSnapshot | null>(
    null
  );
  const [liveSnapshotError, setLiveSnapshotError] = useState<string | null>(
    null
  );

  // Live LabelGrid catalogs — nothing in the wizard hardcodes these.
  const genres = useCatalog<GenreOption>("/api/labelgrid/genres", (d) =>
    Array.isArray(d.genres) ? (d.genres as GenreOption[]) : null
  );
  const outlets = useCatalog<Outlet>("/api/labelgrid/outlets", (d) =>
    Array.isArray(d.outlets) ? (d.outlets as Outlet[]) : null
  );
  const territories = useCatalog<TerritoryOption>(
    "/api/labelgrid/territories",
    (d) =>
      Array.isArray(d.territories) ? (d.territories as TerritoryOption[]) : null
  );
  const contributorRoles = useCatalog<ContributorRole>(
    "/api/labelgrid/contributor-roles",
    (d) => (Array.isArray(d.roles) ? (d.roles as ContributorRole[]) : null)
  );
  const roleCategories = new Map(
    contributorRoles.items
      .filter((r) => r.category)
      .map((r) => [r.display_value.trim().toLowerCase(), r.category as string])
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const patch = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateTrack = useCallback(
    (clientId: string, partial: Partial<WizardTrack>) => {
      setState((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.clientId === clientId ? { ...t, ...partial } : t
        ),
      }));
    },
    []
  );

  // -------------------------------------------------------------------------
  // Checkpoint A: first LabelGrid release create (Steps 1+2 combined)

  async function createDraft(
    current: WizardState
  ): Promise<{ id: string | null; labelgridOk: boolean; error?: string }> {
    if (current.releaseId) {
      return { id: current.releaseId, labelgridOk: true };
    }
    if (createInFlight.current) return createInFlight.current;

    const run = (async () => {
      setSaveStatus("saving");
      try {
        const fd = new FormData();
        fd.set("payload", JSON.stringify(releasePayloadFields(current)));
        if (current.artworkFile) fd.set("artwork", current.artworkFile);
        const res = await fetch("/api/releases/drafts", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveStatus("error");
          setError(data.error ?? "Could not create draft");
          return { id: null, labelgridOk: false, error: data.error };
        }
        const id = data.release.id as string;
        const artworkLanded = Boolean(data.release.artworkUrl);
        const labelgridOk = Boolean(data.release.labelgridId);
        setState((prev) => ({
          ...prev,
          releaseId: id,
          artworkUrl: data.release.artworkUrl ?? prev.artworkUrl,
          artworkFile:
            current.artworkFile && !artworkLanded ? prev.artworkFile : null,
        }));
        if (!labelgridOk) {
          setSaveStatus("sync-error");
          setSyncErrorMessage(data.labelgrid?.error ?? null);
        } else {
          setSaveStatus("saved");
        }
        return { id, labelgridOk, error: data.labelgrid?.error };
      } catch {
        setSaveStatus("error");
        setError("Network error while saving draft.");
        return { id: null, labelgridOk: false, error: "Network error" };
      } finally {
        createInFlight.current = null;
      }
    })();

    createInFlight.current = run;
    return run;
  }

  // -------------------------------------------------------------------------
  // Serialized draft save (checkpoint B + explicit saves)

  async function saveDraft(
    current: WizardState,
    opts?: { forceArtwork?: boolean; syncToLabelGrid?: boolean }
  ): Promise<SaveDraftResult> {
    if (saveInFlight.current) {
      queuedSaveOpts.current = {
        forceArtwork:
          queuedSaveOpts.current?.forceArtwork || opts?.forceArtwork,
        syncToLabelGrid:
          queuedSaveOpts.current?.syncToLabelGrid || opts?.syncToLabelGrid,
      };
      return saveInFlight.current;
    }

    const run = performSaveDraft(current, opts).finally(() => {
      saveInFlight.current = null;
      if (queuedSaveOpts.current) {
        const nextOpts = queuedSaveOpts.current;
        queuedSaveOpts.current = null;
        void saveDraft(stateRef.current, nextOpts);
      }
    });
    saveInFlight.current = run;
    return run;
  }

  async function performSaveDraft(
    current: WizardState,
    opts?: { forceArtwork?: boolean; syncToLabelGrid?: boolean }
  ): Promise<SaveDraftResult> {
    let id = current.releaseId;
    if (!id) {
      const created = await createDraft(current);
      if (!created.id) {
        return { ok: false, labelgridOk: false, error: created.error };
      }
      id = created.id;
      current = { ...stateRef.current, releaseId: id };
    }

    setSaveStatus("saving");
    // LabelGrid is the only store for artwork/audio — if an upload doesn't
    // visibly land, keep the file in memory so the next save retries it.
    const hadArtworkFile = Boolean(current.artworkFile);
    const pendingAudioClientIds = new Set(
      current.tracks.filter((t) => t.audioFile).map((t) => t.clientId)
    );
    try {
      const fd = new FormData();
      fd.set(
        "payload",
        JSON.stringify({
          ...buildPayload(current),
          syncToLabelGrid: opts?.syncToLabelGrid ?? false,
        })
      );
      if (current.artworkFile) fd.set("artwork", current.artworkFile);
      for (const t of current.tracks) {
        if (t.audioFile) fd.set(`audio_${t.clientId}`, t.audioFile);
        if (t.licenseFile) fd.set(`license_${t.clientId}`, t.licenseFile);
      }
      const res = await fetch(`/api/releases/${id}/draft`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        if (opts?.forceArtwork) setError(data.error ?? "Save failed");
        return { ok: false, labelgridOk: false, error: data.error };
      }

      const release = data.release;
      const labelgridError: string | undefined = data.labelgrid?.error;
      const anyTrackAudioFailed = (release.tracks ?? []).some(
        (rt: { metadataJson?: string }) =>
          Boolean(
            parseJsonObject<TrackMetadata>(rt.metadataJson).audioProcessingError
          )
      );
      const labelgridOk = opts?.syncToLabelGrid
        ? !labelgridError && !anyTrackAudioFailed
        : true;

      setState((prev) => {
        const byClient = new Map(prev.tracks.map((t) => [t.clientId, t]));
        const nextTracks: WizardTrack[] =
          Array.isArray(release.tracks) && release.tracks.length
            ? release.tracks.map(
                (
                  rt: {
                    id: string;
                    title: string;
                    audioUrl: string | null;
                    metadataJson?: string;
                  },
                  i: number
                ) => {
                  const existing =
                    prev.tracks[i] ??
                    [...byClient.values()].find((t) => t.title === rt.title) ??
                    newTrack();
                  const tMeta = parseJsonObject<TrackMetadata>(rt.metadataJson);
                  const audioLanded =
                    Boolean(rt.audioUrl) ||
                    Boolean(tMeta.audioProcessing) ||
                    Boolean(tMeta.audioProcessingError);
                  const wasPending = pendingAudioClientIds.has(
                    existing.clientId
                  );
                  return {
                    ...existing,
                    id: rt.id,
                    title: existing.title || rt.title,
                    audioUrl: rt.audioUrl ?? existing.audioUrl,
                    audioFile:
                      wasPending && !audioLanded ? existing.audioFile : null,
                    audioProcessing: tMeta.audioProcessing ?? false,
                    audioProcessingError: tMeta.audioProcessingError ?? null,
                    licenseFile: null,
                    licenseUrl: tMeta.licenseUrl ?? existing.licenseUrl,
                    originalTrackLink:
                      tMeta.originalTrackLink ?? existing.originalTrackLink,
                  };
                }
              )
            : prev.tracks.map((t) => ({
                ...t,
                audioFile: t.audioFile ? null : t.audioFile,
                licenseFile: t.licenseFile ? null : t.licenseFile,
              }));

        const artworkLanded = Boolean(release.artworkUrl);
        return {
          ...prev,
          releaseId: release.id,
          artworkUrl: release.artworkUrl ?? prev.artworkUrl,
          artworkFile:
            hadArtworkFile && !artworkLanded ? prev.artworkFile : null,
          tracks: nextTracks,
        };
      });

      if (!labelgridOk) {
        setSaveStatus("sync-error");
        setSyncErrorMessage(
          labelgridError ??
            "Audio processing failed for one or more tracks — check the Tracks step."
        );
      } else {
        setSaveStatus("saved");
        setSyncErrorMessage(null);
      }
      return { ok: true, labelgridOk, error: labelgridError };
    } catch {
      setSaveStatus("error");
      return { ok: false, labelgridOk: false, error: "Network error" };
    }
  }

  // -------------------------------------------------------------------------
  // Audio processing polling (PUT stereo → 202 upload_attempt)

  const processingTrackIds = state.tracks
    .filter((t) => t.audioProcessing && t.id)
    .map((t) => t.id!);
  const processingKey = processingTrackIds.join(",");

  useEffect(() => {
    if (!state.releaseId || !processingKey) return;
    let cancelled = false;

    const poll = async () => {
      for (const trackId of processingKey.split(",")) {
        try {
          const res = await fetch(
            `/api/releases/${state.releaseId}/tracks/${trackId}/audio-status`,
            { method: "POST" }
          );
          const data = await res.json();
          if (cancelled || !res.ok) continue;
          if (data.status === "processing") continue;
          setState((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    audioProcessing: false,
                    audioProcessingError:
                      data.status === "failed"
                        ? data.error || "Audio processing failed"
                        : null,
                  }
                : t
            ),
          }));
        } catch {
          // Network hiccup — next poll tick retries.
        }
      }
    };

    const interval = window.setInterval(poll, 5000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [state.releaseId, processingKey]);

  // Review must not trust the local cache — fetch what LabelGrid actually
  // has whenever the user lands on this step.
  useEffect(() => {
    if (state.step !== STEP_REVIEW || !state.releaseId) return;
    let cancelled = false;
    const releaseId = state.releaseId;
    fetch(`/api/releases/${releaseId}/labelgrid-snapshot`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLiveSnapshotError(data.error ?? "Could not verify LabelGrid.");
          setLiveSnapshot(null);
          return;
        }
        setLiveSnapshot(data.snapshot);
        setLiveSnapshotError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setLiveSnapshot(null);
          setLiveSnapshotError("Network error while checking LabelGrid.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.step, state.releaseId]);

  // -------------------------------------------------------------------------
  // Navigation

  async function ensureDraftThenContinue() {
    if (continuing) return;
    setError("");
    const msg = validateStep(state, state.step, roleCategories);
    if (msg) {
      setError(msg);
      return;
    }

    const leavingDistribution = state.step === STEP_DISTRIBUTION;
    const leavingCredits = state.step === STEP_CREDITS;

    setContinuing(true);
    try {
      if (leavingDistribution) {
        const result = state.releaseId
          ? await saveDraft(stateRef.current, {
              syncToLabelGrid: true,
              forceArtwork: true,
            })
          : await createDraft(stateRef.current);
        if (!result.labelgridOk) {
          setError(
            result.error ??
              "Could not create the release on LabelGrid. Please try again."
          );
          return;
        }
      } else if (leavingCredits) {
        const result = await saveDraft(stateRef.current, {
          syncToLabelGrid: true,
          forceArtwork: true,
        });
        if (!result.labelgridOk) {
          setError(
            result.error ??
              "Could not sync your tracks to LabelGrid. Please try again."
          );
          return;
        }
      }
      // Other transitions are pure client-side step changes.

      setState((prev) => {
        const nextStep = Math.min(prev.step + 1, WIZARD_STEPS.length - 1);
        if (prev.contentType === "Single") {
          const t0 = prev.tracks[0] ?? newTrack();
          return {
            ...prev,
            step: nextStep,
            tracks: [{ ...t0, title: t0.title || prev.title }],
          };
        }
        return { ...prev, step: nextStep };
      });
      if (leavingDistribution) {
        setEditingTrackId(state.tracks[0]?.clientId ?? null);
      }
    } finally {
      setContinuing(false);
    }
  }

  async function saveAndExit() {
    setError("");
    // Nothing exists anywhere until Distribution completes — no row to save.
    if (state.releaseId) {
      await saveDraft(stateRef.current, { syncToLabelGrid: false });
    }
    router.push("/dashboard/releases");
  }

  async function submitForReview() {
    if (submitting) return;
    setError("");
    const msg = validateStep(state, STEP_REVIEW, roleCategories);
    if (msg) {
      setError(msg);
      return;
    }
    for (let s = 0; s < WIZARD_STEPS.length - 1; s++) {
      const early = validateStep(state, s, roleCategories);
      if (early) {
        setError(early);
        patch({ step: s });
        return;
      }
    }
    if (state.tracks.some((t) => t.audioProcessing)) {
      setError(
        "Your audio is still processing on our distributor. This usually takes a moment — please try again shortly."
      );
      patch({ step: STEP_TRACKS });
      return;
    }

    setSubmitting(true);
    try {
      // Final defensive sync so LabelGrid reflects the latest state.
      const saved = await saveDraft(stateRef.current, {
        forceArtwork: true,
        syncToLabelGrid: true,
      });
      if (!saved.labelgridOk) {
        setError(
          saved.error ?? "Could not sync to LabelGrid before submitting."
        );
        setSubmitting(false);
        return;
      }
      const id = stateRef.current.releaseId;
      if (!id) {
        setError("Draft missing — try Save & Exit, then reopen.");
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/releases/${id}/submit-for-review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/releases/${id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };
  const stepMeta = WIZARD_STEPS[state.step];
  const artist = artists.find((a) => a.id === state.artistId);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <StepRail
        step={state.step}
        onJump={(i) => {
          if (i <= state.step) patch({ step: i });
        }}
      />

      <div className="mx-auto min-w-0 w-full max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              {stepMeta.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.step === STEP_RELEASE
                ? "Artwork, transfer status, and the release details stores will show."
                : state.step === STEP_DISTRIBUTION
                  ? "Pick stores and territories — completing this creates your release with the distributor."
                  : state.step === STEP_TRACKS
                    ? "Upload masters and fill in track details."
                    : state.step === STEP_CREDITS
                      ? "Contributors, publishing splits, publisher, and copyright."
                      : "Confirm everything looks right before sending to review."}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {saveStatus === "saving" ? (
              <span className="font-medium text-foreground">Saving…</span>
            ) : saveStatus === "saved" ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Check size={12} weight="bold" aria-hidden />
                Saved
              </span>
            ) : saveStatus === "sync-error" ? (
              <span
                className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
                title={syncErrorMessage ?? undefined}
              >
                <WarningCircle size={12} weight="fill" aria-hidden />
                Saved — distributor sync pending
              </span>
            ) : saveStatus === "error" ? (
              <span className="text-destructive">Save failed</span>
            ) : null}
            <button
              type="button"
              onClick={() => void saveAndExit()}
              className="cursor-pointer font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Save & Exit
            </button>
          </div>
        </div>

        {error ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="border border-destructive/40 bg-destructive/5 px-4 py-3 outline-none"
          >
            <div className="flex items-start gap-3">
              <WarningCircle
                size={18}
                weight="fill"
                className="mt-0.5 shrink-0 text-destructive"
                aria-hidden
              />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.step}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={transition}
            className="space-y-5"
          >
            {state.step === STEP_RELEASE ? (
              <StepRelease
                state={state}
                patch={patch}
                artists={artists}
                genres={genres}
                setError={setError}
              />
            ) : null}

            {state.step === STEP_DISTRIBUTION ? (
              <StepDistribution
                state={state}
                patch={patch}
                outlets={outlets}
                territories={territories}
              />
            ) : null}

            {state.step === STEP_TRACKS ? (
              <StepTracks
                state={state}
                setState={setState}
                updateTrack={updateTrack}
                editingTrackId={editingTrackId}
                setEditingTrackId={setEditingTrackId}
                primaryArtistName={artist?.name ?? ""}
              />
            ) : null}

            {state.step === STEP_CREDITS ? (
              <StepCredits
                state={state}
                patch={patch}
                setState={setState}
                contributorRoles={contributorRoles}
              />
            ) : null}

            {state.step === STEP_REVIEW ? (
              <StepReview
                state={state}
                patch={patch}
                artistName={artist?.name ?? ""}
                outlets={outlets}
                liveSnapshot={liveSnapshot}
                liveSnapshotError={liveSnapshotError}
                onJump={(step) => patch({ step })}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div
          className={cn(
            "sticky bottom-0 z-10 -mx-1 border border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={state.step === STEP_RELEASE || submitting || continuing}
              onClick={() => patch({ step: Math.max(0, state.step - 1) })}
            >
              <ArrowLeft size={16} weight="bold" aria-hidden />
              Back
            </Button>
            {state.step < WIZARD_STEPS.length - 1 ? (
              <Button
                type="button"
                className="h-11 px-5"
                loading={continuing}
                onClick={() => void ensureDraftThenContinue()}
              >
                Continue
                {!continuing ? (
                  <ArrowRight size={16} weight="bold" aria-hidden />
                ) : null}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 px-5"
                loading={submitting}
                onClick={() => void submitForReview()}
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
