"use client";

/**
 * Step 5 — Review. Read-only summary of everything collected so far, with
 * an Edit action per section and the rights confirmation gate before
 * submit. Nothing here is fetched from LabelGrid — under the current
 * architecture nothing exists there yet at this point; the release is only
 * created once the user clicks Submit (see <SubmissionProgress>).
 */

import { getTrackCredits } from "@/lib/releases/track-credits";
import { ImageSquare, MusicNotes } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  STEP_CREDITS,
  STEP_DISTRIBUTION,
  STEP_RELEASE,
  STEP_TRACKS,
  type WizardState,
} from "@/lib/releases/wizard-types";
import {
  formatDuration,
  Panel,
  SummaryRow,
  type CatalogState,
  type Outlet,
} from "./shared";

function SectionHeader({
  title,
  onEdit,
}: {
  title: string;
  onEdit: () => void;
}) {
  return (
    <div className="mb-1 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold">{title}</p>
      <Button type="button" variant="ghost" className="h-8 px-3" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

export function StepReview({
  state,
  patch,
  artistName,
  featuredArtistName,
  outlets,
  onJump,
}: {
  state: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  artistName: string;
  featuredArtistName?: string;
  outlets: CatalogState<Outlet>;
  onJump: (step: number) => void;
}) {
  return (
    <div className="space-y-5">
      <Panel>
        <SectionHeader
          title="Artwork & Release"
          onEdit={() => onJump(STEP_RELEASE)}
        />
        <div className="flex items-start gap-4">
          <div className="size-24 shrink-0 overflow-hidden border border-border bg-muted">
            {state.artworkPreview || state.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.artworkPreview ?? state.artworkUrl ?? ""}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageSquare size={28} />
              </div>
            )}
          </div>
          <dl className="min-w-0 flex-1">
            <SummaryRow label="Title" value={state.title || "Untitled"} />
            <SummaryRow label="Artist" value={artistName} />
            {featuredArtistName ? <SummaryRow label="Featured artists" value={featuredArtistName} /> : null}
            <SummaryRow
              label="Type"
              value={`${state.contentType}${state.mixVersion ? ` · ${state.mixVersion}` : ""}`}
            />
            <SummaryRow label="Genre" value={state.primaryGenreName} />
            <SummaryRow label="Recording country" value={state.recordingCountry || "Not specified"} />
            <SummaryRow label="Release date" value={state.releaseDate} />
            {state.isTransfer ? (
              <SummaryRow
                label="Transfer"
                value={`from ${state.transferFromDistributor}${state.originalReleaseDate ? ` · original ${state.originalReleaseDate}` : ""}`}
              />
            ) : null}
            <SummaryRow label="UPC" value={state.upc || "Assigned automatically"} />
          </dl>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          title="Distribution"
          onEdit={() => onJump(STEP_DISTRIBUTION)}
        />
        <dl>
          <SummaryRow
            label="Stores"
            value={
              state.allStores
                ? "All available stores"
                : outlets.items
                    .filter((o) => state.selectedOutletKeys.includes(o.key))
                    .map((o) => o.name)
                    .join(", ") || "None selected"
            }
          />
          <SummaryRow
            label="Territories"
            value={
              state.worldwide
                ? "Worldwide"
                : state.territoryCodes.join(", ") || "None"
            }
          />
        </dl>
      </Panel>

      <Panel>
        <SectionHeader title="Tracks" onEdit={() => onJump(STEP_TRACKS)} />
        <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <MusicNotes size={14} aria-hidden />
          {state.tracks.length} track{state.tracks.length === 1 ? "" : "s"}
        </p>
        <dl>
          {state.tracks.map((t, i) => (
            <SummaryRow
              key={t.clientId}
              label={`${i + 1}`}
              value={`${t.title || "Untitled"} · ${formatDuration(t.audioDurationSec)} · ${
                t.explicit === "on"
                  ? "Explicit"
                  : t.explicit === "edited"
                    ? "Clean"
                    : "Not explicit"
              }`}
            />
          ))}
        </dl>
      </Panel>

      <Panel>
        <SectionHeader
          title="Credits & Rights"
          onEdit={() => onJump(STEP_CREDITS)}
        />
        <dl>
          {state.tracks.map((track, index) => {
            const credits = getTrackCredits(track, state);
            return <div key={track.clientId} className="mb-4 border-b border-border pb-4 last:mb-0">
              <h3 className="mb-2 text-sm font-semibold">{index + 1}. {track.title || "Untitled track"}</h3>
              <SummaryRow label="Contributors" value={credits.contributors.filter((c) => c.writerId).map((c) => `${c.firstName} ${c.lastName} (${c.roles.join(", ")})`).join("; ")} />
              <SummaryRow label="Composition splits" value={credits.writerSplits.map((w) => `${w.firstName} ${w.lastName} ${w.share}% (${w.roles.join(", ")})`).join("; ")} />
              <SummaryRow label="Publisher" value={credits.selfPublished ? "Self-published" : credits.publisherSplits.map((p) => `${p.name} ${p.share}%`).join("; ") || "None"} />
            </div>;
          })}
          <SummaryRow
            label="©"
            value={`${state.clineYear} ${state.clineName}`}
          />
          <SummaryRow
            label="℗"
            value={`${state.plineYear} ${state.plineName}`}
          />
        </dl>
      </Panel>

      <Panel>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={state.rightsConfirmed}
            onChange={(e) => patch({ rightsConfirmed: e.target.checked })}
          />
          <span className="text-sm leading-relaxed">
            I confirm I own or control the rights needed to distribute this
            release, including composition, recording, artwork, and any samples
            or covers, and that the information provided is accurate. <span className="text-destructive" aria-hidden="true">*</span>
          </span>
        </label>
      </Panel>
    </div>
  );
}
