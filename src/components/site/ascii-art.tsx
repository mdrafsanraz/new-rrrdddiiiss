"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const LEVELS = "▁▂▃▄▅▆▇█";

/** Animated ASCII equalizer, e.g. ▄▂▆█▃▅ ticking like a level meter. */
export function AsciiEqualizer({
  bars = 12,
  interval = 130,
  className,
}: {
  bars?: number;
  interval?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Deterministic initial frame so server and client render the same string.
  const [frame, setFrame] = useState(() =>
    Array.from({ length: bars }, (_, i) => (i * 3 + 2) % LEVELS.length)
  );

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setFrame((prev) =>
        prev.map((level) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.min(LEVELS.length - 1, Math.max(0, level + delta));
        })
      );
    }, interval);
    return () => clearInterval(id);
  }, [interval, reduceMotion]);

  return (
    <span
      className={cn("font-mono leading-none select-none", className)}
      aria-hidden="true"
    >
      {frame.map((level) => LEVELS[level]).join("")}
    </span>
  );
}

const RDISTRO_ASCII = String.raw`██████╗ ██████╗ ██╗███████╗████████╗██████╗  ██████╗
██╔══██╗██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗
██████╔╝██║  ██║██║███████╗   ██║   ██████╔╝██║   ██║
██╔══██╗██║  ██║██║╚════██║   ██║   ██╔══██╗██║   ██║
██║  ██║██████╔╝██║███████║   ██║   ██║  ██║╚██████╔╝
╚═╝  ╚═╝╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝`;

/** Figlet-style RDISTRO wordmark in a solid color. */
export function AsciiLogo({ className }: { className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-hidden font-mono leading-[1.2] whitespace-pre select-none",
        className
      )}
      aria-hidden="true"
    >
      {RDISTRO_ASCII}
    </pre>
  );
}

/** Terminal window: figlet wordmark plus a release push log. */
export function AsciiTerminal({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/15 bg-black/45 font-mono shadow-2xl",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px] text-white/50">
          rdistro — release terminal
        </span>
      </div>
      <div className="grid gap-1.5 px-4 py-4 text-xs text-white/85 sm:px-5">
        <p>
          <span className="text-emerald-400">$</span> figlet rdistro
        </p>
        <AsciiLogo className="my-2 text-[6px] text-white sm:text-[9px] md:text-[11px]" />
        <p>
          <span className="text-emerald-400">$</span> rdistro push
          &quot;midnight-run&quot;
        </p>
        <p className="text-white/55">
          ▸ validating artwork ........ <span className="text-emerald-400">ok</span>
        </p>
        <p className="text-white/55">
          ▸ encoding audio ............ <span className="text-emerald-400">ok</span>
        </p>
        <p className="text-white/55">
          ▸ delivering to 150+ stores . <span className="text-emerald-400">ok</span>
        </p>
        <p className="text-emerald-400">
          ✓ live in 24-48h <span className="rdistro-caret">▌</span>
        </p>
      </div>
    </div>
  );
}

const CASSETTE_ASCII = String.raw`╭────────────────────────────╮
│ ┌────────────────────────┐ │
│ │ RDISTRO · MIXTAPE 001  │ │
│ └────────────────────────┘ │
│    (●)  ──────────  (●)    │
│  ▂▄▆█▆▄▂▁▂▄▆█▆▄▂▁▂▄▆█▆▄▂▁  │
╰────┬──────────────────┬────╯
     └──────────────────┘`;

/** ASCII cassette tape illustration. */
export function AsciiCassette({ className }: { className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-hidden font-mono leading-[1.3] whitespace-pre select-none",
        className
      )}
      aria-hidden="true"
    >
      {CASSETTE_ASCII}
    </pre>
  );
}
