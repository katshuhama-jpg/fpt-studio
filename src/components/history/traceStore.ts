// Derives a LangSmith-style "Turns" trace from a stored ConversationRecord, for the
// Insights > History > tracing prototype. Nothing here is a real execution log — timings,
// token counts, and cost are deterministically mocked from the conversation id so the same
// conversation always renders the same numbers across reloads, same spirit as pseudoUlid
// in historyStore.ts. Only messages that were seeded with a `toolCall` (see historyStore.ts)
// render a tool-call step; every other turn is a plain Input → Output pair.
import type { ConversationMessage, ConversationRecord } from "./historyStore";

export interface TraceTurn {
  index: number;
  customer: ConversationMessage | null;
  agentMessages: ConversationMessage[];
  startedAt: number;
  endedAt: number;
  /** Mirrors the real tracing spec's `run` root span output. A turn ending on an unrecovered
   * failed step is "failed"; a step that failed and then succeeded on retry (e.g. CV-1035)
   * still reads as "completed" — the turn came through fine even though one step stumbled on
   * the first try. "input_required" is never computed from the turn's own steps — it's applied
   * as a post-process override, below, onto a conversation's LAST turn only, when
   * ConversationRecord.awaitingHuman is set (the run genuinely hasn't resumed yet). */
  outcome: "completed" | "failed" | "input_required";
  latencyMs: number;
  /** Time to the first streamed token — same "First Token" metric LangSmith's Traces (runs)
   * list shows per call, mocked here as a seeded fraction of the turn's own latency. */
  firstTokenMs: number;
  tokensIn: number;
  tokensCacheRead: number;
  tokensOut: number;
  tokensReasoning: number;
  costIn: number;
  costCacheRead: number;
  costOut: number;
  costReasoning: number;
}

export interface ConversationTrace {
  conversationId: string;
  model: string;
  turns: TraceTurn[];
  startedAt: number;
  endedAt: number;
  /** Carries the conversation-level error straight through from ConversationRecord (see its
   * own doc comment in historyStore.ts) so the Trace page can surface the same "Last Error"
   * the History table shows for this row — before this field existed, a conversation flagged
   * as errored in the list had nothing to show for it on its own trace page. */
  error?: string;
  totals: {
    tokensIn: number;
    tokensCacheRead: number;
    tokensOut: number;
    tokensReasoning: number;
    costIn: number;
    costCacheRead: number;
    costOut: number;
    costReasoning: number;
    p50LatencyMs: number;
    p99LatencyMs: number;
    firstTokenMs: number;
  };
}

const MODEL_BY_AGENT: Record<string, string> = { cskh: "DeepSeek V4 Flash" };
const DEFAULT_MODEL = "GPT-4o mini";

// USD per single token — small, plausible per-call figures (same order of magnitude as
// current-generation hosted models), not tied to any specific vendor's real price sheet.
// cacheRead is cheaper than a fresh input token, same idea as prompt-caching discounts on
// real hosted models — most turns reuse the agent's Instructions + Knowledge context from
// the previous turn instead of resending it at full price.
const PRICE_PER_TOKEN = { input: 0.00000025, cacheRead: 0.00000005, output: 0.000001, reasoning: 0.0000015 };

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return h || 1;
}

function seededInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
}

export interface MessageAuditFlowStep {
  label: string;
}

export interface MessageAudit {
  status: "Success";
  latencyMs: number;
  tokens: number;
  messageId: string;
  conversationId: string;
  startedAt: number;
  endedAt: number;
  flow: MessageAuditFlowStep[];
}

/**
 * Per-message "Agent audit" info, matching the modal already live on the real
 * agents.fpt.ai chat-history screen (Status/Latency/Tokens + Message ID/Conversation ID
 * + Start/End time + a "Flow" list of the steps that produced this message). Only agent
 * messages are auditable, same as the real product — customer messages have nothing to
 * show here. Numbers are deterministically mocked from the message id, same spirit as
 * buildTrace() above.
 */
export function buildMessageAudit(record: ConversationRecord, message: ConversationMessage): MessageAudit {
  const seed = `${record.id}-${message.id}`;
  const latencyMs = seededInt(`${seed}-lat`, 640, 2400);
  const tokens = seededInt(`${seed}-tok`, 90, 480);

  const flow: MessageAuditFlowStep[] = [{ label: "User Input" }];
  for (const tc of message.toolCalls ?? []) flow.push({ label: `Tool call — ${tc.connector}: ${tc.name}` });
  flow.push({ label: "Agent Response" });

  return {
    status: "Success",
    latencyMs,
    tokens,
    messageId: message.id,
    conversationId: record.id,
    startedAt: message.at - latencyMs,
    endedAt: message.at,
    flow,
  };
}

export function buildTrace(record: ConversationRecord): ConversationTrace {
  const turns: TraceTurn[] = [];
  const msgs = record.messages;
  let i = 0;
  let turnIndex = 0;

  // A turn starts at a customer message and absorbs every consecutive agent message that
  // follows, up to (not including) the next customer message — "1 cặp hỏi-đáp = 1 turn".
  while (i < msgs.length) {
    turnIndex += 1;
    let customer: ConversationMessage | null = null;
    if (msgs[i].role === "customer") {
      customer = msgs[i];
      i++;
    }
    const agentMessages: ConversationMessage[] = [];
    while (i < msgs.length && msgs[i].role === "agent") {
      agentMessages.push(msgs[i]);
      i++;
    }

    const startedAt = customer?.at ?? agentMessages[0]?.at ?? record.startedAt;
    const endedAt = agentMessages.length ? agentMessages[agentMessages.length - 1].at : startedAt;
    const toolCallsInOrder = agentMessages.flatMap(m => m.toolCalls ?? []);
    const hasTool = toolCallsInOrder.length > 0;
    // "failed" only when the turn's own steps never recovered — the LAST tool-call attempt in
    // the turn still failed. A failed attempt followed by a successful retry (CV-1035) still
    // reads as "completed": the turn came through, even though one step stumbled on try 1.
    const outcome: TraceTurn["outcome"] =
      toolCallsInOrder.length > 0 && toolCallsInOrder[toolCallsInOrder.length - 1].status === "failed"
        ? "failed"
        : "completed";
    const seed = `${record.id}-turn${turnIndex}`;

    const tokensIn = seededInt(`${seed}-tin`, 180, 420);
    // Turn 1 has nothing to reuse yet — cache read only kicks in from the 2nd turn onward,
    // once the agent's Instructions + Knowledge context has already been sent once.
    const tokensCacheRead = turnIndex === 1 ? 0 : seededInt(`${seed}-tcache`, 900, 2600);
    const tokensOut = seededInt(`${seed}-tout`, 60, 260);
    const tokensReasoning = seededInt(`${seed}-trsn`, 20, 160);
    const baseLatency = seededInt(`${seed}-lat`, 780, 2400);
    const toolLatency = hasTool ? seededInt(`${seed}-toollat`, 320, 900) : 0;
    // A handful of seed conversations set this explicitly (see historyStore.ts) so the History
    // table's Latency column has a couple of obviously-red rows to point at, instead of relying
    // on the seeded hash to happen to land above the slow threshold.
    const latencyMs = record.demoSlowMs ?? baseLatency + toolLatency;
    const firstTokenMs = Math.round(latencyMs * (0.25 + seededInt(`${seed}-ftfrac`, 0, 20) / 100));

    turns.push({
      index: turnIndex,
      customer,
      agentMessages,
      startedAt,
      endedAt,
      outcome,
      latencyMs,
      firstTokenMs,
      tokensIn,
      tokensCacheRead,
      tokensOut,
      tokensReasoning,
      costIn: tokensIn * PRICE_PER_TOKEN.input,
      costCacheRead: tokensCacheRead * PRICE_PER_TOKEN.cacheRead,
      costOut: tokensOut * PRICE_PER_TOKEN.output,
      costReasoning: tokensReasoning * PRICE_PER_TOKEN.reasoning,
    });
  }

  // A currently-paused run has no failed/completed steps of its own to derive an outcome from —
  // it is paused, full stop. Only the conversation's very last turn can be the paused one (an
  // earlier turn, by definition, already finished so a later one could start), so this only
  // ever touches turns[turns.length - 1].
  if (record.awaitingHuman && turns.length > 0) {
    turns[turns.length - 1].outcome = "input_required";
  }

  const sortedLatency = turns.map(t => t.latencyMs).sort((a, b) => a - b);
  const pct = (p: number) => (sortedLatency.length ? sortedLatency[Math.min(sortedLatency.length - 1, Math.floor((sortedLatency.length - 1) * p))] : 0);
  const sortedFirstToken = turns.map(t => t.firstTokenMs).sort((a, b) => a - b);
  const pctFirstToken = (p: number) => (sortedFirstToken.length ? sortedFirstToken[Math.min(sortedFirstToken.length - 1, Math.floor((sortedFirstToken.length - 1) * p))] : 0);

  const totals = turns.reduce(
    (acc, t) => ({
      tokensIn: acc.tokensIn + t.tokensIn,
      tokensCacheRead: acc.tokensCacheRead + t.tokensCacheRead,
      tokensOut: acc.tokensOut + t.tokensOut,
      tokensReasoning: acc.tokensReasoning + t.tokensReasoning,
      costIn: acc.costIn + t.costIn,
      costCacheRead: acc.costCacheRead + t.costCacheRead,
      costOut: acc.costOut + t.costOut,
      costReasoning: acc.costReasoning + t.costReasoning,
      p50LatencyMs: pct(0.5),
      p99LatencyMs: pct(0.99),
      firstTokenMs: pctFirstToken(0.5),
    }),
    {
      tokensIn: 0, tokensCacheRead: 0, tokensOut: 0, tokensReasoning: 0,
      costIn: 0, costCacheRead: 0, costOut: 0, costReasoning: 0,
      p50LatencyMs: pct(0.5), p99LatencyMs: pct(0.99), firstTokenMs: pctFirstToken(0.5),
    },
  );

  return {
    conversationId: record.id,
    model: MODEL_BY_AGENT[record.agentId] ?? DEFAULT_MODEL,
    turns,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    totals,
    error: record.error,
  };
}
