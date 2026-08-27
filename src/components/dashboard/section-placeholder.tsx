import { Clock } from "@phosphor-icons/react/dist/ssr";

export function SectionPlaceholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-8 border border-dashed border-border bg-card px-5 py-10 text-center">
        <div className="mx-auto flex size-11 items-center justify-center border border-border bg-muted text-muted-foreground">
          <Clock size={20} weight="regular" aria-hidden />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Coming online with sandbox distribution sync
        </p>
      </div>
    </div>
  );
}
