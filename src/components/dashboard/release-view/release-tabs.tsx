"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LiveRelease, LiveTrack } from "@/lib/labelgrid/live-release";
import {
  deliveryStateLabel,
  deliveryStateTone,
  operationLabel,
  outletStateLabel,
  outletStateTone,
} from "@/lib/labelgrid/state-labels";
import { Badge } from "./badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DashboardProviderAudio } from "@/components/dashboard/provider-media";

type DeliveryOutletRow = {
  outlet: string;
  state: string;
  operation: string;
  customer_state: string;
  attention_owner: string;
  error_code: string | null;
  updated_at: string | null;
};

export type DeliveryStatusData = {
  state: string;
  currentlyLive: boolean;
  everSubmitted: boolean;
  everDelivered: boolean;
  outlets: DeliveryOutletRow[];
};

export type ReleaseDocument = {
  id: string;
  filename: string;
  kind: string;
  url: string;
};

const TABS = [
  "Overview",
  "Tracks",
  "Credits & Rights",
  "Distribution",
  "Delivery",
] as const;
type Tab = (typeof TABS)[number];

function Section({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      {title ? (
        <CardHeader className="p-4 sm:p-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle ? (
              <CardDescription className="text-xs">{subtitle}</CardDescription>
            ) : null}
          </div>
        </CardHeader>
      ) : null}
      <CardBody className="p-4 sm:p-4">{children}</CardBody>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value ?? "-"}</dd>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "-";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function explicitLabel(value: string | null): string {
  if (value === "on") return "Explicit";
  if (value === "edited") return "Clean / Edited";
  if (value === "off") return "Not Explicit";
  return "-";
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "-";
  const mb = bytes / 1024 / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export function ReleaseTabs({
  releaseId,
  live,
  outletNames,
  territoryNames,
  trackDurationsByLgId,
  trackIdsByLgId,
  delivery,
  deliveryError,
  documents,
}: {
  releaseId: string;
  live: LiveRelease;
  outletNames: Record<string, string>;
  territoryNames: Record<string, string>;
  trackDurationsByLgId: Record<number, number | null>;
  trackIdsByLgId: Record<number, string>;
  delivery: DeliveryStatusData | null;
  deliveryError: string | null;
  documents: ReleaseDocument[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const reduceMotion = useReducedMotion();

  return (
    <div className="border border-border bg-card">
      <div
        role="tablist"
        aria-label="Release details"
        className="flex overflow-x-auto border-b border-border bg-muted/25 p-2"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              "shrink-0 cursor-pointer border px-3 py-2 text-sm font-medium transition-colors duration-200 ease-[var(--ease-rdistro)] " +
              (tab === t
                ? "border-border bg-background text-foreground"
                : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "Overview" ? <OverviewTab live={live} /> : null}
            {tab === "Tracks" ? (
              <TracksTab
                releaseId={releaseId}
                tracks={live.tracks}
                trackDurationsByLgId={trackDurationsByLgId}
                trackIdsByLgId={trackIdsByLgId}
              />
            ) : null}
            {tab === "Credits & Rights" ? (
              <CreditsTab live={live} documents={documents} />
            ) : null}
            {tab === "Distribution" ? (
              <DistributionTab
                live={live}
                outletNames={outletNames}
                territoryNames={territoryNames}
              />
            ) : null}
            {tab === "Delivery" ? (
              <DeliveryTab
                delivery={delivery}
                deliveryError={deliveryError}
                outletNames={outletNames}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview

function OverviewTab({ live }: { live: LiveRelease }) {
  const creditCount = live.tracks.reduce(
    (sum, track) =>
      sum +
      track.contributors.length +
      track.writers.length +
      track.publishers.length,
    0
  );
  const allStores =
    live.dspConfigs.length === 0 ||
    live.dspConfigs.some(
      (config) => config.outletId === "all_dsps" && config.enabled
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 border border-border bg-card lg:grid-cols-4">
        {[
          ["Tracks", live.tracks.length],
          ["Artists", live.artists.length || (live.artist ? 1 : 0)],
          ["Credits", creditCount],
          [
            "Stores",
            allStores
              ? "All"
              : live.dspConfigs.filter((config) => config.enabled).length,
          ],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={cn("p-4", index < 3 && "border-r border-border")}
          >
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>

      <Section title="Release metadata" subtitle="Catalog and presentation data">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Title" value={live.title} />
          <Field
            label="Artists"
            value={
              live.artists.length
                ? live.artists
                    .map((artist) =>
                      `${artist.name}${artist.role ? ` (${artist.role})` : ""}`
                    )
                    .join(", ")
                : live.artist
            }
          />
          <Field label="Version" value={live.mixVersion} />
          <Field label="UPC" value={live.barcodeNumber} />
          <Field label="Genre" value={live.primaryGenre} />
          <Field label="Release date" value={formatDate(live.releaseDate)} />
          <Field label="Type" value={live.contentType} />
          <Field
            label="Artwork AI usage"
            value={
              live.artworkAiUsage
                ? live.artworkAiUsage.charAt(0).toUpperCase() +
                  live.artworkAiUsage.slice(1)
                : "None"
            }
          />
          <Field label="Localization" value={live.preferredLocalization} />
          <Field label="Catalog number" value={live.catalogNumber} />
          <Field label="Explicit content" value={explicitLabel(live.explicit)} />
          <Field label="Distribution ID" value={live.id} />
          <Field label="Genre ID" value={live.primaryGenreId} />
          <Field label="Review status" value={live.reviewStatus} />
        </dl>
      </Section>

      <Section title="Copyright">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="℗ Year" value={live.plineYear} />
          <Field label="℗ Owner" value={live.plineName} />
          <Field label="© Year" value={live.clineYear} />
          <Field label="© Owner" value={live.clineName} />
        </dl>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tracks

function TracksTab({
  releaseId,
  tracks,
  trackDurationsByLgId,
  trackIdsByLgId,
}: {
  releaseId: string;
  tracks: LiveTrack[];
  trackDurationsByLgId: Record<number, number | null>;
  trackIdsByLgId: Record<number, string>;
}) {
  if (tracks.length === 0) {
    return (
      <Section>
        <p className="text-sm text-muted-foreground">No tracks yet.</p>
      </Section>
    );
  }
  return (
    <div className="space-y-3">
      {tracks.map((track) => (
        <article key={track.id} className="border border-border bg-card">
          <header className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center bg-foreground text-xs font-semibold text-background tabular-nums">
                {String(track.trackNumber ?? 0).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {track.title}
                  {track.mixVersion ? ` (${track.mixVersion})` : ""}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {track.artist ?? "Artist unavailable"}
                </p>
              </div>
            </div>
            <AudioCell audio={track.audio} releaseId={releaseId} trackId={trackIdsByLgId[track.id]} />
          </header>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 p-4 sm:grid-cols-4 lg:grid-cols-6">
            <Field label="ISRC" value={track.isrc ?? "Pending"} />
            <Field label="ISWC" value={track.iswc ?? "Pending"} />
            <Field
              label="Duration"
              value={formatDuration(trackDurationsByLgId[track.id])}
            />
            <Field label="Content" value={explicitLabel(track.explicit)} />
            <Field label="Contributors" value={track.contributors.length} />
            <Field label="Writers" value={track.writers.length} />
            <Field label="Publishers" value={track.publishers.length} />
            <Field label="Track ID" value={track.id} />
            <Field label="Audio file" value={track.audio?.filename} />
            <Field
              label="File size"
              value={formatFileSize(track.audio?.filesize ?? null)}
            />
            <Field label="Audio status" value={track.audio?.status} />
          </dl>
        </article>
      ))}
    </div>
  );
}

function AudioCell({ audio, releaseId, trackId }: { audio: LiveTrack["audio"]; releaseId: string; trackId?: string }) {
  if (!audio) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone="neutral">No audio</Badge>
      </div>
    );
  }
  if (audio.status && /process|queue|pend/i.test(audio.status)) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone="info">Processing</Badge>
      </div>
    );
  }
  if (audio.status && /fail|error|reject/i.test(audio.status)) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone="danger">Failed</Badge>
      </div>
    );
  }
  if (audio.url && trackId) {
    return <DashboardProviderAudio releaseId={releaseId} trackId={trackId} />;
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Badge tone="neutral">No audio</Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credits & Rights

function CreditsTab({
  live,
  documents,
}: {
  live: LiveRelease;
  documents: ReleaseDocument[];
}) {
  return (
    <div className="space-y-4">
      {live.tracks.map((t) => (
        <Section
          key={t.id}
          title={`${String(t.trackNumber ?? 0).padStart(2, "0")} - ${t.title}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contributors
              </p>
              {t.contributors.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {t.contributors.map((c) => (
                    <li key={c.id}>
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {c.roles.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">None</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Writers
              </p>
              {t.writers.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {t.writers.map((w) => (
                    <li key={w.id}>
                      <span className="font-medium">{w.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {w.roles.join(", ")}
                        {w.share != null ? `, ${w.share}%` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">None</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Publishers
              </p>
              {t.publishers.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {t.publishers.map((p, i) => (
                    <li key={`${p.id}-${i}`}>
                      <span className="font-medium">{p.name}</span>{" "}
                      {p.share != null ? (
                        <span className="text-xs text-muted-foreground">
                          {p.share}%
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Self-published
                </p>
              )}
            </div>
          </div>
        </Section>
      ))}

      <Section title="Copyright">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="℗ Year" value={live.plineYear} />
          <Field label="℗ Owner" value={live.plineName} />
          <Field label="© Year" value={live.clineYear} />
          <Field label="© Owner" value={live.clineName} />
        </dl>
      </Section>

      {documents.length > 0 ? (
        <Section title="Licenses & documents">
          <ul className="divide-y divide-border text-sm">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span>
                  <span className="font-medium">{d.filename}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {d.kind}
                  </span>
                </span>
                <a
                  href={d.url}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribution

function DistributionTab({
  live,
  outletNames,
  territoryNames,
}: {
  live: LiveRelease;
  outletNames: Record<string, string>;
  territoryNames: Record<string, string>;
}) {
  const allDsps = live.dspConfigs.find((c) => c.outletId === "all_dsps");
  const isAllStores = allDsps ? allDsps.enabled : live.dspConfigs.length === 0;
  const enabledOutlets = live.dspConfigs.filter(
    (c) => c.enabled && c.outletId !== "all_dsps"
  );

  return (
    <div className="space-y-4">
      <Section title="Stores">
        {isAllStores ? (
          <Badge tone="success">All available stores</Badge>
        ) : enabledOutlets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {enabledOutlets.map((c) => (
              <Badge key={c.outletId} tone="neutral">
                {outletNames[c.outletId] ?? c.outletId}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No stores selected.</p>
        )}
      </Section>

      <Section title="Territories">
        {live.worldwide ? (
          <Badge tone="success">Worldwide</Badge>
        ) : (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Worldwide, excluding:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {live.excludedTerritoryCodes.map((code) => (
                <Badge key={code} tone="neutral">
                  {territoryNames[code] ?? code}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Release date">
        <p className="text-sm font-medium">{formatDate(live.releaseDate)}</p>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery

function DeliveryTab({
  delivery,
  deliveryError,
  outletNames,
}: {
  delivery: DeliveryStatusData | null;
  deliveryError: string | null;
  outletNames: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <Section title="Delivery" subtitle="Store delivery status">
        {deliveryError ? (
          <p className="text-sm text-destructive">{deliveryError}</p>
        ) : !delivery ? (
          <p className="text-sm text-muted-foreground">
            No delivery data yet. It becomes available once this release is submitted
            for distribution.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={deliveryStateTone(delivery.state)}>
                {deliveryStateLabel(delivery.state)}
              </Badge>
              {delivery.currentlyLive ? (
                <Badge tone="success">Live</Badge>
              ) : null}
            </div>

            {delivery.outlets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outlet-level delivery data yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <th className="py-2 pr-3">DSP</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Operation</th>
                      <th className="py-2 pr-3">Last Update</th>
                      <th className="py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {delivery.outlets.map((o, i) => (
                      <tr key={`${o.outlet}-${i}`}>
                        <td className="py-2.5 pr-3 font-medium">
                          {outletNames[o.outlet] ?? o.outlet}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={outletStateTone(o.state)}>
                            {outletStateLabel(o.state)}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          {operationLabel(o.operation)}
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          {o.updated_at
                            ? new Date(o.updated_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {o.error_code ??
                            (o.attention_owner === "customer"
                              ? "Action needed on your end"
                              : "-")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
}
