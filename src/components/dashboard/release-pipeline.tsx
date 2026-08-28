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
      label: "Distribution Review",
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
    <section className="overflow-hidden rounded-[24px] border border-border/80 bg-card px-5 py-6 shadow-[0_16px_50px_oklch(0.3_0.02_250/0.07)] sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Release pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">A live view of your catalog from draft to stores.</p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">{stages.reduce((total, stage) => total + stage.count, 0)} active positions</p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-5">
        {stages.map((s, i) => (
          <div key={s.label} className="relative">
            <div
              style={{ animationDelay: `${i * 70}ms` }}
              className="relative z-[1] flex h-full items-center gap-3 rounded-2xl bg-muted/65 px-3 py-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-500"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-[#5966df] shadow-sm">
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
              <div className="absolute left-[calc(100%-0.25rem)] top-1/2 hidden h-px w-5 bg-border sm:block" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
