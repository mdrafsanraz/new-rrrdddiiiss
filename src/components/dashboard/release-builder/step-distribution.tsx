"use client";

/**
 * Step 2 — Distribution. Stores come from live GET /distro-outlets (outlet
 * `key` slugs are what's sent as distro_outlet_id) and territories from
 * live GET /territories — nothing hardcoded. Completing this step triggers
 * the FIRST LabelGrid release push (Steps 1+2 combined).
 */

import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { WizardState } from "@/lib/releases/wizard-types";
import {
  CatalogStatus,
  Panel,
  type CatalogState,
  type Outlet,
  type TerritoryOption,
} from "./shared";

export function StepDistribution({
  state,
  patch,
  outlets,
  territories,
}: {
  state: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  outlets: CatalogState<Outlet>;
  territories: CatalogState<TerritoryOption>;
}) {
  const manualStores = !state.allStores;
  const manualTerritories = !state.worldwide;

  return (
    <div className="space-y-5">
      <Panel className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={state.allStores}
            onChange={(e) => {
              const on = e.target.checked;
              patch({
                allStores: on,
                selectedOutletKeys: on ? [] : state.selectedOutletKeys,
              });
            }}
          />
          <span>
            <span className="block text-sm font-semibold">
              All available stores
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Distribute to every outlet currently supported.
            </span>
          </span>
        </label>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => patch({ allStores: !manualStores ? false : true })}
            className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
          >
            Select stores manually
            <CaretDown
              size={16}
              className={cn("transition-transform", manualStores && "rotate-180")}
            />
          </button>
          {manualStores ? (
            <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              <CatalogStatus
                catalog={outlets}
                emptyLabel="No stores available right now."
              />
              {outlets.items.map((o) => {
                const on = state.selectedOutletKeys.includes(o.key);
                return (
                  <label
                    key={o.key}
                    className="flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={on}
                      onChange={() =>
                        patch({
                          allStores: false,
                          selectedOutletKeys: on
                            ? state.selectedOutletKeys.filter(
                                (key) => key !== o.key
                              )
                            : [...state.selectedOutletKeys, o.key],
                        })
                      }
                    />
                    {o.name}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={state.worldwide}
            onChange={(e) => {
              const on = e.target.checked;
              patch({
                worldwide: on,
                territoryCodes: on ? [] : state.territoryCodes,
              });
            }}
          />
          <span>
            <span className="block text-sm font-semibold">Worldwide</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Default — release in all territories.
            </span>
          </span>
        </label>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() =>
              patch({ worldwide: !manualTerritories ? false : true })
            }
            className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
          >
            Select territories manually
            <CaretDown
              size={16}
              className={cn(
                "transition-transform",
                manualTerritories && "rotate-180"
              )}
            />
          </button>
          {manualTerritories ? (
            <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              <CatalogStatus
                catalog={territories}
                emptyLabel="No territories available right now."
              />
              {territories.items.map((t) => {
                const on = state.territoryCodes.includes(t.code);
                return (
                  <label
                    key={t.code}
                    className="flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={on}
                      onChange={() =>
                        patch({
                          worldwide: false,
                          territoryCodes: on
                            ? state.territoryCodes.filter((c) => c !== t.code)
                            : [...state.territoryCodes, t.code],
                        })
                      }
                    />
                    {t.name}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
