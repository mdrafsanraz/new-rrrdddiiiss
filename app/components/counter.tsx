"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setCount((value) => value - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-lg transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
        aria-label="Decrease count"
      >
        −
      </button>
      <span className="min-w-8 text-center text-xl font-semibold tabular-nums">
        {count}
      </span>
      <button
        type="button"
        onClick={() => setCount((value) => value + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-lg text-background transition-opacity hover:opacity-80"
        aria-label="Increase count"
      >
        +
      </button>
    </div>
  );
}
