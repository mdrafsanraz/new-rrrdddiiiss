"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";

export type SearchableOption = { value: string; label: string; keywords?: string };

export function SearchableSelect({ id, label, value, options, onChange, placeholder = "Choose an option", searchPlaceholder = "Search…", helper, required = false, disabled = false, fallbackLabel }: {
  id: string; label: string; value: string; options: SearchableOption[];
  onChange: (value: string) => void; placeholder?: string; searchPlaceholder?: string;
  helper?: string; required?: boolean; disabled?: boolean; fallbackLabel?: string;
}) {
  const selected = options.find((option) => option.value === value) ?? (value ? { value, label: fallbackLabel || value } : null);
  return <div className="grid min-w-0 gap-2">
    <Combobox.Root<SearchableOption>
      items={options}
      value={selected}
      name={id}
      required={required}
      disabled={disabled}
      onValueChange={(option) => onChange(option?.value ?? "")}
      isItemEqualToValue={(item, current) => item.value === current.value}
      filter={(item, query) => `${item.label} ${item.keywords ?? item.value}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())}
    >
      <Combobox.Label className="text-sm font-medium">{label}{required ? <span className="ml-1 text-destructive" aria-hidden>*</span> : null}</Combobox.Label>
      <Combobox.Trigger id={id} aria-describedby={helper ? `${id}-helper` : undefined} className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 border border-border bg-background px-3.5 py-3 text-left text-sm shadow-sm outline-none hover:border-primary/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground data-placeholder:text-muted-foreground">
        <span className="min-w-0 truncate"><Combobox.Value placeholder={placeholder} /></span>
        <CaretDown size={15} aria-hidden className="shrink-0 text-muted-foreground" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={6} className="z-50 outline-none">
          <Combobox.Popup aria-label={label} className="flex max-h-[var(--available-height)] flex-col w-[var(--anchor-width)] max-w-[calc(100vw_-_2rem)] overflow-hidden border border-border bg-popover text-popover-foreground shadow-lg outline-none">
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
              <MagnifyingGlass size={16} aria-hidden className="shrink-0 text-muted-foreground" />
              <Combobox.Input aria-label={`Search ${label.toLowerCase()}`} placeholder={searchPlaceholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <Combobox.Empty><div className="px-3 py-6 text-center text-sm text-muted-foreground">No matching options.</div></Combobox.Empty>
            <Combobox.List className="min-h-0 max-h-64 overflow-y-auto overscroll-contain p-1 outline-none">
              {(option: SearchableOption) => <Combobox.Item key={option.value} value={option} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm outline-none data-highlighted:bg-primary/10 data-highlighted:text-primary">
                <span className="min-w-0 break-words">{option.label}</span>
                <span className="size-4 shrink-0"><Combobox.ItemIndicator><Check size={16} weight="bold" aria-hidden /></Combobox.ItemIndicator></span>
              </Combobox.Item>}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
    {helper ? <p id={`${id}-helper`} className="text-xs text-muted-foreground">{helper}</p> : null}
  </div>;
}
