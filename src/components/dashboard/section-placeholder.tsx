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
      <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        Coming online with sandbox distribution sync
      </div>
    </div>
  );
}
