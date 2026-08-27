"use client";

/**
 * Release Builder — Release → Distribution → Tracks → Credits → Review.
 *
 * Network model: Steps 1-4 are LOCAL DATA ENTRY ONLY. Every "Continue"
 * click (and Save & Exit) saves metadata to the RDISTRO database — title,
 * tracks, contributors, splits, license documents — but NEVER touches
 * LabelGrid: no release/track is created or updated there, and artwork/
 * audio files stay as in-memory File objects in this component's state,
 * never uploaded anywhere, until the user reaches Step 5 and clicks
 * "Submit Release". That single action drives the whole LabelGrid sync
 * (create release → upload artwork → create tracks → upload audio → wait
 * for processing → sync credits) through <SubmissionProgress>, which is
 * resumable and idempotent — see /api/releases/[id]/submit/*.
 *
 * LabelGrid is the catalog source of truth once Submit has run; RDISTRO
 * stores ownership, mapping ids, and workflow state only.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, WarningCircle, Check } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseJsonObject, type TrackMetadata } from "@/lib/releases/constants";
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
import { StepReview } from "./step-review";
import { SubmissionProgress } from "./submission-progress";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveDraftResult = {
  ok: boolean;
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
    ok: boolean;
    error?: string;
  }> | null>(null);
  const saveInFlight = useRef<Promise<SaveDraftResult> | null>(null);
  const queuedSave = useRef(false);

  const [state, setState] = useState<WizardState>(
    () => initialWizard ?? initialState(artists, defaultArtistId)
  );
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [continuing, setContinuing] = useState(false);
  const [submissionStarted, setSubmissionStarted] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

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
  // Local draft persistence — Steps 1-4 only. Never touches LabelGrid.

  async function createDraft(
    current: WizardState
  ): Promise<{ id: string | null; ok: boolean; error?: string }> {
    if (current.releaseId) {
      return { id: current.releaseId, ok: true };
    }
    if (createInFlight.current) return createInFlight.current;

    const run = (async () => {
      setSaveStatus("saving");
      try {
        const fd = new FormData();
        fd.set("payload", JSON.stringify(releasePayloadFields(current)));
        const res = await fetch("/api/releases/drafts", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveStatus("error");
          setError(data.error ?? "Could not create draft");
          return { id: null, ok: false, error: data.error };
        }
        const id = data.release.id as string;
        setState((prev) => ({ ...prev, releaseId: id }));
        setSaveStatus("saved");
        return { id, ok: true };
      } catch {
        setSaveStatus("error");
        setError("Network error while saving draft.");
        return { id: null, ok: false, error: "Network error" };
      } finally {
        createInFlight.current = null;
      }
    })();

    createInFlight.current = run;
    return run;
  }

  async function saveDraft(current: WizardState): Promise<SaveDraftResult> {
    if (saveInFlight.current) {
      queuedSave.current = true;
      return saveInFlight.current;
    }

    const run = performSaveDraft(current).finally(() => {
      saveInFlight.current = null;
      if (queuedSave.current) {
        queuedSave.current = false;
        void saveDraft(stateRef.current);
      }
    });
    saveInFlight.current = run;
    return run;
  }

  async function performSaveDraft(
    current: WizardState
  ): Promise<SaveDraftResult> {
    let id = current.releaseId;
    if (!id) {
      const created = await createDraft(current);
      if (!created.id) {
        return { ok: false, error: created.error };
      }
      id = created.id;
      current = { ...stateRef.current, releaseId: id };
    }

    setSaveStatus("saving");
    try {
      const fd = new FormData();
      fd.set("payload", JSON.stringify(buildPayload(current)));
      for (const t of current.tracks) {
        if (t.licenseFile) fd.set(`license_${t.clientId}`, t.licenseFile);
      }
      const res = await fetch(`/api/releases/${id}/draft`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        setError(data.error ?? "Save failed");
        return { ok: false, error: data.error };
      }

      const release = data.release;
      setState((prev) => {
        const byClient = new Map(prev.tracks.map((t) => [t.clientId, t]));
        const nextTracks: WizardTrack[] =
          Array.isArray(release.tracks) && release.tracks.length
            ? release.tracks.map(
                (
                  rt: { id: string; title: string; metadataJson?: string },
                  i: number
                ) => {
                  const existing =
                    prev.tracks[i] ??
                    [...byClient.values()].find((t) => t.title === rt.title) ??
                    newTrack();
                  const tMeta = parseJsonObject<TrackMetadata>(rt.metadataJson);
                  return {
                    ...existing,
                    id: rt.id,
                    title: existing.title || rt.title,
                    licenseFile: null,
                    licenseUrl: tMeta.licenseUrl ?? existing.licenseUrl,
                    originalTrackLink:
                      tMeta.originalTrackLink ?? existing.originalTrackLink,
                  };
                }
              )
            : prev.tracks.map((t) => ({
                ...t,
                licenseFile: t.licenseFile ? null : t.licenseFile,
              }));

        return { ...prev, releaseId: release.id, tracks: nextTracks };
      });

      setSaveStatus("saved");
      return { ok: true };
    } catch {
      setSaveStatus("error");
      return { ok: false, error: "Network error" };
    }
  }

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

    setContinuing(true);
    try {
      // Every step transition saves metadata locally — never LabelGrid.
      const result = state.releaseId
        ? await saveDraft(stateRef.current)
        : await createDraft(stateRef.current);
      if (!result.ok) {
        setError(
          result.error ?? "Could not save your progress. Please try again."
        );
        return;
      }

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
      await saveDraft(stateRef.current);
    }
    router.push("/dashboard/releases");
  }

  /**
   * Step 5's Submit button — purely a client-side validation gate. All
   * data through Step 4 is already saved locally (every Continue click
   * saves it); there's nothing left to persist here. Once validated, this
   * hands off to <SubmissionProgress>, which drives the entire LabelGrid
   * sync (create release → artwork → tracks → audio → processing →
   * credits → finalize).
   */
  function beginSubmission() {
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
    if (!state.releaseId) {
      setError("Draft missing — try Save & Exit, then reopen.");
      return;
    }
    if (state.tracks.some((t) => !t.id)) {
      setError("Your tracks are still saving — please wait a moment and try again.");
      return;
    }
    setSubmissionStarted(true);
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
            ) : saveStatus === "error" ? (
              <span className="text-destructive">Save failed</span>
            ) : null}
            {!submissionStarted ? (
              <button
                type="button"
                onClick={() => void saveAndExit()}
                className="cursor-pointer font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Save & Exit
              </button>
            ) : null}
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
                onJump={(step) => patch({ step })}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {submissionStarted && state.releaseId ? (
          <SubmissionProgress
            releaseId={state.releaseId}
            title={state.title}
            artworkFile={state.artworkFile}
            tracks={state.tracks.map((t) => ({
              id: t.id ?? null,
              clientId: t.clientId,
              title: t.title,
              audioFile: t.audioFile,
            }))}
            onCancel={() => setSubmissionStarted(false)}
          />
        ) : (
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
                disabled={state.step === STEP_RELEASE || continuing}
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
                  onClick={beginSubmission}
                >
                  Submit Release
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
