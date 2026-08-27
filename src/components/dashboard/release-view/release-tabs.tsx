"use client";

import { useState } from "react";
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

export type ReleaseActivityRow = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};

const TABS = [
  "Overview",
  "Tracks",
  "Credits & Rights",
  "Distribution",
  "Delivery",
  "Activity",
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
      <dd className="mt-0.5 truncate text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function explicitLabel(value: string | null): string {
  if (value === "on") return "Explicit";
  if (value === "edited") return "Clean / Edited";
  if (value === "off") return "Not Explicit";
  return "—";
}

export function ReleaseTabs({
  live,
  outletNames,
  territoryNames,
  trackDurationsByLgId,
  delivery,
  deliveryError,
  documents,
  activities,
}: {
  live: LiveRelease;
  outletNames: Record<string, string>;
  territoryNames: Record<string, string>;
  trackDurationsByLgId: Record<number, number | null>;
  delivery: DeliveryStatusData | null;
  deliveryError: string | null;
  documents: ReleaseDocument[];
  activities: ReleaseActivityRow[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              "shrink-0 cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-[var(--ease-rdistro)] " +
              (tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Overview" ? <OverviewTab live={live} /> : null}
        {tab === "Tracks" ? (
          <TracksTab
            tracks={live.tracks}
            trackDurationsByLgId={trackDurationsByLgId}
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
        {tab === "Activity" ? <ActivityTab activities={activities} /> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview

function OverviewTab({ live }: { live: LiveRelease }) {
  return (
    <div className="space-y-4">
      <Section title="Release">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Artists"
            value={live.artists.length ? live.artists.map((a) => a.name).join(", ") : live.artist}
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
  tracks,
  trackDurationsByLgId,
}: {
  tracks: LiveTrack[];
  trackDurationsByLgId: Record<number, number | null>;
}) {
  if (tracks.length === 0) {
    return (
      <Section>
        <p className="text-sm text-muted-foreground">No tracks yet.</p>
      </Section>
    );
  }
  return (
    <div className="divide-y divide-border border border-border bg-card">
      {tracks.map((t) => (
        <div key={t.id} className="px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="mr-3 tabular-nums text-muted-foreground">
                  {String(t.trackNumber ?? 0).padStart(2, "0")}
                </span>
                {t.title}
                {t.mixVersion ? ` (${t.mixVersion})` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.artist ?? "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>ISRC {t.isrc ?? "pending"}</span>
                <span>{explicitLabel(t.explicit)}</span>
                <span>{formatDuration(trackDurationsByLgId[t.id])}</span>
              </div>
            </div>
            <AudioCell audio={t.audio} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AudioCell({ audio }: { audio: LiveTrack["audio"] }) {
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
  if (audio.url) {
    return (
      <audio
        controls
        preload="none"
        src={audio.url}
        className="h-8 max-w-[240px] shrink-0"
      />
    );
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
          title={`${String(t.trackNumber ?? 0).padStart(2, "0")} · ${t.title}`}
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
                        {w.share != null ? ` · ${w.share}%` : ""}
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
      <Section title="Delivery" subtitle="LabelGrid delivery-status">
        {deliveryError ? (
          <p className="text-sm text-destructive">{deliveryError}</p>
        ) : !delivery ? (
          <p className="text-sm text-muted-foreground">
            No delivery data yet — available once this release is submitted
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
                            : "—"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {o.error_code ??
                            (o.attention_owner === "customer"
                              ? "Action needed on your end"
                              : "—")}
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

// ---------------------------------------------------------------------------
// Activity

function ActivityTab({ activities }: { activities: ReleaseActivityRow[] }) {
  if (activities.length === 0) {
    return (
      <Section>
        <p className="text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      </Section>
    );
  }
  return (
    <Section>
      <ol className="space-y-0">
        {activities.map((a, i) => (
          <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
            <span className="mt-1.5 flex flex-col items-center">
              <span className="size-2 shrink-0 rounded-full bg-primary" />
              {i < activities.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-border" />
              ) : null}
            </span>
            <div className="min-w-0 pb-1">
              <p className="text-sm font-medium">{a.title}</p>
              {a.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {a.description}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
