import { cn } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/lib/labelgrid/state-labels";

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-semibold",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
