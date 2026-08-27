"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper over Base UI's Tooltip — for icon-only buttons/links that
 * need a visible label on hover/focus. Same enter/exit transition
 * convention as ConfirmDialogShell (data-starting-style/data-ending-style).
 */
function Tooltip({
  children,
  content,
  side = "top",
}: {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  if (!content) return children;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={6}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md",
              "transition-[opacity,transform] duration-150 ease-[var(--ease-rdistro)]",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip };
