import { JevDemo } from "@/components/JevDemo";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Continuous verbatim compaction
        </h1>
        <p className="text-sm leading-6 text-dim">
          Jev scores each tool call and result. Stale ones drop or truncate.
          Everything kept stays the original text.
        </p>
        <p className="text-sm leading-6 text-dim">
          User and assistant text never become a summary. This page reimplements
          the{" "}
          <a
            href="https://github.com/tamaratran/fast-jev-compaction"
            className="text-cyan underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
          >
            fast-jev-compaction
          </a>{" "}
          pattern with canned decisions. No API key.
        </p>
      </header>
      <JevDemo />
    </main>
  );
}
