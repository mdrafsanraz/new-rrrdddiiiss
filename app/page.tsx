import Counter from "./components/counter";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-8 rounded-3xl bg-white px-8 py-16 text-center shadow-sm dark:bg-zinc-950 sm:px-12">
        <p className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium tracking-wide uppercase dark:border-white/15">
          Next.js Demo
        </p>
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
            new-rrrdddiiiss
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            A starter Next.js app with the App Router, TypeScript, and Tailwind
            CSS. Try the counter to confirm client interactivity is working.
          </p>
        </div>
        <Counter />
        <a
          className="text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Next.js docs
        </a>
      </main>
    </div>
  );
}
