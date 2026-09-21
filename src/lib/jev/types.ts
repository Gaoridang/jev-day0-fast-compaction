export const KEEP_THRESHOLD = 0.5;

export type ToolCallId = "t1" | "t2" | "t3" | "t4" | "t5";

export type CallScore = {
  keepCall: number;
  keepResult: number;
};

export type TextChunk = {
  kind: "text";
  id: number;
  role: "user" | "assistant";
  text: string;
};

export type ScoredToolChunk = {
  kind: "toolHeader" | "toolLine";
  id: number;
  callId: ToolCallId;
  text: string;
  pinned: false;
  score: CallScore;
};

export type PinnedToolChunk = {
  kind: "toolHeader" | "toolLine";
  id: number;
  callId: ToolCallId;
  text: string;
  pinned: true;
};

export type Chunk = TextChunk | ScoredToolChunk | PinnedToolChunk;

export type Verdict =
  | { kind: "keep"; reason: "text" | "pinned" | "kept" | "call_kept_result_note" }
  | { kind: "drop"; reason: "result_dropped" | "call_dropped" };

export type Playback =
  | { phase: "idle" }
  | { phase: "typing"; visibleCount: number; typedChars: number }
  | { phase: "waiting" }
  | { phase: "scanning"; revealedThroughId: number }
  | { phase: "collapsing"; removedIds: readonly number[] }
  | { phase: "done"; removedIds: readonly number[] };
