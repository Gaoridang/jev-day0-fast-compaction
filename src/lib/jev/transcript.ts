import type { CallScore, Chunk, ToolCallId } from "./types";

let nextId = 0;

function text(role: "user" | "assistant", value: string): Chunk {
  nextId += 1;
  return { kind: "text", id: nextId, role, text: value };
}

function tool(
  callId: ToolCallId,
  header: string,
  lines: readonly string[],
  score: CallScore,
): Chunk[] {
  const chunks: Chunk[] = [];
  nextId += 1;
  chunks.push({
    kind: "toolHeader",
    id: nextId,
    callId,
    text: header,
    pinned: false,
    score,
  });
  for (const line of lines) {
    nextId += 1;
    chunks.push({
      kind: "toolLine",
      id: nextId,
      callId,
      text: line,
      pinned: false,
      score,
    });
  }
  return chunks;
}

function pinnedTool(
  callId: ToolCallId,
  header: string,
  lines: readonly string[],
): Chunk[] {
  const chunks: Chunk[] = [];
  nextId += 1;
  chunks.push({
    kind: "toolHeader",
    id: nextId,
    callId,
    text: header,
    pinned: true,
  });
  for (const line of lines) {
    nextId += 1;
    chunks.push({
      kind: "toolLine",
      id: nextId,
      callId,
      text: line,
      pinned: true,
    });
  }
  return chunks;
}

export const transcript: Chunk[] = [
  text(
    "user",
    "Fix the checkout parser so parseLineItems handles quantities over 999 without truncating. Keep the public API unchanged.",
  ),
  text("assistant", "I'll read the parser and its tests first."),
  ...tool(
    "t1",
    "Read(src/checkout/parser.ts)",
    [
      "Read 212 lines",
      "41  const qty = Number(raw.slice(0, 3));",
      "42  if (Number.isNaN(qty)) throw new ParseError(raw);",
      "43  return { sku, qty, price };",
    ],
    { keepCall: 0.18, keepResult: 0.07 },
  ),
  ...tool(
    "t2",
    "Bash(npm test -- parser)",
    [
      "FAIL tests/parser.test.ts > parses quantities over 999",
      "expected 1200, received 120",
      "Tests: 1 failed, 23 passed",
      "Duration 1.42s",
    ],
    { keepCall: 0.64, keepResult: 0.21 },
  ),
  text(
    "assistant",
    "slice(0, 3) truncates to three digits. I'll capture the full quantity with a regex instead.",
  ),
  text("assistant", "Let me check where parseLineItems is called."),
  ...tool(
    "t3",
    "Grep(parseLineItems)",
    [
      "src/checkout/index.ts:14",
      "src/api/orders.ts:88",
      "tests/parser.test.ts:5",
    ],
    { keepCall: 0.22, keepResult: 0.09 },
  ),
  ...tool(
    "t4",
    "Edit(src/checkout/parser.ts)",
    ["Updated 1 file (+3 -1)"],
    { keepCall: 0.71, keepResult: 0.66 },
  ),
  text(
    "assistant",
    "Still to do: make sure the raw line appears in ParseError messages.",
  ),
  ...pinnedTool("t5", "Bash(npm test)", ["Tests: 24 passed"]),
  text(
    "assistant",
    "All 24 tests pass and the public API is unchanged.",
  ),
  text("user", "Great. Now handle the ParseError message."),
];
