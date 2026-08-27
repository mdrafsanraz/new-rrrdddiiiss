import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/site/reveal";
import { buttonVariants } from "@/components/ui/button-variants";
import { plans } from "@/lib/site";
import { cn } from "@/lib/utils";

const planAccents = [
  { chip: "bg-emerald-600/10", check: "text-emerald-700" },
  { chip: "bg-[#a855f7]/10", check: "text-[#a855f7]" },
  { chip: "bg-[#ec4899]/10", check: "text-[#ec4899]" },
];

export function PricingCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((plan, index) => {
        const highlighted = plan.id === "starter";
        const accent = planAccents[index % planAccents.length];
        return (
          <Reveal key={plan.id} delay={index * 0.08} className="h-full">
            <article
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-card p-8",
                highlighted
                  ? "border-primary shadow-xl shadow-primary/10"
                  : "border-border shadow-sm"
              )}
            >
              {highlighted ? (
                <span className="absolute -top-3.5 left-8 rounded-full bg-primary px-3.5 py-1 font-mono text-xs font-bold text-primary-foreground">
                  ★ most popular
                </span>
              ) : null}
              <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
              <p className="mt-4">
                <span className="text-5xl font-extrabold tracking-tight">
                  {plan.price}
                </span>
                <span className="ml-1.5 text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {plan.summary}
              </p>
              <ul className="mt-7 grid gap-3.5">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full",
                        accent.chip
                      )}
                    >
                      <Check
                        className={cn("size-3", accent.check)}
                        weight="bold"
                      />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${plan.id}`}
                className={cn(
                  buttonVariants({
                    variant: highlighted ? "default" : "outline",
                  }),
                  "mt-8 h-12 w-full"
                )}
              >
                {plan.paid ? `Get ${plan.name}` : "Start free"}
              </Link>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}
