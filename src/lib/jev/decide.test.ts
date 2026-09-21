import assert from "node:assert/strict";
import { test } from "node:test";
import {
  candidateCallIds,
  compactStats,
  decideChunk,
  keptChunks,
} from "./decide";
import { transcript } from "./transcript";
import type { Chunk } from "./types";

const scoredHeader = (
  keepCall: number,
  keepResult: number,
): Chunk => ({
  kind: "toolHeader",
  id: 1,
  callId: "t1",
  text: "Read(src/a.ts)",
  pinned: false,
  score: { keepCall, keepResult },
});

const scoredLine = (
  keepCall: number,
  keepResult: number,
): Chunk => ({
  kind: "toolLine",
  id: 2,
  callId: "t1",
  text: "file body",
  pinned: false,
  score: { keepCall, keepResult },
});

test("user and assistant text stay verbatim", () => {
  assert.deepEqual(
    decideChunk({ kind: "text", id: 1, role: "user", text: "Fix the parser." }),
    { kind: "keep", reason: "text" },
  );
  assert.deepEqual(
    decideChunk({
      kind: "text",
      id: 2,
      role: "assistant",
      text: "I'll read the tests first.",
    }),
    { kind: "keep", reason: "text" },
  );
});

test("pinned tool calls stay even when scores are low", () => {
  assert.deepEqual(
    decideChunk({
      kind: "toolHeader",
      id: 1,
      callId: "t5",
      text: "Bash(npm test)",
      pinned: true,
    }),
    { kind: "keep", reason: "pinned" },
  );
});

test("keepResult at or above 0.5 keeps the call and the result", () => {
  assert.deepEqual(decideChunk(scoredHeader(0.71, 0.66)), {
    kind: "keep",
    reason: "kept",
  });
  assert.deepEqual(decideChunk(scoredLine(0.71, 0.66)), {
    kind: "keep",
    reason: "kept",
  });
});

test("keepCall at or above 0.5 with a low result keeps the header and drops result lines", () => {
  assert.deepEqual(decideChunk(scoredHeader(0.64, 0.21)), {
    kind: "keep",
    reason: "call_kept_result_note",
  });
  assert.deepEqual(decideChunk(scoredLine(0.64, 0.21)), {
    kind: "drop",
    reason: "result_dropped",
  });
});

test("both scores below 0.5 drop the call and its result", () => {
  assert.deepEqual(decideChunk(scoredHeader(0.18, 0.07)), {
    kind: "drop",
    reason: "call_dropped",
  });
  assert.deepEqual(decideChunk(scoredLine(0.18, 0.07)), {
    kind: "drop",
    reason: "call_dropped",
  });
});

test("canned checkout transcript collapses stale tools and keeps every text line", () => {
  const kept = keptChunks(transcript);
  assert.deepEqual(
    kept.map((chunk) => chunk.text),
    [
      "Fix the checkout parser so parseLineItems handles quantities over 999 without truncating. Keep the public API unchanged.",
      "I'll read the parser and its tests first.",
      "Bash(npm test -- parser)",
      "slice(0, 3) truncates to three digits. I'll capture the full quantity with a regex instead.",
      "Let me check where parseLineItems is called.",
      "Edit(src/checkout/parser.ts)",
      "Updated 1 file (+3 -1)",
      "Still to do: make sure the raw line appears in ParseError messages.",
      "Bash(npm test)",
      "Tests: 24 passed",
      "All 24 tests pass and the public API is unchanged.",
      "Great. Now handle the ParseError message.",
    ],
  );
  assert.deepEqual(candidateCallIds(transcript), ["t1", "t2", "t3", "t4"]);
  assert.deepEqual(compactStats(transcript), {
    linesBefore: 25,
    linesAfter: 12,
    charsBefore: 931,
    charsAfter: 558,
    callsDropped: 2,
    resultsDropped: 1,
    keptCalls: 1,
    pinned: 1,
  });
});
