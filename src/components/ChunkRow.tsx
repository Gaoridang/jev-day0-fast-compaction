import { type Chunk } from "@/lib/jev";

type Badge = {
  tone: "keep" | "drop";
  tag: string;
  detail: string;
};

export function ChunkRow({
  chunk,
  typedChars,
  badge,
  collapsing,
  active,
}: {
  chunk: Chunk;
  typedChars: number | undefined;
  badge: Badge | null;
  collapsing: boolean;
  active: boolean;
}) {
  const shown =
    chunk.kind === "text" && typedChars !== undefined
      ? chunk.text.slice(0, typedChars)
      : chunk.text;
  const typing =
    chunk.kind === "text" &&
    typedChars !== undefined &&
    typedChars < chunk.text.length;
  const rowClass =
    badge === null
      ? chunk.kind === "text" && chunk.role === "user"
        ? "border-border"
        : "border-transparent"
      : badge.tone === "drop"
        ? "row-drop"
        : "row-keep";

  return (
    <div
      className={`chunk-slot ${collapsing ? "is-collapsed" : ""}`}
      data-chunk-id={chunk.id}
      data-chunk-kind={chunk.kind}
      data-chunk-text={chunk.text}
      data-focus={active ? "true" : undefined}
      data-collapsing={collapsing ? "true" : undefined}
    >
      <div className="chunk-slot-inner">
        <div
          className={`mb-1 flex flex-col items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 sm:flex-row ${rowClass} ${active ? "row-scan" : ""}`}
        >
          <div className="min-w-0 whitespace-pre-wrap break-words text-[13px] leading-6">
            <RowBody chunk={chunk} shown={shown} typing={typing} />
          </div>
          {badge ? (
            <div
              className={`shrink-0 text-[11px] leading-5 sm:pt-0.5 sm:text-right ${badge.tone === "drop" ? "text-red" : "text-green"}`}
            >
              <span className="rounded-sm bg-current/15 px-1.5 py-0.5 font-semibold tracking-wide">
                {badge.tag}
              </span>
              <span className="ml-2 opacity-75">{badge.detail}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RowBody({
  chunk,
  shown,
  typing,
}: {
  chunk: Chunk;
  shown: string;
  typing: boolean;
}) {
  if (chunk.kind === "text") {
    return (
      <span className="flex gap-2">
        <span className={chunk.role === "user" ? "text-dim" : "text-orange"}>
          {chunk.role === "user" ? ">" : "●"}
        </span>
        <span className="text-foreground">
          {shown}
          {typing ? <span className="caret" /> : null}
        </span>
      </span>
    );
  }
  if (chunk.kind === "toolHeader") {
    return (
      <span className="flex gap-2">
        <span className="text-green">●</span>
        <ToolLabel text={chunk.text} />
      </span>
    );
  }
  return (
    <span className="flex gap-2">
      <span className="text-dim">⎿</span>
      <span className="text-dim">{chunk.text}</span>
    </span>
  );
}

function ToolLabel({ text }: { text: string }) {
  const open = text.indexOf("(");
  if (open === -1) {
    return <span className="text-foreground">{text}</span>;
  }
  return (
    <span>
      <span className="font-semibold text-foreground">
        {text.slice(0, open)}
      </span>
      <span className="text-dim">{text.slice(open)}</span>
    </span>
  );
}
