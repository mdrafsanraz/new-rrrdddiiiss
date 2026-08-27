/**
 * Re-exports the shared Badge primitive — `Tone` here
 * (`@/lib/labelgrid/state-labels`) is the same 5-value set as
 * `ui/badge.tsx`'s `tone` variant, so this file exists only to keep the
 * existing `import { Badge } from "./badge"` call sites unchanged.
 */
export { Badge } from "@/components/ui/badge";
