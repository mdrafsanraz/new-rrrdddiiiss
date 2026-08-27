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
 * Writers, publishers, and roles all come from live LabelGrid catalogs.
 */

import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { cn } from "@/lib/utils";
import type { ContributorDraft } from "@/lib/releases/constants";
import {
  newContributor,
  newPublisherSplit,
  newWriterSplit,
  type WizardState,
} from "@/lib/releases/wizard-types";
import {
  CatalogStatus,
  EntityPicker,
  Panel,
  YesNo,
  type CatalogState,
  type ContributorRole,
} from "./shared";

export function splitTotal(rows: Array<{ share: number }>): number {
  return rows.reduce((sum, r) => sum + (Number.isFinite(r.share) ? r.share : 0), 0);
}

/**
 * Contributor roles offered in the picker. The live catalog is large;
 * these four cover LabelGrid's required categories (Artist → Performer,
 * Composer/Songwriter → Composition & Lyrics, Producer → Production &
 * Engineering). Only labels that exist in the live catalog are shown —
 * if none of these match it, the full catalog is offered instead.
 */
const CONTRIBUTOR_ROLE_PICKS = ["Composer", "Songwriter", "Producer", "Artist"];

export function pickContributorRoles(
  catalog: CatalogState<ContributorRole>
): CatalogState<ContributorRole> {
  const preferred = catalog.items.filter((r) =>
    CONTRIBUTOR_ROLE_PICKS.some(
      (p) => p.toLowerCase() === r.display_value.trim().toLowerCase()
    )
  );
  return preferred.length > 0 ? { ...catalog, items: preferred } : catalog;
}

/**
 * Publishing-split (track `writers`) roles come from the SAME live
 * GET /contributor-roles catalog, restricted to the "Composition & Lyrics"
 * category. Evidence from the sandbox's own 422s: Composer and Songwriter
 * (C&L category) passed writer-role validation while Producer (Production
 * & Engineering) and Artist (Performer) were rejected, and raw non-catalog
 * strings ("Music"/"Lyrics") were rejected outright. Nothing hardcoded —
 * if the category filter matches nothing, the full catalog is offered.
 */
export function pickWriterSplitRoles(
  catalog: CatalogState<ContributorRole>
): CatalogState<ContributorRole> {
  const composition = catalog.items.filter(
    (r) => (r.category ?? "").trim().toLowerCase() === "composition & lyrics"
  );
  return composition.length > 0 ? { ...catalog, items: composition } : catalog;
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

function RoleChip({
  role,
  on,
  onToggle,
}: {
  role: string;
  on: boolean;
  onToggle: (role: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(role)}
      className={cn(
        "cursor-pointer border px-3 py-1.5 text-xs font-medium",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary/50"
      )}
    >
      {role}
    </button>
  );
}

function RoleChips({
  roles,
  selected,
  onToggle,
}: {
  roles: CatalogState<ContributorRole>;
  selected: string[];
  onToggle: (role: string) => void;
}) {
  return (
    <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
      <CatalogStatus catalog={roles} emptyLabel="No roles available." />
      {roles.items.map((r) => (
        <RoleChip
          key={r.display_value}
          role={r.display_value}
          on={selected.includes(r.display_value)}
          onToggle={onToggle}
        />
      ))}
    </div>
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
  const contributorRolePicks = pickContributorRoles(contributorRoles);
  const writerSplitRoles = pickWriterSplitRoles(contributorRoles);

  return (
    <div className="space-y-5">
      {/* Contributors */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Contributors</p>
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
                contributors: [...prev.contributors, newContributor()],
              }))
            }
          >
            <Plus size={14} weight="bold" aria-hidden />
            Add
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
              <RoleChips
                roles={contributorRolePicks}
                selected={c.roles}
                onToggle={(role) =>
                  setState((prev) => ({
                    ...prev,
                    contributors: prev.contributors.map((x) => {
                      if (x.id !== c.id) return x;
                      const roles = x.roles.includes(role)
                        ? x.roles.filter((r) => r !== role)
                        : [...x.roles, role];
                      return { ...x, roles };
                    }),
                  }))
                }
              />
            </div>

            <Field
              id={`ai-${c.id}`}
              label="AI contribution"
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
                className="cursor-pointer text-xs font-medium text-destructive"
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

      {/* Publishing splits (LabelGrid track `writers`) */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Publishing splits</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Writer shares of the composition — optional, but totals must be
              100% if used.
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
            Add
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
              <p className="text-sm font-medium">Roles</p>
              <RoleChips
                roles={writerSplitRoles}
                selected={w.roles}
                onToggle={(role) =>
                  setState((prev) => ({
                    ...prev,
                    writerSplits: prev.writerSplits.map((x) => {
                      if (x.id !== w.id) return x;
                      const roles = x.roles.includes(role)
                        ? x.roles.filter((r) => r !== role)
                        : [...x.roles, role];
                      return { ...x, roles };
                    }),
                  }))
                }
              />
            </div>

            <button
              type="button"
              className="cursor-pointer text-xs font-medium text-destructive"
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

      {/* Publishers */}
      <Panel className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Publisher</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Who administers the publishing for this release.
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
                Add publisher
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
                  className="cursor-pointer pb-2 text-xs font-medium text-destructive"
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

      {/* Copyright */}
      <Panel className="space-y-5">
        <p className="text-sm font-semibold">Copyright</p>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </Panel>
    </div>
  );
}
