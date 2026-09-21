"use client";

import { useEffect, useRef, useState } from "react";
import {
  compactStats,
  isDropped,
  keptChunks,
  transcript,
  verdictBadge,
  type Chunk,
  type Playback,
} from "@/lib/jev";
import { ChunkRow } from "./ChunkRow";

const IDLE_MS = 700;
const USER_CHAR_MS = 12;
const ASSISTANT_CHAR_MS = 8;
const TEXT_HOLD_MS = 160;
const TOOL_HEADER_MS = 180;
const TOOL_LINE_MS = 70;
const WAIT_MS = 1200;
const SCAN_MS = 90;
const COLLAPSE_MS = 440;

const droppedChunkIds: readonly number[] = transcript
  .filter(isDropped)
  .map((chunk) => chunk.id);

function delayFor(playback: Playback): number {
  switch (playback.phase) {
    case "idle":
      return IDLE_MS;
    case "typing": {
      const current = transcript[playback.visibleCount - 1];
      if (current === undefined) {
        return 0;
      }
      return typingDelay(current, playback.typedChars);
    }
    case "waiting":
      return WAIT_MS;
    case "scanning":
      return SCAN_MS;
    case "collapsing":
      return COLLAPSE_MS;
    case "done":
      return 0;
  }
}

function typingDelay(chunk: Chunk, typedChars: number): number {
  if (chunk.kind === "text") {
    if (typedChars < chunk.text.length) {
      return chunk.role === "user" ? USER_CHAR_MS : ASSISTANT_CHAR_MS;
    }
    return TEXT_HOLD_MS;
  }
  return chunk.kind === "toolHeader" ? TOOL_HEADER_MS : TOOL_LINE_MS;
}

function nextRevealedId(revealedThroughId: number): number | undefined {
  for (const chunk of transcript) {
    if (chunk.id > revealedThroughId) {
      return chunk.id;
    }
  }
  return undefined;
}

function advancePlayback(playback: Playback): Playback {
  switch (playback.phase) {
    case "idle":
      return { phase: "typing", visibleCount: 1, typedChars: 0 };
    case "typing":
      return advanceTyping(playback.visibleCount, playback.typedChars);
    case "waiting":
      return { phase: "scanning", revealedThroughId: 0 };
    case "scanning": {
      const nextId = nextRevealedId(playback.revealedThroughId);
      if (nextId === undefined) {
        return { phase: "collapsing", removedIds: [] };
      }
      return { phase: "scanning", revealedThroughId: nextId };
    }
    case "collapsing": {
      const nextId = droppedChunkIds.find(
        (id) => !playback.removedIds.includes(id),
      );
      if (nextId === undefined) {
        return { phase: "done", removedIds: droppedChunkIds };
      }
      return {
        phase: "collapsing",
        removedIds: [...playback.removedIds, nextId],
      };
    }
    case "done":
      return playback;
  }
}

function advanceTyping(visibleCount: number, typedChars: number): Playback {
  const current = transcript[visibleCount - 1];
  if (current === undefined) {
    return { phase: "waiting" };
  }
  if (current.kind === "text" && typedChars < current.text.length) {
    return { phase: "typing", visibleCount, typedChars: typedChars + 1 };
  }
  if (visibleCount < transcript.length) {
    return { phase: "typing", visibleCount: visibleCount + 1, typedChars: 0 };
  }
  return { phase: "waiting" };
}

function rowsFor(playback: Playback): readonly Chunk[] {
  switch (playback.phase) {
    case "idle":
      return [];
    case "typing":
      return transcript.slice(0, playback.visibleCount);
    case "waiting":
    case "scanning":
    case "collapsing":
      return transcript;
    case "done":
      return keptChunks(transcript);
  }
}

function badgeFor(chunk: Chunk, playback: Playback) {
  switch (playback.phase) {
    case "idle":
    case "typing":
    case "waiting":
      return null;
    case "scanning":
      return chunk.id <= playback.revealedThroughId
        ? verdictBadge(chunk)
        : null;
    case "collapsing":
    case "done":
      return verdictBadge(chunk);
  }
}

function typedCharsFor(chunk: Chunk, playback: Playback): number | undefined {
  if (playback.phase !== "typing" || chunk.kind !== "text") {
    return undefined;
  }
  const current = transcript[playback.visibleCount - 1];
  if (current === undefined || current.id !== chunk.id) {
    return undefined;
  }
  return playback.typedChars;
}

function isCollapsed(chunk: Chunk, playback: Playback): boolean {
  return (
    (playback.phase === "collapsing" || playback.phase === "done") &&
    playback.removedIds.includes(chunk.id)
  );
}

function isActive(chunk: Chunk, playback: Playback): boolean {
  if (playback.phase === "typing") {
    const current = transcript[playback.visibleCount - 1];
    return current !== undefined && current.id === chunk.id;
  }
  if (playback.phase === "scanning") {
    if (playback.revealedThroughId === 0) {
      const first = transcript[0];
      return first !== undefined && first.id === chunk.id;
    }
    return chunk.id === playback.revealedThroughId;
  }
  if (playback.phase === "collapsing") {
    const last = playback.removedIds[playback.removedIds.length - 1];
    if (last !== undefined) {
      return last === chunk.id;
    }
    const firstDropped = droppedChunkIds[0];
    return firstDropped !== undefined && firstDropped === chunk.id;
  }
  return false;
}

function contextRatio(playback: Playback): number {
  const stats = compactStats(transcript);
  const after = stats.linesAfter / stats.linesBefore;
  switch (playback.phase) {
    case "idle":
      return 0.08;
    case "typing":
      return 0.08 + 0.7 * (playback.visibleCount / transcript.length);
    case "waiting":
    case "scanning":
      return 0.78;
    case "collapsing": {
      const total = droppedChunkIds.length;
      const gone = playback.removedIds.length;
      const t = total === 0 ? 1 : gone / total;
      return 0.78 + (after - 0.78) * t;
    }
    case "done":
      return after;
  }
}

function statusText(playback: Playback): string {
  switch (playback.phase) {
    case "idle":
      return "Ready.";
    case "typing":
      return "Filling context.";
    case "waiting":
      return "Context is full, running fast-jev-compaction.";
    case "scanning":
      return "Scoring each tool call and result.";
    case "collapsing":
      return "Dropping stale calls and truncating results.";
    case "done": {
      const stats = compactStats(transcript);
      return `${stats.linesBefore} lines → ${stats.linesAfter} · ${stats.charsBefore} → ${stats.charsAfter} chars · ${stats.callsDropped} calls dropped · ${stats.resultsDropped} results truncated · text kept verbatim`;
    }
  }
}

export function JevDemo() {
  const [playback, setPlayback] = useState<Playback>({ phase: "idle" });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playback.phase === "done") {
      return;
    }
    const timer = window.setTimeout(() => {
      setPlayback(advancePlayback);
    }, delayFor(playback));
    return () => window.clearTimeout(timer);
  }, [playback]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      event.preventDefault();
      setPlayback({ phase: "idle" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (root === null) {
      return;
    }
    const target = root.querySelector("[data-focus='true']");
    if (target instanceof HTMLElement) {
      target.scrollIntoView({
        block:
          playback.phase === "scanning" || playback.phase === "collapsing"
            ? "center"
            : "nearest",
        behavior: "smooth",
      });
    }
  }, [playback]);

  const rows = rowsFor(playback);
  const percent = Math.max(4, Math.round(contextRatio(playback) * 100));
  const meterClass =
    playback.phase === "done"
      ? "bg-green"
      : percent >= 60
        ? "bg-amber"
        : "bg-dim";
  const busy =
    playback.phase === "waiting" ||
    playback.phase === "scanning" ||
    playback.phase === "collapsing";
  const statusColor =
    playback.phase === "waiting"
      ? "text-amber"
      : playback.phase === "scanning" || playback.phase === "collapsing"
        ? "text-cyan"
        : playback.phase === "done"
          ? "text-green"
          : "text-dim";

  return (
    <section
      className="overflow-hidden rounded-md border border-border bg-panel"
      data-phase={playback.phase}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-[11px] text-dim">
        <span>
          fast-jev-compaction · canned scores · {playback.phase}
        </span>
        <button
          type="button"
          onClick={() => setPlayback({ phase: "idle" })}
          className="rounded-sm border border-border px-2 py-0.5 text-cyan hover:border-cyan"
        >
          Replay
        </button>
      </div>
      <div
        ref={scrollerRef}
        className="h-[min(70vh,40rem)] overflow-y-auto px-3 py-3"
      >
        {rows.map((chunk) => (
          <ChunkRow
            key={chunk.id}
            chunk={chunk}
            typedChars={typedCharsFor(chunk, playback)}
            badge={badgeFor(chunk, playback)}
            collapsing={isCollapsed(chunk, playback)}
            active={isActive(chunk, playback)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        <div
          className={`flex min-h-8 items-center gap-2 text-xs leading-5 ${statusColor}`}
          aria-live="polite"
        >
          {busy ? <span className="status-spin" aria-hidden="true" /> : null}
          <span>{statusText(playback)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-dim">
          <span>&gt;</span>
          {playback.phase === "done" ? null : <span className="caret" />}
          <span className="ml-auto text-[11px]">space to restart</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-dim">
          <span>Context</span>
          <div
            className="h-2 w-40 overflow-hidden rounded-sm bg-border"
            role="meter"
            aria-label="Context"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={`h-full ${meterClass} transition-[width] duration-300`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className={percent >= 60 && playback.phase !== "done" ? "text-amber" : playback.phase === "done" ? "text-green" : "text-dim"}>
            {percent}%
          </span>
        </div>
      </div>
    </section>
  );
}
