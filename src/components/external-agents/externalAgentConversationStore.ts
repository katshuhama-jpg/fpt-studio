// In-memory conversation store for an external agent's History tab — grouped by thread,
// matching the internal agent's Run history (src/components/history/historyStore.ts), but with
// one addition: because an external agent runs one HTTP POST /runs request per turn, every
// agent message here carries the metadata of the run that produced it (runId, duration,
// outcome, tool calls). Read-only, like historyStore — conversations can't be edited.

export type ExternalAgentChannel = "web" | "zalo" | "messenger" | "slack" | "teams" | "api" | "workspace";

export interface RunToolCall {
  name: string;
  args: string;
  result?: string;
}

export interface RunMeta {
  runId: string;
  durationMs: number;
  outcome: "success" | "error" | "interrupt";
  toolCalls: RunToolCall[];
  errorMessage?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  at: number;
  /** Only set on agent messages — the run that produced this reply. */
  run?: RunMeta;
}

export interface ExternalConversation {
  id: string; // threadId
  agentId: string;
  channel: ExternalAgentChannel;
  username: string;
  /** Not every channel captures an email (e.g. anonymous widget chats) — optional on purpose. */
  email?: string;
  startedAt: number;
  endedAt: number;
  messages: ConversationMessage[];
}

const store = new Map<string, ExternalConversation>();
const k = (agentId: string, threadId: string) => `${agentId}:${threadId}`;
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function pseudoUlid(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let x = h || 1;
  let out = "";
  for (let i = 0; i < 26; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    out += CROCKFORD_BASE32[x % 32];
  }
  return out;
}

function buildTurns(
  seedKey: string,
  endedAt: number,
  turns: { user: string; agent: string; run: Omit<RunMeta, "runId"> }[],
): ConversationMessage[] {
  const startAt = endedAt - turns.length * 2 * MIN;
  const out: ConversationMessage[] = [];
  turns.forEach((t, i) => {
    const at = startAt + i * 2 * MIN;
    out.push({ id: pseudoUlid(`${seedKey}-u${i + 1}`), role: "user", content: t.user, at });
    out.push({
      id: pseudoUlid(`${seedKey}-a${i + 1}`), role: "agent", content: t.agent, at: at + 30_000,
      run: { runId: pseudoUlid(`${seedKey}-run${i + 1}`), ...t.run },
    });
  });
  return out;
}

/** Only published (or previously-published) agents get seeded conversations — an agent that's
 * never gone live has never had a real user turn, so it gets the genuine empty state instead. */
const SEEDED_AGENT_IDS = new Set(["ext-seed-1", "ext-seed-2"]);

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  if (!SEEDED_AGENT_IDS.has(agentId)) return;
  const now = Date.now();

  if (agentId === "ext-seed-1") {
    const seed: Omit<ExternalConversation, "agentId">[] = [
      {
        id: pseudoUlid("EXT-CV-1"),
        channel: "web",
        username: "Nguyen Van An",
        email: "nguyen.van.an@gmail.com",
        startedAt: now - 3 * 60 * MIN,
        endedAt: now - 3 * HOUR,
        messages: buildTurns("EXT-CV-1", now - 3 * 60 * MIN + 4 * MIN, [
          {
            user: "Can you book a round-trip flight from Hanoi to Ho Chi Minh City next Monday?",
            agent: "I found a round-trip on Vietnam Airlines departing Monday 08:00, returning Friday 18:30 — 2,450,000 VND. Shall I book it?",
            run: { durationMs: 1400, outcome: "success", toolCalls: [
              { name: "search_flights", args: '{"from":"HAN","to":"SGN","date":"2026-09-01"}', result: '{"flights":3,"cheapest":2450000}' },
            ] },
          },
          {
            user: "Yes, please book it.",
            agent: "Booked — confirmation code VN4821. E-ticket sent to your registered email.",
            run: { durationMs: 1100, outcome: "success", toolCalls: [
              { name: "book_flight", args: '{"flightId":"VN4821"}', result: '{"status":"confirmed"}' },
            ] },
          },
        ]),
      },
      {
        id: pseudoUlid("EXT-CV-2"),
        channel: "zalo",
        username: "Tran Thi Bich",
        email: "tran.thi.bich@gmail.com",
        startedAt: now - DAY - 20 * MIN,
        endedAt: now - DAY,
        messages: buildTurns("EXT-CV-2", now - DAY, [
          {
            user: "What's the status of my booking VN3390?",
            agent: "I couldn't reach the booking system just now — could you try again in a moment?",
            run: { durationMs: 900, outcome: "error", toolCalls: [], errorMessage: "Upstream booking API returned 503 Service Unavailable." },
          },
        ]),
      },
      {
        id: pseudoUlid("EXT-CV-3"),
        channel: "web",
        username: "Le Quoc Bao",
        email: "le.quoc.bao@gmail.com",
        startedAt: now - 3 * DAY - 10 * MIN,
        endedAt: now - 3 * DAY,
        messages: buildTurns("EXT-CV-3", now - 3 * DAY, [
          {
            user: "I need to cancel my flight but I'm not sure which fare rules apply.",
            agent: "Before I cancel, can you confirm you'd like a refund to your original payment method rather than airline credit?",
            run: { durationMs: 1200, outcome: "interrupt", toolCalls: [
              { name: "get_fare_rules", args: '{"bookingId":"VN2210"}', result: '{"refundable":true,"fee":150000}' },
            ] },
          },
        ]),
      },
    ];
    for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
  }

  if (agentId === "ext-seed-2") {
    const seed: Omit<ExternalConversation, "agentId">[] = [
      {
        id: pseudoUlid("EXT-CV-10"),
        channel: "slack",
        username: "Pham Thi Hoa",
        email: "pham.thi.hoa@abc.ai",
        startedAt: now - 5 * HOUR - 5 * MIN,
        endedAt: now - 5 * HOUR,
        messages: buildTurns("EXT-CV-10", now - 5 * HOUR, [
          {
            user: "How many annual leave days do I have left?",
            agent: "You have 6.5 annual leave days remaining for this year, as of today.",
            run: { durationMs: 760, outcome: "success", toolCalls: [
              { name: "get_leave_balance", args: '{"employeeId":"EMP-2291"}', result: '{"remaining":6.5}' },
            ] },
          },
        ]),
      },
      {
        id: pseudoUlid("EXT-CV-11"),
        channel: "slack",
        username: "Vu Dinh Khoi",
        startedAt: now - 4 * DAY - 6 * MIN,
        endedAt: now - 4 * DAY,
        messages: buildTurns("EXT-CV-11", now - 4 * DAY, [
          {
            user: "Why is my payroll deduction higher this month?",
            agent: "I wasn't able to find a payroll record for this month yet — payroll runs are usually available after the 3rd business day.",
            run: { durationMs: 2100, outcome: "error", toolCalls: [
              { name: "get_payroll_line_items", args: '{"employeeId":"EMP-3170","month":"2026-08"}', result: undefined },
            ], errorMessage: "Payroll record not found for the requested period." },
          },
        ]),
      },
    ];
    for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
  }
}


export const externalAgentConversationStore = {
  list(agentId: string): ExternalConversation[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(c => c.agentId === agentId)
      .sort((a, b) => b.endedAt - a.endedAt);
  },
  get(agentId: string, threadId: string): ExternalConversation | undefined {
    seedAgent(agentId);
    return store.get(k(agentId, threadId));
  },
};
