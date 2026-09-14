export function SupportAttachments({ value }: { value: string }) {
  let files: Array<{ name: string; url: string; size: number }> = [];
  try { files = JSON.parse(value); } catch { return null; }
  if (!Array.isArray(files) || !files.length) return null;
  return <ul className="mt-3 space-y-2 border-t border-border pt-3">{files.filter(file => file.url?.startsWith("/api/media/")).map(file => <li key={file.url}><a className="text-sm font-medium underline" href={file.url} download>{file.name}</a><span className="ml-2 text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</span></li>)}</ul>;
}
