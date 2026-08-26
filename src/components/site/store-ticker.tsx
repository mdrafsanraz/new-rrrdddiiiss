import { stores } from "@/lib/site";

export function StoreTicker() {
  const loop = [...stores, ...stores];

  return (
    <div className="overflow-hidden border-y border-border bg-card">
      <div className="rdistro-marquee flex w-max">
        {loop.map((store, index) => (
          <span
            key={`${store}-${index}`}
            className="flex items-center gap-10 px-10 py-5 text-sm font-semibold tracking-tight text-muted-foreground"
          >
            {store}
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
          </span>
        ))}
      </div>
    </div>
  );
}
