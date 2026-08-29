export default function Loading() {
  return <div className="mx-auto max-w-[1400px] animate-pulse space-y-6"><div className="h-28 bg-muted" /><div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 bg-muted" />)}</div><div className="h-28 bg-muted" /><div className="h-[460px] bg-muted" /></div>;
}
