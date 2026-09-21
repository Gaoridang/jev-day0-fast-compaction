import { KEEP_THRESHOLD, type Chunk, type Verdict } from "./types";

export function decideChunk(
  chunk: Chunk,
  keepThreshold: number = KEEP_THRESHOLD,
): Verdict {
  if (chunk.kind === "text") {
    return { kind: "keep", reason: "text" };
  }
  if (chunk.pinned) {
    return { kind: "keep", reason: "pinned" };
  }
  if (chunk.score.keepResult >= keepThreshold) {
    return { kind: "keep", reason: "kept" };
  }
  if (chunk.score.keepCall >= keepThreshold) {
    return chunk.kind === "toolHeader"
      ? { kind: "keep", reason: "call_kept_result_note" }
      : { kind: "drop", reason: "result_dropped" };
  }
  return { kind: "drop", reason: "call_dropped" };
}

export function isDropped(chunk: Chunk): boolean {
  return decideChunk(chunk).kind === "drop";
}

export function keptChunks(chunks: readonly Chunk[]): Chunk[] {
  return chunks.filter((chunk) => !isDropped(chunk));
}

export function candidateCallIds(chunks: readonly Chunk[]): string[] {
  const ids: string[] = [];
  for (const chunk of chunks) {
    if (chunk.kind === "toolHeader" && !chunk.pinned && !ids.includes(chunk.callId)) {
      ids.push(chunk.callId);
    }
  }
  return ids;
}

export function verdictBadge(chunk: Chunk): {
  tone: "keep" | "drop";
  tag: string;
  detail: string;
} {
  const verdict = decideChunk(chunk);
  if (verdict.kind === "keep" && verdict.reason === "text") {
    return { tone: "keep", tag: "text", detail: "verbatim" };
  }
  if (verdict.kind === "keep" && verdict.reason === "pinned") {
    return { tone: "keep", tag: "pinned", detail: "newest messages stay" };
  }
  if (chunk.kind === "text" || chunk.pinned) {
    return { tone: "keep", tag: "KEEP", detail: "verbatim" };
  }
  const nums = `call ${chunk.score.keepCall.toFixed(2)} · result ${chunk.score.keepResult.toFixed(2)}`;
  if (verdict.kind === "keep" && verdict.reason === "kept") {
    return { tone: "keep", tag: "KEEP", detail: nums };
  }
  if (verdict.kind === "keep" && verdict.reason === "call_kept_result_note") {
    return { tone: "keep", tag: "KEEP", detail: `${nums} → note` };
  }
  if (verdict.kind === "drop" && verdict.reason === "result_dropped") {
    return { tone: "drop", tag: "DROP", detail: `result ${chunk.score.keepResult.toFixed(2)}` };
  }
  return { tone: "drop", tag: "DROP", detail: nums };
}

export function compactStats(chunks: readonly Chunk[]) {
  const kept = keptChunks(chunks);
  const headers = chunks.filter((chunk) => chunk.kind === "toolHeader");
  let callsDropped = 0;
  let resultsDropped = 0;
  let keptCalls = 0;
  let pinned = 0;
  for (const header of headers) {
    const verdict = decideChunk(header);
    if (verdict.kind === "keep" && verdict.reason === "pinned") pinned += 1;
    else if (verdict.kind === "keep" && verdict.reason === "call_kept_result_note") {
      resultsDropped += 1;
    } else if (verdict.kind === "keep") keptCalls += 1;
    else if (verdict.reason === "call_dropped") callsDropped += 1;
  }
  const charsBefore = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
  const charsAfter = kept.reduce((sum, chunk) => sum + chunk.text.length, 0);
  return {
    linesBefore: chunks.length,
    linesAfter: kept.length,
    charsBefore,
    charsAfter,
    callsDropped,
    resultsDropped,
    keptCalls,
    pinned,
  };
}
