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
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  tokensReasoning: number;
  costIn: number;
  costOut: number;
  costReasoning: number;
}

export interface ConversationTrace {
  conversationId: string;
  model: string;
  turns: TraceTurn[];
  startedAt: number;
  endedAt: number;
  totals: {
    tokensIn: number;
    tokensOut: number;
    tokensReasoning: number;
    costIn: number;
    costOut: number;
    costReasoning: number;
    p50LatencyMs: number;
    p99LatencyMs: number;
  };
}

const MODEL_BY_AGENT: Record<string, string> = { cskh: "DeepSeek V4 Flash" };
const DEFAULT_MODEL = "GPT-4o mini";

// USD per single token — small, plausible per-call figures (same order of magnitude as
// current-generation hosted models), not tied to any specific vendor's real price sheet.
const PRICE_PER_TOKEN = { input: 0.00000025, output: 0.000001, reasoning: 0.0000015 };

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return h || 1;
}

function seededInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
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
    const hasTool = agentMessages.some(m => m.toolCall);
    const seed = `${record.id}-turn${turnIndex}`;

    const tokensIn = seededInt(`${seed}-tin`, 180, 420);
    const tokensOut = seededInt(`${seed}-tout`, 60, 260);
    const tokensReasoning = seededInt(`${seed}-trsn`, 20, 160);
    const baseLatency = seededInt(`${seed}-lat`, 780, 2400);
    const toolLatency = hasTool ? seededInt(`${seed}-toollat`, 320, 900) : 0;

    turns.push({
      index: turnIndex,
      customer,
      agentMessages,
      startedAt,
      endedAt,
      latencyMs: baseLatency + toolLatency,
      tokensIn,
      tokensOut,
      tokensReasoning,
      costIn: tokensIn * PRICE_PER_TOKEN.input,
      costOut: tokensOut * PRICE_PER_TOKEN.output,
      costReasoning: tokensReasoning * PRICE_PER_TOKEN.reasoning,
    });
  }

  const sortedLatency = turns.map(t => t.latencyMs).sort((a, b) => a - b);
  const pct = (p: number) => (sortedLatency.length ? sortedLatency[Math.min(sortedLatency.length - 1, Math.floor((sortedLatency.length - 1) * p))] : 0);

  const totals = turns.reduce(
    (acc, t) => ({
      tokensIn: acc.tokensIn + t.tokensIn,
      tokensOut: acc.tokensOut + t.tokensOut,
      tokensReasoning: acc.tokensReasoning + t.tokensReasoning,
      costIn: acc.costIn + t.costIn,
      costOut: acc.costOut + t.costOut,
      costReasoning: acc.costReasoning + t.costReasoning,
      p50LatencyMs: pct(0.5),
      p99LatencyMs: pct(0.99),
    }),
    { tokensIn: 0, tokensOut: 0, tokensReasoning: 0, costIn: 0, costOut: 0, costReasoning: 0, p50LatencyMs: pct(0.5), p99LatencyMs: pct(0.99) },
  );

  return {
    conversationId: record.id,
    model: MODEL_BY_AGENT[record.agentId] ?? DEFAULT_MODEL,
    turns,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    totals,
  };
}
