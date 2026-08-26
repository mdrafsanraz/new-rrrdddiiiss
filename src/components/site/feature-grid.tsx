import { FeatureArt } from "@/components/site/illustrations";
import { Reveal } from "@/components/site/reveal";
import { features } from "@/lib/site";
import { cn } from "@/lib/utils";

const accents = [
  "text-[#6366f1]",
  "text-[#a855f7]",
  "text-emerald-700",
  "text-[#ec4899]",
];

export function FeatureGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {features.map((feature, index) => (
        <Reveal key={feature.title} delay={index * 0.06} className="h-full">
          <article className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-background p-7 shadow-sm">
            <FeatureArt kind={feature.illustration} />
            <div>
              <p
                className={cn(
                  "mb-3 font-mono text-xs font-semibold select-none",
                  accents[index % accents.length]
                )}
                aria-hidden="true"
              >
                {`[0${index + 1}] ▚▚▚`}
              </p>
              <h3 className="text-xl font-bold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {feature.copy}
              </p>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
