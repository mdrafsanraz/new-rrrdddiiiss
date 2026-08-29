export default function Loading() {
  return <div className="mx-auto max-w-[1400px] animate-pulse space-y-6"><div className="h-28 rounded-xl bg-muted" /><div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-xl bg-muted" />)}</div><div className="h-96 rounded-xl bg-muted" /></div>;
}
