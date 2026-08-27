"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";

/** Shared shell for the Delete/Takedown confirmation dialogs. */
export function ConfirmDialogShell({
  open,
  onOpenChange,
  children,
  widthClassName = "max-w-md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-5 shadow-lg outline-none",
            widthClassName
          )}
        >
          {children}
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function DialogRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
