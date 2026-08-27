"use client";

/**
 * Step 4 — Credits, following LabelGrid's track data model:
 * - Contributors → track `contributors` (writer_id + roles + ai_contribution)
 * - Publishing splits → track `writers` (writer_id + roles + percentage_share,
 *   must total 100)
 * - Publishers → track `publishers` (id + regions + percentage_share, must
 *   total 100) with a self-published option (publishers omitted — the field
 *   is optional in TrackCreateData, so "no publisher" is simply absence)
 * - ℗/© year + owner → pline/cline fields
 *
 * Every role chip shown here — for contributors AND for writer/publishing
 * splits — comes straight from the live GET /contributor-roles response,
 * grouped by LabelGrid's own `category` field. Nothing is hardcoded: no
 * role name is ever offered unless this catalog actually returned it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONTRIBUTOR_ROLES,
  WRITER_SPLIT_ROLE_ALLOWLIST,
  type ContributorDraft,
} from "@/lib/releases/constants";
import {
  newContributor,
  newPublisherSplit,
  newWriterSplit,
  type WizardState,
} from "@/lib/releases/wizard-types";
import {
  DropdownPanel,
  EntityPicker,
  Panel,
  YesNo,
  type CatalogState,
  type ContributorRole,
} from "./shared";

export function splitTotal(rows: Array<{ share: number }>): number {
  return rows.reduce((sum, r) => sum + (Number.isFinite(r.share) ? r.share : 0), 0);
}

type RoleGroup = { category: string; roles: ContributorRole[] };

/** Group live catalog rows by LabelGrid's own `category`, sorted by `position`. */
function groupRolesByCategory(items: ContributorRole[]): RoleGroup[] {
  const map = new Map<string, ContributorRole[]>();
  for (const r of items) {
    const key = r.category?.trim() || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  for (const roles of map.values()) {
    roles.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return [...map.entries()]
    .map(([category, roles]) => ({ category, roles }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Resolve DEFAULT_CONTRIBUTOR_ROLES against the live catalog, preserving
 * the catalog's own casing/spelling — a name that isn't actually in the
 * live response is simply skipped rather than sent unresolved.
 */
function resolveDefaultRoles(items: ContributorRole[]): string[] {
  const byLower = new Map(
    items.map((r) => [r.display_value.trim().toLowerCase(), r.display_value])
  );
  return DEFAULT_CONTRIBUTOR_ROLES.map((name) =>
    byLower.get(name.toLowerCase())
  ).filter((v): v is string => Boolean(v));
}

/**
 * Publishing-split roles are narrower than the "Composition & Lyrics"
 * catalog category — confirmed against the live API, not guessed: a
 * writers[] payload with {Composer, Lyricist, Songwriter, Arranger} was
 * accepted for Composer/Lyricist and rejected ("The selected writer role
 * is not valid.") for Songwriter/Arranger, even though all four share that
 * category. See WRITER_SPLIT_ROLE_ALLOWLIST. Every role NAME still comes
 * from the live catalog — this only narrows which of the live rows are
 * offered for a writer split; "Songwriter" stays available as a
 * contributor role.
 */
export function pickWriterSplitRoles(
  catalog: CatalogState<ContributorRole>
): ContributorRole[] {
  const allowlist = new Set(
    WRITER_SPLIT_ROLE_ALLOWLIST.map((r) => r.toLowerCase())
  );
  return catalog.items.filter((r) =>
    allowlist.has(r.display_value.trim().toLowerCase())
  );
}

function logRoleSelection(scope: "contributor" | "writer-split", role: ContributorRole) {
  console.log("[credits/role-selected]", {
    scope,
    display_value: role.display_value,
    category: role.category,
  });
}

function RoleChip({
  role,
  on,
  title,
  onToggle,
}: {
  role: string;
  on: boolean;
  title?: string | null;
  onToggle: (role: string) => void;
}) {
  return (
    <button
      type="button"
      title={title ?? undefined}
      onClick={() => onToggle(role)}
      className={cn(
        "cursor-pointer border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-[var(--ease-rdistro)]",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary/50"
      )}
    >
      {role}
    </button>
  );
}

/** Role picker grouped under the category headings LabelGrid itself returns. */
function RoleGroupPicker({
  catalog,
  groups,
  selected,
  scope,
  emptyLabel,
  onToggle,
}: {
  catalog: CatalogState<unknown>;
  groups: RoleGroup[];
  selected: string[];
  scope: "contributor" | "writer-split";
  emptyLabel: string;
  onToggle: (role: ContributorRole) => void;
}) {
  if (!catalog.loaded) {
    return <p className="text-sm text-muted-foreground">Loading roles…</p>;
  }
  if (catalog.error) {
    return <p className="text-sm text-destructive">{catalog.error}</p>;
  }
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-40 space-y-3 overflow-y-auto pr-1">
      {groups.map((g) => (
        <div key={g.category}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {g.category}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.roles.map((r) => (
              <RoleChip
                key={r.display_value}
                role={r.display_value}
                title={r.description}
                on={selected.includes(r.display_value)}
                onToggle={() => {
                  logRoleSelection(scope, r);
                  onToggle(r);
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A selected contributor role, shown as a removable tag. */
function SelectedRoleChip({
  role,
  onRemove,
}: {
  role: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
      {role}
      <button
        type="button"
        aria-label={`Remove ${role}`}
        onClick={onRemove}
        className="cursor-pointer hover:opacity-70"
      >
        <X size={12} weight="bold" aria-hidden />
      </button>
    </span>
  );
}

/**
 * "+ Add role" trigger that opens a searchable, category-grouped dropdown
 * of roles NOT already selected — the live catalog is fetched once by the
 * parent step; this only filters/searches it client-side.
 */
function AddRoleDropdown({
  catalog,
  selected,
  scope,
  onAdd,
}: {
  catalog: CatalogState<ContributorRole>;
  selected: string[];
  scope: "contributor" | "writer-split";
  onAdd: (role: ContributorRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const available = catalog.items.filter((r) => !selected.includes(r.display_value));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? available.filter((r) => r.display_value.toLowerCase().includes(q))
    : available;
  const groups = groupRolesByCategory(filtered);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-[var(--ease-rdistro)] hover:border-primary/50 hover:text-foreground"
      >
        + Add role
      </button>
      <DropdownPanel
        show={open}
        className="absolute z-20 mt-1 w-64 border border-border bg-card shadow-md"
      >
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles"
            className="h-9 w-full border-b border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <div className="max-h-56 overflow-y-auto py-1 text-sm">
            {!catalog.loaded ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Loading roles…
              </p>
            ) : catalog.error ? (
              <p className="px-3 py-2 text-xs text-destructive">{catalog.error}</p>
            ) : groups.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {available.length === 0
                  ? "All available roles added."
                  : "No matching roles."}
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.category}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.category}
                  </p>
                  {g.roles.map((r) => (
                    <button
                      key={r.display_value}
                      type="button"
                      title={r.description ?? undefined}
                      className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-muted"
                      onClick={() => {
                        logRoleSelection(scope, r);
                        onAdd(r);
                        setQuery("");
                      }}
                    >
                      {r.display_value}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
      </DropdownPanel>
    </div>
  );
}

function SplitTotal({ rows }: { rows: Array<{ share: number }> }) {
  const total = splitTotal(rows);
  const ok = Math.abs(total - 100) < 0.001;
  return (
    <p
      className={cn(
        "text-right text-sm font-semibold",
        ok ? "text-foreground" : "text-destructive"
      )}
    >
      Total {total.toFixed(2)}%{ok ? "" : " — must equal 100%"}
    </p>
  );
}

export function StepCredits({
  state,
  patch,
  setState,
  contributorRoles,
}: {
  state: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  contributorRoles: CatalogState<ContributorRole>;
}) {
  // Contributors may hold ANY role LabelGrid returns — there's no category
  // restriction on a single contributor, only a coverage requirement across
  // all of them (enforced in validateStep). Writer splits are restricted to
  // the allowlist the live API has actually validated for that payload.
  const writerEligibleRoles = useMemo(
    () => pickWriterSplitRoles(contributorRoles),
    [contributorRoles]
  );
  const writerGroups = useMemo(
    () => groupRolesByCategory(writerEligibleRoles),
    [writerEligibleRoles]
  );

  const validContributorRoles = useMemo(
    () => new Set(contributorRoles.items.map((r) => r.display_value)),
    [contributorRoles.items]
  );
  const validWriterRoles = useMemo(
    () => new Set(writerEligibleRoles.map((r) => r.display_value)),
    [writerEligibleRoles]
  );

  // Once the live catalog (re)loads, drop any previously-selected role that
  // no longer exists in it — e.g. a role picked before the catalog loaded,
  // or one that belonged to the wrong panel from an earlier build of this
  // step. Never send a stale label LabelGrid never actually offered.
  useEffect(() => {
    if (!contributorRoles.loaded || contributorRoles.items.length === 0) return;
    setState((prev) => {
      let changed = false;
      const contributors = prev.contributors.map((c) => {
        const roles = c.roles.filter((r) => validContributorRoles.has(r));
        if (roles.length === c.roles.length) return c;
        changed = true;
        return { ...c, roles };
      });
      const writerSplits = prev.writerSplits.map((w) => {
        const roles = w.roles.filter((r) => validWriterRoles.has(r));
        if (roles.length === w.roles.length) return w;
        changed = true;
        return { ...w, roles };
      });
      return changed ? { ...prev, contributors, writerSplits } : prev;
    });
  }, [
    contributorRoles.loaded,
    contributorRoles.items.length,
    validContributorRoles,
    validWriterRoles,
    setState,
  ]);

  // Backfill DEFAULT_CONTRIBUTOR_ROLES onto any contributor created before
  // the live catalog finished loading (e.g. the wizard's initial row).
  // Runs once per contributor — defaultsApplied flips true immediately
  // after, whether or not any default actually resolved, so a user who
  // deliberately removes all three default roles never sees them return.
  useEffect(() => {
    if (!contributorRoles.loaded) return;
    const defaults = resolveDefaultRoles(contributorRoles.items);
    setState((prev) => {
      let changed = false;
      const contributors = prev.contributors.map((c) => {
        if (c.defaultsApplied) return c;
        changed = true;
        const roles = c.roles.length === 0 ? defaults : c.roles;
        return { ...c, roles, defaultsApplied: true };
      });
      return changed ? { ...prev, contributors } : prev;
    });
  }, [contributorRoles.loaded, contributorRoles.items, setState]);

  return (
    <div className="space-y-5">
      {/* CONTRIBUTORS */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Contributors <span className="text-destructive">· Required</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cover at least Performer, Composition &amp; Lyrics, and
              Production &amp; Engineering across your contributors — the same
              person can hold several roles.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                contributors: [
                  ...prev.contributors,
                  newContributor(
                    resolveDefaultRoles(contributorRoles.items),
                    contributorRoles.loaded
                  ),
                ],
              }))
            }
          >
            <Plus size={14} weight="bold" aria-hidden />
            Add Contributor
          </Button>
        </div>

        {state.contributors.map((c) => (
          <div key={c.id} className="space-y-4 border border-border p-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium">Contributor</p>
              <EntityPicker
                endpoint="/api/labelgrid/writers"
                spec={{ mode: "person" }}
                selectedLabel={`${c.firstName} ${c.lastName}`.trim()}
                hasSelection={Boolean(c.writerId)}
                onSelect={(w) =>
                  setState((prev) => ({
                    ...prev,
                    contributors: prev.contributors.map((x) =>
                      x.id === c.id
                        ? {
                            ...x,
                            writerId: w.id,
                            firstName: w.first ?? "",
                            lastName: w.last ?? "",
                          }
                        : x
                    ),
                  }))
                }
                onClear={() =>
                  setState((prev) => ({
                    ...prev,
                    contributors: prev.contributors.map((x) =>
                      x.id === c.id
                        ? { ...x, writerId: null, firstName: "", lastName: "" }
                        : x
                    ),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Roles</p>
              <div className="flex flex-wrap items-center gap-2">
                {c.roles.map((role) => (
                  <SelectedRoleChip
                    key={role}
                    role={role}
                    onRemove={() =>
                      setState((prev) => ({
                        ...prev,
                        contributors: prev.contributors.map((x) =>
                          x.id === c.id
                            ? { ...x, roles: x.roles.filter((r) => r !== role) }
                            : x
                        ),
                      }))
                    }
                  />
                ))}
                <AddRoleDropdown
                  catalog={contributorRoles}
                  selected={c.roles}
                  scope="contributor"
                  onAdd={(role) =>
                    setState((prev) => ({
                      ...prev,
                      contributors: prev.contributors.map((x) =>
                        x.id === c.id && !x.roles.includes(role.display_value)
                          ? { ...x, roles: [...x.roles, role.display_value] }
                          : x
                      ),
                    }))
                  }
                />
              </div>
              {c.roles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No roles selected yet — use “+ Add role” above.
                </p>
              ) : null}
            </div>

            <Field
              id={`ai-${c.id}`}
              label="AI Contribution"
              as="select"
              value={c.aiContribution ?? "none"}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  contributors: prev.contributors.map((x) =>
                    x.id === c.id
                      ? {
                          ...x,
                          aiContribution: e.target
                            .value as ContributorDraft["aiContribution"],
                        }
                      : x
                  ),
                }))
              }
            >
              <option value="none">No AI</option>
              <option value="partly">Partly AI</option>
              <option value="all">Fully AI</option>
            </Field>

            {state.contributors.length > 1 ? (
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-destructive transition-opacity hover:opacity-70"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    contributors: prev.contributors.filter((x) => x.id !== c.id),
                  }))
                }
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </Panel>

      {/* WRITERS & COMPOSITION SPLITS */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Writers &amp; Composition Splits{" "}
              <span className="text-destructive">· Required</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Writer shares of the composition — LabelGrid only accepts
              Composer and/or Lyricist for a publishing split. Totals must
              equal 100%.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                writerSplits: [
                  ...prev.writerSplits,
                  newWriterSplit(prev.writerSplits.length === 0 ? 100 : 0),
                ],
              }))
            }
          >
            <Plus size={14} weight="bold" aria-hidden />
            Add Writer
          </Button>
        </div>

        {state.writerSplits.map((w) => (
          <div key={w.id} className="space-y-4 border border-border p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div className="grid gap-2">
                <p className="text-sm font-medium">Writer</p>
                <EntityPicker
                  endpoint="/api/labelgrid/writers"
                  spec={{ mode: "person" }}
                  selectedLabel={`${w.firstName} ${w.lastName}`.trim()}
                  hasSelection={Boolean(w.writerId)}
                  onSelect={(entity) =>
                    setState((prev) => ({
                      ...prev,
                      writerSplits: prev.writerSplits.map((x) =>
                        x.id === w.id
                          ? {
                              ...x,
                              writerId: entity.id,
                              firstName: entity.first ?? "",
                              lastName: entity.last ?? "",
                            }
                          : x
                      ),
                    }))
                  }
                  onClear={() =>
                    setState((prev) => ({
                      ...prev,
                      writerSplits: prev.writerSplits.map((x) =>
                        x.id === w.id
                          ? { ...x, writerId: null, firstName: "", lastName: "" }
                          : x
                      ),
                    }))
                  }
                />
              </div>
              <Field
                id={`share-${w.id}`}
                label="Share %"
                type="number"
                inputMode="decimal"
                value={String(w.share)}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    writerSplits: prev.writerSplits.map((x) =>
                      x.id === w.id
                        ? { ...x, share: Number(e.target.value) || 0 }
                        : x
                    ),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Role(s)</p>
              <RoleGroupPicker
                catalog={{ ...contributorRoles, items: writerEligibleRoles }}
                groups={writerGroups}
                selected={w.roles}
                scope="writer-split"
                emptyLabel="Composer/Lyricist roles not available from LabelGrid yet."
                onToggle={(role) =>
                  setState((prev) => ({
                    ...prev,
                    writerSplits: prev.writerSplits.map((x) => {
                      if (x.id !== w.id) return x;
                      const roles = x.roles.includes(role.display_value)
                        ? x.roles.filter((r) => r !== role.display_value)
                        : [...x.roles, role.display_value];
                      return { ...x, roles };
                    }),
                  }))
                }
              />
            </div>

            <button
              type="button"
              className="cursor-pointer text-xs font-medium text-destructive transition-opacity hover:opacity-70"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  writerSplits: prev.writerSplits.filter((x) => x.id !== w.id),
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}

        {state.writerSplits.length > 0 ? (
          <SplitTotal rows={state.writerSplits} />
        ) : null}
      </Panel>

      {/* PUBLISHER */}
      <Panel className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Publisher</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Required according to your RDISTRO workflow — who administers the
            publishing for this release.
          </p>
        </div>

        <YesNo
          label="Self-published (no publisher)?"
          value={state.selfPublished}
          onChange={(yes) =>
            patch({
              selfPublished: yes,
              ...(yes ? { publisherSplits: [] } : {}),
            })
          }
        />

        {!state.selfPublished ? (
          <>
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-3"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    publisherSplits: [
                      ...prev.publisherSplits,
                      newPublisherSplit(
                        prev.publisherSplits.length === 0 ? 100 : 0
                      ),
                    ],
                  }))
                }
              >
                <Plus size={14} weight="bold" aria-hidden />
                Add Publisher
              </Button>
            </div>

            {state.publisherSplits.map((p) => (
              <div
                key={p.id}
                className="grid gap-4 border border-border p-4 sm:grid-cols-[1fr_140px_auto] sm:items-end"
              >
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Publisher</p>
                  <EntityPicker
                    endpoint="/api/labelgrid/publishers"
                    spec={{ mode: "name", placeholder: "Search publishers" }}
                    selectedLabel={p.name}
                    hasSelection={Boolean(p.publisherId)}
                    onSelect={(entity) =>
                      setState((prev) => ({
                        ...prev,
                        publisherSplits: prev.publisherSplits.map((x) =>
                          x.id === p.id
                            ? { ...x, publisherId: entity.id, name: entity.label }
                            : x
                        ),
                      }))
                    }
                    onClear={() =>
                      setState((prev) => ({
                        ...prev,
                        publisherSplits: prev.publisherSplits.map((x) =>
                          x.id === p.id
                            ? { ...x, publisherId: null, name: "" }
                            : x
                        ),
                      }))
                    }
                  />
                </div>
                <Field
                  id={`pshare-${p.id}`}
                  label="Share %"
                  type="number"
                  inputMode="decimal"
                  value={String(p.share)}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      publisherSplits: prev.publisherSplits.map((x) =>
                        x.id === p.id
                          ? { ...x, share: Number(e.target.value) || 0 }
                          : x
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  className="cursor-pointer pb-2 text-xs font-medium text-destructive transition-opacity hover:opacity-70"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      publisherSplits: prev.publisherSplits.filter(
                        (x) => x.id !== p.id
                      ),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}

            {state.publisherSplits.length > 0 ? (
              <SplitTotal rows={state.publisherSplits} />
            ) : null}
          </>
        ) : null}
      </Panel>

      {/* COPYRIGHT */}
      <Panel className="space-y-5">
        <p className="text-sm font-semibold">
          Copyright <span className="text-destructive">· Required</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="plineYear"
            label="℗ Year"
            required
            value={state.plineYear}
            onChange={(e) => patch({ plineYear: e.target.value })}
          />
          <Field
            id="plineName"
            label="℗ Owner"
            required
            value={state.plineName}
            onChange={(e) => patch({ plineName: e.target.value })}
          />
          <Field
            id="clineYear"
            label="© Year"
            required
            value={state.clineYear}
            onChange={(e) => patch({ clineYear: e.target.value })}
          />
          <Field
            id="clineName"
            label="© Owner"
            required
            value={state.clineName}
            onChange={(e) => patch({ clineName: e.target.value })}
          />
        </div>
      </Panel>
    </div>
  );
}
