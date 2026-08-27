import {
  Broadcast,
  FileDashed,
  MagnifyingGlass,
  ShareNetwork,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Aggregate, read-only visualization of where the user's whole catalog
 * sits across the real submission pipeline. Counts are computed by the
 * caller (dashboard/page.tsx) from a single Release.groupBy — this
 * component only renders them. No new status logic: the RDISTRO-Review /
 * LabelGrid-Review split is a display-only regrouping of the same
 * ReleaseStatus enum values the rest of the app already uses (see
 * src/lib/releases/status.ts), it does not change what "in review" means
 * anywhere else in the product.
 */
export function ReleasePipeline({
  draft,
  rdistroReview,
  labelgridReview,
  delivering,
  live,
}: {
  draft: number;
  rdistroReview: number;
  labelgridReview: number;
  delivering: number;
  live: number;
}) {
  const stages = [
    { label: "Draft", count: draft, icon: <FileDashed size={18} weight="regular" aria-hidden /> },
    {
      label: "RDISTRO Review",
      count: rdistroReview,
      icon: <ShieldCheck size={18} weight="regular" aria-hidden />,
    },
    {
      label: "LabelGrid Review",
      count: labelgridReview,
      icon: <MagnifyingGlass size={18} weight="regular" aria-hidden />,
    },
    {
      label: "Delivering",
      count: delivering,
      icon: <ShareNetwork size={18} weight="regular" aria-hidden />,
    },
    { label: "Live", count: live, icon: <Broadcast size={18} weight="regular" aria-hidden /> },
  ];

  return (
    <div className="border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Release pipeline</h2>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-0">
        {stages.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center">
            <div
              style={{ animationDelay: `${i * 70}ms` }}
              className="flex items-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-500"
            >
              <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted text-muted-foreground">
                {s.icon}
              </span>
              <div>
                <p className="text-lg font-semibold tabular-nums leading-tight">
                  {s.count}
                </p>
                <p className="text-xs whitespace-nowrap text-muted-foreground">
                  {s.label}
                </p>
              </div>
            </div>
            {i < stages.length - 1 ? (
              <div
                className="mx-4 hidden h-px flex-1 bg-border sm:block"
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
