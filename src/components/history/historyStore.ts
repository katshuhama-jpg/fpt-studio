// In-memory conversation-history store for the History feature prototype.
// Mirrors the Task store pattern (src/components/tasks/taskStore.ts). Read-only —
// past conversations can't be edited — so this only exposes list/get, no CRUD.

import {
  Building02Icon, MessengerIcon, ApiIcon, HeadsetIcon, WhatsappIcon,
  InstagramIcon, LineIcon, ViberIcon, GoogleIcon, Globe02Icon, SlackIcon, EyeIcon,
} from "@hugeicons/core-free-icons";

// The single channel set for every run-history screen (conversational Agent, External
// Agent) — "web"/"slack" are External-only in practice today, same as "hifpt"/"engage"/etc.
// are conversational-only, but they all live in one union so a given channel id always
// resolves to the same icon everywhere instead of each screen keeping its own copy.
export type ConversationChannel =
  | "workspace" | "messenger" | "zalo" | "teams" | "hifpt" | "api"
  | "engage" | "whatsapp" | "instagram" | "line" | "viber" | "google"
  | "web" | "slack" | "preview";

/**
 * `icon` renders via HugeiconsIcon (matches the icon set already used for channel
 * logos elsewhere in this app, e.g. AgentBuilder.tsx's Deploy tab) for channels that
 * have one; `textBadge` is the fallback for channels with no matching icon (Zalo,
 * Microsoft Teams, Hi FPT — same "colored text mark" convention already used for
 * Zalo in AgentBuilder.tsx's EXTERNAL_DEPLOY_CHANNELS).
 */
export const CHANNEL_META: Record<ConversationChannel, { label: string; color: string; icon?: any; textBadge?: string }> = {
  workspace: { label: "Workspace", icon: Building02Icon, color: "#0F172A" },
  messenger: { label: "Messenger", icon: MessengerIcon, color: "#0084FF" },
  zalo: { label: "Zalo", textBadge: "Zalo", color: "#0068FF" },
  teams: { label: "Microsoft Teams", textBadge: "T", color: "#6264A7" },
  hifpt: { label: "Hi FPT", textBadge: "Hi", color: "#0068FF" },
  api: { label: "API", icon: ApiIcon, color: "#64748B" },
  engage: { label: "Engage", icon: HeadsetIcon, color: "#2563EB" },
  whatsapp: { label: "WhatsApp", icon: WhatsappIcon, color: "#25D366" },
  instagram: { label: "Instagram", icon: InstagramIcon, color: "#E4405F" },
  line: { label: "Line", icon: LineIcon, color: "#00B900" },
  viber: { label: "Viber", icon: ViberIcon, color: "#7360F2" },
  google: { label: "Google Business", icon: GoogleIcon, color: "#4285F4" },
  web: { label: "Web", icon: Globe02Icon, color: "#475569" },
  slack: { label: "Slack", icon: SlackIcon, color: "#611F69" },
  // Conversations run from the Console's own "Preview & Test" panel while building/testing the
  // agent, before it's deployed to a real channel — matches the channel value seen on the live
  // agents.fpt.ai chat-history screen.
  preview: { label: "Preview & Test", icon: EyeIcon, color: "#2563EB" },
};

/**
 * A tool/connector invocation the agent made while producing a given message — e.g. sending
 * a confirmation email through a connected Gmail account. Only present on messages where the
 * agent actually used a Skill or Connector already configured on this agent (see the agent's
 * Configuration panel); most replies have none, which is expected and shown as a plain
 * Input/Output turn with no tool-call step.
 */
export interface ToolCallInfo {
  callId: string;
  name: string;
  connector: string;
  input: Record<string, string>;
  output: Record<string, string>;
  /** Mirrors the real tracing spec's tool_call span `status` — whether this specific attempt
   * succeeded or failed. Optional and defaults to "success" wherever it's absent, since every
   * seed call written before this field existed doesn't set it. A failed call's `output` is
   * typically empty; see `error` for the failure reason. */
  status?: "success" | "failed";
  /** Populated when `status` is "failed" — same idea as the real span's own `error` field. */
  error?: string;
}

export interface ConversationMessage {
  id: string;
  role: "customer" | "agent";
  content: string;
  at: number; // epoch ms
  feedback?: "up" | "down"; // only ever set on role: "agent"
  /** Every tool/connector call this message's production involved, in order. Usually 0 or 1 —
   * an array (not a single optional call) because a real run can retry the same tool more than
   * once before succeeding (see CV-1035 below), and the real tracing spec traces each attempt
   * as its own span rather than collapsing retries into one record. */
  toolCalls?: ToolCallInfo[];
  /**
   * A guardrail check that actually intervened while producing this message — mirrors the real
   * tracing spec's `guardrail` span (`name`: which side it checked, `action`: what happened).
   * Only set for the rare case where a guardrail did something (see CV-1004 below); the common
   * "checked, nothing happened" case is deliberately not modeled per-message, same spirit as
   * ConversationRecord.error below only being set for the rare failure case, not every turn.
   */
  guardrail?: {
    name: "input" | "output";
    action: "pass" | "agent_refusal" | "blocked" | "replaced";
    rule?: string;
  };
  /**
   * Records what a human did to resume a paused run — mirrors the real tracing spec's `hitl`
   * span (Human-in-the-Loop). Only set once a pause has actually been resolved by a person: the
   * three situations from the spec are approving/editing/rejecting a sensitive tool call before
   * it runs, answering (or declining to answer) a question the agent asked, and authorizing an
   * account connection. A currently-paused run (see ConversationRecord.awaitingHuman below)
   * carries no `hitl` here yet, precisely because nothing has resumed it.
   */
  hitl?: {
    situation: "tool_approval" | "question" | "connect_account";
    action: "approve" | "edit" | "reject" | "respond" | "mixed" | "authorized";
    /** tool_approval only: which tool needed approval, and with what arguments. */
    toolName?: string;
    toolInput?: Record<string, unknown>;
    /** question only: what the agent asked the person, and — when the agent presented
     * discrete choices rather than an open question — the options it offered. Free-typed
     * answers (no fixed options) are common too, in which case this is left unset and
     * `answer` below carries whatever the person typed. */
    question?: string;
    options?: string[];
    /** connect_account only: which provider was being connected. */
    provider?: string;
    /** The person's actual decision / answer / edited value — the resumed run's real input. */
    answer?: string;
  };
}

export interface ConversationRecord {
  id: string;
  agentId: string;
  channel: ConversationChannel;
  username: string;
  /** Not every channel captures an email (e.g. anonymous widget chats) — optional on purpose. */
  email?: string;
  startedAt: number;
  endedAt: number;
  messages: ConversationMessage[];
  /**
   * The most recent system-level failure this conversation hit (a tool/connector call that
   * errored, timed out, or was retried) — same idea as LangSmith's Threads "Last Error" column.
   * Independent of how the conversation reads to the customer: the agent can still have
   * recovered and answered normally, same as CV-1035 below (the lock still went through after
   * one retry). Most conversations have none, which is the common case and shown as "—".
   */
  error?: string;
  /**
   * Forces every turn's latency to this value instead of the seeded hash — lets a couple of
   * demo conversations reliably show a slow/red Latency in the History table, rather than
   * hoping the hash happens to land above the slow threshold. See traceStore.ts buildTrace().
   */
  demoSlowMs?: number;
  /**
   * True while this conversation's most recent turn is paused waiting on a human decision (a
   * sensitive tool awaiting approval, a question posed back to the person, or an account
   * connection in progress) — mirrors the real tracing spec's `run` root span reporting
   * "input_required" instead of "completed"/"failed". See traceStore.ts buildTrace(), which
   * reads this to mark the conversation's last turn accordingly. Nothing has resumed the run
   * yet, so its last message carries no resolved `hitl` — that only appears once a person acts.
   */
  awaitingHuman?: boolean;
}

const store = new Map<string, ConversationRecord>();
const k = (agentId: string, conversationId: string) => `${agentId}:${conversationId}`;

const MIN = 60_000;
const DAY = 86_400_000;

/**
 * Deterministic ULID-shaped id (26 chars, Crockford base32) derived from a seed string —
 * not a real ULID (no encoded timestamp), just realistic-looking and stable across reloads,
 * matching how real conversation/message ids look (e.g. "01KZRH7DYBDQR24DTHS4HSQGHQ").
 */
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
// Exported so other seed data (e.g. runsStore.ts's Trigger Run seeds) can link to a
// specific conversation by the same human-readable label used here ("CV-1055") without
// duplicating the hash — pseudoUlid is a pure function of its seed, so the id it produces
// is stable wherever it's called from.
export function pseudoUlid(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let x = h || 1;
  let out = "";
  for (let i = 0; i < 26; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    // Use the LCG's top 5 bits, not `x % 32`: an LCG's low-order bits have a much shorter
    // period than the generator as a whole (here, `x % 32` cycles through at most 32 values
    // driven only by `x`'s low 5 bits), so indexing the alphabet with the low bits made every
    // id a function of `seed`'s hash mod 32 alone — collapsing 12 different seed conversations
    // down to ~9 distinct ids and silently dropping the rest from the History list. The top
    // bits of a standard LCG don't have this flaw.
    out += CROCKFORD_BASE32[(x >>> 27) & 31];
  }
  return out;
}

/** Builds a conversation's messages, spacing each `at` timestamp a couple minutes apart, ending at `endedAt`. */
function buildMessages(
  seedKey: string,
  endedAt: number,
  turns: {
    role: "customer" | "agent";
    content: string;
    feedback?: "up" | "down";
    toolCalls?: Omit<ToolCallInfo, "callId">[];
    guardrail?: ConversationMessage["guardrail"];
    hitl?: ConversationMessage["hitl"];
  }[],
): ConversationMessage[] {
  const startAt = endedAt - turns.length * 2 * MIN;
  return turns.map((t, i) => ({
    id: pseudoUlid(`${seedKey}-m${i + 1}`),
    role: t.role,
    content: t.content,
    at: startAt + i * 2 * MIN,
    feedback: t.feedback,
    guardrail: t.guardrail,
    hitl: t.hitl,
    toolCalls: t.toolCalls?.map((tc, j) => ({ ...tc, callId: `call_${pseudoUlid(`${seedKey}-tool${i + 1}-${j + 1}`).slice(0, 18)}` })),
  }));
}

/**
 * Each Published/active conversational agent gets its own realistic seed history — written
 * specifically for that agent's own domain, never shared/reused across agents (an HR bot
 * showing up with banking dispute conversations would be a worse demo than no history at
 * all). "sales" is deliberately left OUT of this set even though it's a conversational
 * agent: it's the one agent seeded as Draft with convs: 0 / "Just now" (see agentStore.ts),
 * kept that way on purpose so the History section still has a real, demonstrable EMPTY
 * state somewhere in the prototype — seeding it too would mean nobody could see that state.
 * Automation-kind agents (nightly-report, invoice-reminder, shipping-alerts) don't have a
 * History/Trace tab at all (they get TriggerRunsTab instead), so they're not part of this
 * either.
 *
 * "cskh" (Banking ABC — Customer Care) is a special case: it now has a real Trigger
 * configured (a separate, legitimate feature — any agent gains one the moment a Trigger is
 * added to it, per agentKindStore.ts's hasTriggers() check), which makes it an
 * automation-kind agent. Automation-kind agents show Trigger Runs instead of History/Trace,
 * so cskh's own flagship trace (CV-1055 below) is no longer reachable from its UI — its seed
 * data is left in place (harmless, and comes back if the Trigger is ever removed) but it no
 * longer counts as one of the demo's reachable flagship agents. "finance-check" and
 * "legal-review" take over that role instead (see below) so the tracing demo still has a
 * banking/enterprise-approval-style flagship agent, not just HR/FAQ/IT ones. Every agent not
 * listed in SEED_FN_BY_AGENT starts with zero conversations and shows the real empty state.
 *
 * Every seeded agent's OWN most recent conversation is a flagship "one-stop" demo, dated
 * later than every other conversation in that agent's history, that walks through every
 * tracing span type the Trace page renders — tool_call success, tool_call failed-then-
 * retried, hitl connect_account / question+options / tool_approval, and a guardrail
 * intervention — all in one place. Tyler asked for this specifically so a dev opening any
 * given demo agent's History doesn't have to go hunting across several different
 * conversations to find one example of each span type; see CV-1055 (cskh, no longer
 * reachable — see above) for the original, and HR-2001 / FAQ-3001 / OPS-4001 / FIN-5001 /
 * LGL-6001 below for the same idea re-themed per agent.
 */
const SEED_FN_BY_AGENT: Record<string, (now: number) => Omit<ConversationRecord, "agentId">[]> = {
  cskh: cskhSeed,
  hr: hrSeed,
  faq: faqSeed,
  ops: opsSeed,
  "finance-check": financeSeed,
  "legal-review": legalSeed,
};

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const seedFn = SEED_FN_BY_AGENT[agentId];
  if (!seedFn) return;
  const now = Date.now();

  for (const s of seedFn(now)) store.set(k(agentId, s.id), { ...s, agentId });
}

/** Banking ABC — Customer Care: card locks, account balances, loan schedules, wire transfers. */
function cskhSeed(now: number): Omit<ConversationRecord, "agentId">[] {
  return [
    {
      id: pseudoUlid("CV-1042"),
      channel: "messenger",
      username: "Nguyen Thi Lan",
      email: "nguyen.thi.lan@gmail.com",
      startedAt: now - 45 * MIN,
      endedAt: now - 40 * MIN,
      demoSlowMs: 9200,
      messages: buildMessages("CV-1042", now - 40 * MIN, [
        { role: "customer", content: "I lost my credit card, can you lock it right now?" },
        {
          role: "agent",
          content: "I'm sorry to hear that — let me pull up your account first.",
          toolCalls: [{
            name: "lookup_customer",
            connector: "Core Banking",
            input: { email: "nguyen.thi.lan@gmail.com" },
            output: { customerName: "Nguyen Thi Lan", cardLast4: "4821", cardStatus: "active" },
          }],
        },
        {
          role: "agent",
          content: "I've located your Visa card ending in 4821 — locking it now.",
          toolCalls: [{
            name: "lock_card",
            connector: "Core Banking",
            input: { cardLast4: "4821", reason: "lost" },
            output: { status: "locked", lockedAt: "2026-09-14T13:41:02Z" },
          }],
        },
        { role: "agent", content: "Your card is locked. No further transactions can go through until you unlock it or request a replacement.", feedback: "up" },
        {
          role: "agent",
          content: "I've also emailed a confirmation to nguyen.thi.lan@gmail.com with the case reference for your records.",
          toolCalls: [{
            name: "send_email",
            connector: "Gmail",
            input: {
              to: "nguyen.thi.lan@gmail.com",
              subject: "Xác nhận khoá thẻ Visa •••• 4821",
              template: "card_lock_confirmation",
            },
            output: { status: "sent", messageId: "18f2a9c4b6e2d701" },
          }],
        },
        { role: "customer", content: "Thank you, that was fast. Can you also send me a replacement card?" },
        {
          role: "agent",
          content: "Of course — I've ordered a replacement Visa card, mailed to your address on file.",
          toolCalls: [{
            name: "order_replacement_card",
            connector: "Core Banking",
            input: { cardLast4: "4821", deliveryMethod: "mail" },
            output: { status: "ordered", estimatedArrival: "5-7 business days", trackingRef: "RC-88213" },
          }],
        },
        { role: "customer", content: "Great, thank you for your help!" },
        { role: "agent", content: "You're very welcome — glad it's all sorted. Have a great day!" },
      ]),
    },
    {
      id: pseudoUlid("CV-1041"),
      channel: "zalo",
      username: "Tran Van Hung",
      email: "tran.van.hung@gmail.com",
      startedAt: now - 3 * 60 * MIN,
      endedAt: now - 2 * 60 * MIN - 55 * MIN,
      messages: buildMessages("CV-1041", now - 2 * 60 * MIN - 55 * MIN, [
        { role: "customer", content: "What's my current account balance?" },
        { role: "agent", content: "Your checking account ending in 2290 has a balance of 45,320,000 VND as of this morning." },
        { role: "customer", content: "Perfect, thanks." },
        { role: "agent", content: "You're welcome! Let us know if there's anything else." },
      ]),
    },
    {
      id: pseudoUlid("CV-1038"),
      channel: "whatsapp",
      username: "Le Thi Mai",
      email: "le.thi.mai@gmail.com",
      startedAt: now - DAY - 2 * 60 * MIN,
      endedAt: now - DAY,
      messages: buildMessages("CV-1038", now - DAY, [
        { role: "customer", content: "I can't log into online banking, it says my password is wrong." },
        { role: "agent", content: "Let's reset it. I'll send a one-time code to the phone number on file — can you confirm the last 3 digits?" },
        { role: "customer", content: "089" },
        { role: "agent", content: "Confirmed. Code sent — enter it on the reset screen and choose a new password." },
        { role: "agent", content: "Let me know if the code doesn't arrive within a couple minutes.", feedback: "up" },
      ]),
    },
    {
      id: pseudoUlid("CV-1035"),
      channel: "api",
      username: "Pham Duc Anh",
      email: "pham.duc.anh@gmail.com",
      startedAt: now - 2 * DAY - 10 * MIN,
      endedAt: now - 2 * DAY,
      error: "Timeout: Core Banking API không phản hồi sau 15s khi khoá thẻ (đã tự động thử lại và thành công ở lần 2).",
      messages: buildMessages("CV-1035", now - 2 * DAY, [
        { role: "customer", content: "My wallet was stolen this morning, I need to report my debit card lost." },
        {
          role: "agent",
          content: "Understood — I've locked debit card ending in 7734 immediately.",
          toolCalls: [
            {
              name: "lock_card",
              connector: "Core Banking",
              input: { cardLast4: "7734", reason: "stolen" },
              output: {},
              status: "failed",
              error: "Timeout: Core Banking API không phản hồi sau 15s.",
            },
            {
              name: "lock_card",
              connector: "Core Banking",
              input: { cardLast4: "7734", reason: "stolen" },
              output: { status: "locked", lockedAt: "2026-09-12T09:14:41Z" },
              status: "success",
            },
          ],
        },
        { role: "agent", content: "Would you like a replacement card mailed to your address on file, or would you prefer to pick one up at a branch?" },
        { role: "customer", content: "Mail is fine." },
        {
          role: "agent",
          content: "Done — a replacement will arrive within 5-7 business days.",
          // Demonstrates the hitl "question" situation — the agent posed a question with two
          // concrete options rather than asking for open-ended approval, and the customer picked
          // one by typing a short reply rather than selecting a button. This was already present
          // as plain chat content above; what's new is capturing it as a structured hitl span
          // (same retrofit pattern as CV-1027's tool_approval one) so the Trace page actually
          // renders a Human-in-the-loop step showing the question + options that were offered
          // and what the customer answered, instead of that decision only being visible as two
          // ordinary chat bubbles indistinguishable from the rest of the conversation.
          hitl: {
            situation: "question",
            action: "respond",
            question: "Would you like a replacement card mailed to your address on file, or would you prefer to pick one up at a branch?",
            options: ["Mail to address on file", "Pick up at a branch"],
            answer: "Mail is fine.",
          },
        },
      ]),
    },
    {
      id: pseudoUlid("CV-1030"),
      channel: "zalo",
      username: "Hoang Thi Thu",
      email: "hoang.thi.thu@gmail.com",
      startedAt: now - 4 * DAY - 6 * MIN,
      endedAt: now - 4 * DAY,
      messages: buildMessages("CV-1030", now - 4 * DAY, [
        { role: "customer", content: "I'd like to book a consultation with a financial advisor." },
        { role: "agent", content: "Sure — I have openings this Thursday at 10:00 or Friday at 14:00. Which works better?" },
        { role: "customer", content: "Friday at 2pm please." },
        { role: "agent", content: "Booked for Friday, 14:00 at your home branch. You'll get a reminder the day before.", feedback: "up" },
      ]),
    },
    {
      id: pseudoUlid("CV-1027"),
      channel: "instagram",
      username: "Vu Minh Khoa",
      email: "vu.minh.khoa@gmail.com",
      startedAt: now - 6 * DAY - 8 * MIN,
      endedAt: now - 6 * DAY,
      demoSlowMs: 6400,
      messages: buildMessages("CV-1027", now - 6 * DAY, [
        { role: "customer", content: "There's a charge on my statement I don't recognize — 1,200,000 VND to \"QRPAY MERCHANT 88\"." },
        {
          role: "agent",
          content: "I see that charge from yesterday. I've opened a dispute case — reference #DP-5567.",
          hitl: {
            situation: "tool_approval",
            toolName: "open_dispute",
            toolInput: { merchant: "QRPAY MERCHANT 88", amount: 1200000, currency: "VND" },
            action: "approve",
            answer: "Nhân viên CSKH xác nhận mở tranh chấp giúp khách hàng.",
          },
          toolCalls: [
            {
              name: "open_dispute",
              connector: "Core Banking",
              input: { merchant: "QRPAY MERCHANT 88", amount: 1200000, currency: "VND" },
              output: { caseId: "DP-5567", status: "opened" },
            },
          ],
        },
        { role: "agent", content: "The disputed amount is temporarily credited back while we investigate. This usually takes 5-10 business days." },
        { role: "customer", content: "Okay, thank you for looking into it." },
        { role: "agent", content: "Of course — we'll keep you posted on the case." },
      ]),
    },
    {
      id: pseudoUlid("CV-1021"),
      channel: "api",
      username: "Do Thanh Tung",
      startedAt: now - 10 * DAY - 4 * MIN,
      endedAt: now - 10 * DAY,
      messages: buildMessages("CV-1021", now - 10 * DAY, [
        { role: "customer", content: "Has my international wire transfer to Singapore gone through yet?" },
        { role: "agent", content: "Your transfer of 25,000,000 VND initiated on the 3rd is showing as completed — it arrived at the recipient bank yesterday." },
        { role: "customer", content: "Great, appreciate it." },
        { role: "agent", content: "You're welcome! Let us know if you need anything else." },
      ]),
    },
    {
      id: pseudoUlid("CV-1016"),
      channel: "zalo",
      username: "Bui Thi Ngoc",
      email: "bui.thi.ngoc@gmail.com",
      startedAt: now - 15 * DAY - 10 * MIN,
      endedAt: now - 15 * DAY,
      messages: buildMessages("CV-1016", now - 15 * DAY, [
        { role: "customer", content: "Can you send me my loan repayment schedule?" },
        { role: "agent", content: "Your home loan has 18 payments remaining, 8,500,000 VND due on the 5th of each month." },
        { role: "customer", content: "Can I make an extra payment this month to reduce the principal?" },
        { role: "agent", content: "Yes — extra payments are applied directly to principal. You can submit one from the Loans tab, or I can start it here." },
        { role: "customer", content: "I'll do it from the app, thanks." },
        { role: "agent", content: "Sounds good — we're here if you need a hand along the way." },
      ]),
    },
    {
      id: pseudoUlid("CV-1009"),
      channel: "line",
      username: "Ngo Van Phuc",
      email: "ngo.van.phuc@gmail.com",
      startedAt: now - 22 * DAY - 6 * MIN,
      endedAt: now - 22 * DAY,
      messages: buildMessages("CV-1009", now - 22 * DAY, [
        { role: "customer", content: "I want to open a savings account, what are the interest rates?" },
        { role: "agent", content: "Our 6-month term deposit is currently 4.8% p.a., and 12-month is 5.5% p.a." },
        { role: "agent", content: "Would you like me to start opening one for you now?" },
        { role: "customer", content: "Not yet, just checking rates." },
        { role: "agent", content: "No problem — happy to help whenever you're ready." },
      ]),
    },
    {
      id: pseudoUlid("CV-1004"),
      channel: "zalo",
      username: "Dang Thi Hoa",
      email: "dang.thi.hoa@gmail.com",
      startedAt: now - 28 * DAY - 4 * MIN,
      endedAt: now - 28 * DAY,
      error: "Guardrail: phản hồi đầu tiên bị chặn vì tiết lộ số dư tài khoản chưa xác thực danh tính, agent đã sinh lại câu trả lời.",
      messages: buildMessages("CV-1004", now - 28 * DAY, [
        { role: "customer", content: "Why was I charged a 50,000 VND monthly fee? I thought my account was fee-free." },
        {
          role: "agent",
          content: "Your account is fee-free with a minimum balance of 5,000,000 VND — last month it dropped below that for a few days.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Tiết lộ số dư tài khoản khi chưa xác thực danh tính khách hàng",
          },
        },
        { role: "customer", content: "That's annoying, nobody told me." },
        { role: "agent", content: "I understand the frustration — I've waived this month's fee as a one-time courtesy and enabled low-balance alerts for you.", feedback: "down" },
      ]),
    },
    {
      id: pseudoUlid("CV-0988"),
      channel: "workspace",
      username: "Trinh Van Duc",
      email: "trinh.van.duc@gmail.com",
      startedAt: now - 45 * DAY - 4 * MIN,
      endedAt: now - 45 * DAY,
      messages: buildMessages("CV-0988", now - 45 * DAY, [
        { role: "customer", content: "I need to update the phone number on my account." },
        { role: "agent", content: "Sure — please share the new number and I'll send a verification code to it." },
        { role: "customer", content: "0912 345 678" },
        { role: "agent", content: "Code sent. Once verified, your account will use this number for all future OTPs.", feedback: "up" },
      ]),
    },
    {
      id: pseudoUlid("CV-1045"),
      channel: "preview",
      username: "Builder (you)",
      startedAt: now - 20 * MIN,
      endedAt: now - 18 * MIN,
      messages: buildMessages("CV-1045", now - 18 * MIN, [
        { role: "agent", content: "Xin chào! Quý khách cần hỗ trợ gì về khoản vay hôm nay?" },
        { role: "customer", content: "Cho mình hỏi thử lãi suất vay tín chấp hiện tại." },
        { role: "agent", content: "Lãi suất vay tín chấp hiện tại từ 1.6%/tháng, tuỳ hồ sơ. Đây là phản hồi thử nghiệm từ Preview & Test, dùng để kiểm tra agent trước khi triển khai ra kênh thật." },
      ]),
    },
    {
      id: pseudoUlid("CV-1050"),
      channel: "zalo",
      username: "Tran Van Duc",
      email: "tran.van.duc@gmail.com",
      startedAt: now - 3 * MIN,
      endedAt: now - 1 * MIN,
      /** Demonstrates the real tracing spec's `hitl` situation still in flight: the run is
       * paused awaiting a human decision, so it has no resolved `.hitl` on any message yet — see
       * ConversationMessage.hitl above. traceStore.ts reads this flag to mark the conversation's
       * last turn "input_required" instead of "completed"/"failed". */
      awaitingHuman: true,
      messages: buildMessages("CV-1050", now - 1 * MIN, [
        { role: "customer", content: "Mình muốn chuyển 500,000,000 VND sang tài khoản công ty đối tác, chuyển gấp trong hôm nay được không?" },
        { role: "agent", content: "Khoản chuyển này vượt hạn mức tự động (trên 200,000,000 VND/lần) nên mình đã gửi yêu cầu duyệt cho bộ phận kiểm soát rủi ro trước khi thực hiện. Mình sẽ báo lại ngay khi có kết quả." },
      ]),
    },
    {
      id: pseudoUlid("CV-1055"),
      channel: "zalo",
      username: "Nguyen Van Thanh",
      email: "nguyen.van.thanh@gmail.com",
      startedAt: now - 10 * MIN,
      endedAt: now - 15_000,
      /**
       * Flagship demo conversation — deliberately dated more recent than every other seed
       * conversation (including CV-1050) so it's the first row in the History table. Built to
       * showcase every tracing span type the Trace page can render, all in one place, instead of
       * a reviewer having to open several different conversations to see one example of each:
       *   - tool_call, success (lookup_customer, link_wallet)
       *   - tool_call, failed then retried within the same message (increase_credit_limit)
       *   - hitl "connect_account" (linking the customer's MoMo wallet)
       *   - hitl "question" with options (50tr vs. 80tr) and the customer's typed answer
       *   - hitl "tool_approval" (the limit increase itself, since 80tr exceeds the auto threshold)
       *   - guardrail "output" / "replaced" (masking the full card number before it went out)
       * Every other seed conversation still demonstrates its own single case standalone
       * (CV-1027 tool_approval, CV-1035 question + retry, CV-1004 guardrail, CV-1050 the
       * still-open "input_required" outcome) — this one doesn't replace those, it's the
       * one-stop walkthrough on top of them.
       */
      error: "Timeout: Core Banking API không phản hồi sau 15s khi tăng hạn mức thẻ (đã tự động thử lại và thành công ở lần 2).",
      messages: buildMessages("CV-1055", now - 15_000, [
        { role: "customer", content: "Mình muốn tăng hạn mức thẻ tín dụng và liên kết ví MoMo để nhận ưu đãi hoàn tiền." },
        {
          role: "agent",
          content: "Để mình kiểm tra thông tin thẻ của bạn trước nhé.",
          toolCalls: [{
            name: "lookup_customer",
            connector: "Core Banking",
            input: { email: "nguyen.van.thanh@gmail.com" },
            output: { customerName: "Nguyen Van Thanh", cardLast4: "5560", currentLimit: "30000000" },
          }],
        },
        {
          role: "agent",
          content: "Để liên kết ví MoMo, hệ thống cần bạn xác nhận cho phép kết nối tới tài khoản MoMo của bạn.",
          hitl: {
            situation: "connect_account",
            action: "authorized",
            provider: "MoMo",
            answer: "Khách hàng xác nhận liên kết qua mã OTP gửi tới số điện thoại đã đăng ký.",
          },
        },
        {
          role: "agent",
          content: "Đã liên kết ví MoMo thành công — ưu đãi hoàn tiền sẽ được áp dụng sau khi hạn mức thẻ được cập nhật.",
          toolCalls: [{
            name: "link_wallet",
            connector: "MoMo",
            input: { cardLast4: "5560" },
            output: { status: "linked", walletId: "MOMO-88213456" },
          }],
        },
        { role: "customer", content: "Ok, vậy tăng hạn mức lên bao nhiêu được nhỉ?" },
        { role: "agent", content: "Bạn muốn tăng hạn mức thẻ lên 50,000,000 VND hay 80,000,000 VND?" },
        { role: "customer", content: "80 triệu nhé." },
        {
          role: "agent",
          content: "Được rồi — 80,000,000 VND vượt hạn mức tự động (trên 50,000,000 VND/lần) nên mình cần trình duyệt nội bộ trước khi áp dụng, mình sẽ báo lại ngay khi có kết quả.",
          hitl: {
            situation: "question",
            action: "respond",
            question: "Bạn muốn tăng hạn mức thẻ lên 50,000,000 VND hay 80,000,000 VND?",
            options: ["50,000,000 VND", "80,000,000 VND"],
            answer: "80 triệu nhé.",
          },
        },
        {
          role: "agent",
          content: "Yêu cầu đã được duyệt — hạn mức thẻ của bạn hiện đã là 80,000,000 VND.",
          hitl: {
            situation: "tool_approval",
            action: "approve",
            toolName: "increase_credit_limit",
            toolInput: { cardLast4: "5560", newLimit: 80000000 },
            answer: "Trưởng nhóm CSKH xác nhận nâng hạn mức theo yêu cầu khách hàng.",
          },
          toolCalls: [
            {
              name: "increase_credit_limit",
              connector: "Core Banking",
              input: { cardLast4: "5560", newLimit: 80000000 },
              output: {},
              status: "failed",
              error: "Timeout: Core Banking API không phản hồi sau 15s.",
            },
            {
              name: "increase_credit_limit",
              connector: "Core Banking",
              input: { cardLast4: "5560", newLimit: 80000000 },
              output: { status: "active", newLimit: "80000000" },
              status: "success",
            },
          ],
        },
        {
          role: "agent",
          content: "Thẻ của bạn (•••• 5560) đã được nâng hạn mức thành công. Ưu đãi hoàn tiền qua ví MoMo cũng đã sẵn sàng sử dụng.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Tiết lộ số thẻ đầy đủ trong tin nhắn trả lời khách hàng",
          },
        },
      ]),
    },
  ];
}

/**
 * HR Onboarding Bot: just the one flagship conversation (see the SEED_FN_BY_AGENT
 * comment above) — a new joiner's Day-1 setup, covering every span type in one thread:
 * tool_call success (get_onboarding_checklist), hitl connect_account (enrolling benefits
 * in BambooHR), hitl question+options (laptop delivery), tool_call failed-then-retried
 * (scheduling the manager 1:1), hitl tool_approval (an early equipment request that
 * needs manager sign-off), and a guardrail replace (redacting a colleague's exact salary
 * band while explaining compensation ranges).
 */
function hrSeed(now: number): Omit<ConversationRecord, "agentId">[] {
  return [
    {
      id: pseudoUlid("HR-2001"),
      channel: "slack",
      username: "Pham Thi Huyen",
      email: "pham.thi.huyen@fpt.com.vn",
      startedAt: now - 12 * MIN,
      endedAt: now - 15_000,
      error: "Timeout: Google Calendar API không phản hồi sau 15s khi đặt lịch 1:1 với quản lý (đã tự động thử lại và thành công ở lần 2).",
      messages: buildMessages("HR-2001", now - 15_000, [
        { role: "customer", content: "Hi! It's my first day — what do I need to get set up?" },
        {
          role: "agent",
          content: "Welcome aboard! Let me pull up your onboarding checklist.",
          toolCalls: [{
            name: "get_onboarding_checklist",
            connector: "BambooHR",
            input: { employeeId: "E-20394" },
            output: { role: "Product Analyst", manager: "Le Quoc Trung", checklistItems: "7" },
          }],
        },
        {
          role: "agent",
          content: "First, to enroll your health and benefits plan, I need your permission to connect to BambooHR's benefits portal on your behalf.",
          hitl: {
            situation: "connect_account",
            action: "authorized",
            provider: "BambooHR",
            answer: "Nhân viên mới xác nhận cho phép kết nối để đăng ký gói phúc lợi qua email công ty.",
          },
        },
        { role: "customer", content: "Sounds good, what else?" },
        { role: "agent", content: "Would you like your laptop shipped to your home address, or would you prefer to pick it up at the office on your first day?" },
        { role: "customer", content: "I'll pick it up at the office." },
        {
          role: "agent",
          content: "Got it — your laptop will be ready at the front desk on Day 1.",
          hitl: {
            situation: "question",
            action: "respond",
            question: "Would you like your laptop shipped to your home address, or would you prefer to pick it up at the office on your first day?",
            options: ["Ship to home address", "Pick up at the office"],
            answer: "I'll pick it up at the office.",
          },
        },
        {
          role: "agent",
          content: "I've also booked your first 1:1 with your manager, Le Quoc Trung, for this Friday at 2pm.",
          toolCalls: [
            {
              name: "schedule_manager_meeting",
              connector: "Google Calendar",
              input: { withEmployeeId: "E-10221", duration: "30m" },
              output: {},
              status: "failed",
              error: "Timeout: Google Calendar API không phản hồi sau 15s.",
            },
            {
              name: "schedule_manager_meeting",
              connector: "Google Calendar",
              input: { withEmployeeId: "E-10221", duration: "30m" },
              output: { status: "scheduled", eventId: "GCAL-77213" },
              status: "success",
            },
          ],
        },
        { role: "customer", content: "One more thing — can I get my equipment a few days early? I'd like to set it up before my start date." },
        {
          role: "agent",
          content: "That's approved — IT will have your laptop and access badge ready two days early.",
          hitl: {
            situation: "tool_approval",
            action: "approve",
            toolName: "request_early_equipment",
            toolInput: { employeeId: "E-20394", daysEarly: 2 },
            answer: "Quản lý trực tiếp (Le Quoc Trung) phê duyệt cấp thiết bị sớm cho nhân viên mới.",
          },
        },
        {
          role: "agent",
          content: "One last thing — your compensation band for this role is in the standard mid-level range; your HR Business Partner will walk you through the exact figures during your Week 1 meeting.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Tiết lộ mức lương/băng lương cụ thể của nhân viên khác khi giải thích compensation band",
          },
        },
      ]),
    },
  ];
}

/**
 * Product FAQ Assistant: just the one flagship conversation — a warranty claim that
 * covers every span type: tool_call success (check_warranty_status), hitl connect_account
 * (linking the product-registration account), hitl question+options (shipping speed),
 * tool_call failed-then-retried (checking the serial number), hitl tool_approval (a
 * replacement part that exceeds the free-replacement cost threshold), and a guardrail
 * replace (masking the product's full serial number before it goes out in chat).
 */
function faqSeed(now: number): Omit<ConversationRecord, "agentId">[] {
  return [
    {
      id: pseudoUlid("FAQ-3001"),
      channel: "web",
      username: "Vo Thi Kim Ngan",
      email: "vo.thi.kim.ngan@gmail.com",
      startedAt: now - 12 * MIN,
      endedAt: now - 15_000,
      error: "Timeout: Warranty API không phản hồi sau 15s khi tra cứu số serial (đã tự động thử lại và thành công ở lần 2).",
      messages: buildMessages("FAQ-3001", now - 15_000, [
        { role: "customer", content: "My blender stopped working after 3 months, is it still under warranty?" },
        {
          role: "agent",
          content: "Let me check your warranty status first.",
          toolCalls: [{
            name: "check_warranty_status",
            connector: "Warranty Portal",
            input: { email: "vo.thi.kim.ngan@gmail.com" },
            output: { product: "BlendMax Pro 900", purchaseDate: "2026-06-02", warrantyMonthsLeft: "9" },
          }],
        },
        {
          role: "agent",
          content: "To pull up your specific unit's repair history, I need your permission to connect to your product-registration account.",
          hitl: {
            situation: "connect_account",
            action: "authorized",
            provider: "Product Registration Portal",
            answer: "Khách hàng xác nhận liên kết tài khoản đăng ký sản phẩm qua email.",
          },
        },
        { role: "customer", content: "Sure, go ahead." },
        { role: "agent", content: "Would you like the replacement part sent by express shipping (1-2 days) or standard shipping (5-7 days)?" },
        { role: "customer", content: "Express is fine." },
        {
          role: "agent",
          content: "Confirmed — I'll get an express replacement part sent your way.",
          hitl: {
            situation: "question",
            action: "respond",
            question: "Would you like the replacement part sent by express shipping (1-2 days) or standard shipping (5-7 days)?",
            options: ["Express shipping (1-2 days)", "Standard shipping (5-7 days)"],
            answer: "Express is fine.",
          },
        },
        {
          role: "agent",
          content: "I've pulled up your unit's serial number to file the claim.",
          toolCalls: [
            {
              name: "check_serial_number",
              connector: "Warranty Portal",
              input: { product: "BlendMax Pro 900" },
              output: {},
              status: "failed",
              error: "Timeout: Warranty API không phản hồi sau 15s.",
            },
            {
              name: "check_serial_number",
              connector: "Warranty Portal",
              input: { product: "BlendMax Pro 900" },
              output: { serial: "BM900-88213456", status: "verified" },
              status: "success",
            },
          ],
        },
        { role: "customer", content: "Great, thank you!" },
        {
          role: "agent",
          content: "Approved — since the motor assembly is a higher-cost part, this needed a quick sign-off, but it's confirmed and shipping express at no charge.",
          hitl: {
            situation: "tool_approval",
            action: "approve",
            toolName: "issue_replacement_part",
            toolInput: { serial: "BM900-88213456", part: "motor_assembly", cost: 850000 },
            answer: "Trưởng nhóm CSKH sản phẩm phê duyệt đổi linh kiện miễn phí vượt ngưỡng chi phí tự động.",
          },
        },
        {
          role: "agent",
          content: "Your replacement part (serial •••• 3456) is on its way and should arrive within 1-2 days.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Tiết lộ số serial đầy đủ của sản phẩm trong tin nhắn trả lời khách hàng",
          },
        },
      ]),
    },
  ];
}

/**
 * IT Helpdesk: just the one flagship conversation — a VPN/access request that covers
 * every span type: tool_call success (reset_vpn_credentials), hitl connect_account
 * (linking an authenticator app for MFA), hitl question+options (reset method), tool_call
 * failed-then-retried (checking Active Directory), hitl tool_approval (elevated access to
 * a shared drive, needing security sign-off), and a guardrail replace (a temporary
 * password that almost went out in plaintext, redacted before sending).
 */
function opsSeed(now: number): Omit<ConversationRecord, "agentId">[] {
  return [
    {
      id: pseudoUlid("OPS-4001"),
      channel: "teams",
      username: "Dinh Cong Hieu",
      email: "dinh.cong.hieu@fpt.com.vn",
      startedAt: now - 12 * MIN,
      endedAt: now - 15_000,
      error: "Timeout: Active Directory không phản hồi sau 15s khi kiểm tra tài khoản (đã tự động thử lại và thành công ở lần 2).",
      messages: buildMessages("OPS-4001", now - 15_000, [
        { role: "customer", content: "I can't connect to the VPN, it keeps saying my credentials are invalid." },
        {
          role: "agent",
          content: "Let me reset your VPN credentials.",
          toolCalls: [{
            name: "reset_vpn_credentials",
            connector: "Core VPN",
            input: { employeeId: "E-30112" },
            output: { status: "reset", tempPassword: "issued" },
          }],
        },
        {
          role: "agent",
          content: "While we're at it, I'd recommend setting up an authenticator app for MFA instead of SMS codes — I need your permission to link it to your account.",
          hitl: {
            situation: "connect_account",
            action: "authorized",
            provider: "Microsoft Authenticator",
            answer: "Nhân viên xác nhận liên kết ứng dụng xác thực qua mã QR.",
          },
        },
        { role: "customer", content: "Ok, linked it." },
        { role: "agent", content: "Would you like to reset your login password via SMS code, or via the authenticator app you just linked?" },
        { role: "customer", content: "Authenticator app, please." },
        {
          role: "agent",
          content: "Done — check your authenticator app for the reset link.",
          hitl: {
            situation: "question",
            action: "respond",
            question: "Would you like to reset your login password via SMS code, or via the authenticator app you just linked?",
            options: ["SMS code", "Authenticator app"],
            answer: "Authenticator app, please.",
          },
        },
        {
          role: "agent",
          content: "I've also double-checked your account status in Active Directory to make sure nothing else is locked.",
          toolCalls: [
            {
              name: "check_ad_account_status",
              connector: "Active Directory",
              input: { employeeId: "E-30112" },
              output: {},
              status: "failed",
              error: "Timeout: Active Directory không phản hồi sau 15s.",
            },
            {
              name: "check_ad_account_status",
              connector: "Active Directory",
              input: { employeeId: "E-30112" },
              output: { status: "active", locked: "false" },
              status: "success",
            },
          ],
        },
        { role: "customer", content: "Thanks. Also, can I get access to the Finance shared drive? My manager said it's fine." },
        {
          role: "agent",
          content: "Approved by IT Security — you now have read access to the Finance shared drive.",
          hitl: {
            situation: "tool_approval",
            action: "approve",
            toolName: "grant_shared_drive_access",
            toolInput: { employeeId: "E-30112", drive: "Finance", level: "read" },
            answer: "IT Security phê duyệt cấp quyền truy cập ổ chia sẻ Finance sau khi xác nhận với quản lý trực tiếp.",
          },
        },
        {
          role: "agent",
          content: "Your VPN is reset — use the temporary password sent to your registered email, not this chat, to sign in.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Gửi mật khẩu tạm thời dạng plaintext qua kênh chat thay vì kênh bảo mật (email đã xác thực)",
          },
        },
      ]),
    },
  ];
}

/**
 * Finance Discount-Check Agent: just the one flagship conversation — a sales rep escalating
 * a discount that exceeds the standard policy threshold, covering every span type: tool_call
 * success (check_discount_policy), hitl connect_account (linking the CRM deal record), hitl
 * question+options (whether the discount applies to the full term or year 1 only), tool_call
 * failed-then-retried (checking the customer's credit standing), hitl tool_approval (the
 * Finance Manager sign-off required above the policy threshold), and a guardrail replace
 * (masking the customer's exact credit limit before it goes back to the requester).
 */
function financeSeed(now: number): Omit<ConversationRecord, "agentId">[] {
  return [
    {
      id: pseudoUlid("FIN-5001"),
      channel: "workspace",
      username: "Nguyen Van Phuc",
      email: "nguyen.van.phuc@fpt.com.vn",
      startedAt: now - 12 * MIN,
      endedAt: now - 15_000,
      error: "Timeout: Credit Bureau API did not respond within 15s while checking the customer's credit limit (auto-retried and succeeded on attempt 2).",
      messages: buildMessages("FIN-5001", now - 15_000, [
        { role: "customer", content: "I need to submit a 22% discount for the ABC Corp deal — that's above our standard 15% cap." },
        {
          role: "agent",
          content: "Let me check that against the current discount policy.",
          toolCalls: [{
            name: "check_discount_policy",
            connector: "Finance Policy Engine",
            input: { dealId: "DEAL-88213", requestedDiscountPct: 22 },
            output: { standardCapPct: 15, requiresApproval: "true", tier: "Enterprise" },
          }],
        },
        {
          role: "agent",
          content: "To pull the full deal record, I need your permission to connect to the CRM.",
          hitl: {
            situation: "connect_account",
            action: "authorized",
            provider: "Salesforce CRM",
            answer: "Sales rep confirmed permission to connect the CRM to pull the deal record.",
          },
        },
        { role: "customer", content: "Go ahead." },
        { role: "agent", content: "Does this discount apply to the full contract term, or just the first year?" },
        { role: "customer", content: "Just the first year." },
        {
          role: "agent",
          content: "Noted — first-year only. Preparing the approval brief now.",
          hitl: {
            situation: "question",
            action: "respond",
            question: "Does this discount apply to the full contract term, or just the first year?",
            options: ["Full contract term", "First year only"],
            answer: "Just the first year.",
          },
        },
        {
          role: "agent",
          content: "I've also checked the customer's credit standing for the risk assessment.",
          toolCalls: [
            {
              name: "check_customer_credit_score",
              connector: "Credit Bureau",
              input: { customerId: "CUST-40221" },
              output: {},
              status: "failed",
              error: "Timeout: Credit Bureau API không phản hồi sau 15s.",
            },
            {
              name: "check_customer_credit_score",
              connector: "Credit Bureau",
              input: { customerId: "CUST-40221" },
              output: { riskTier: "Low", status: "verified" },
              status: "success",
            },
          ],
        },
        { role: "customer", content: "Great — so are we good to send this to the customer?" },
        {
          role: "agent",
          content: "Approved — the 22% first-year discount is signed off and ready to include in the quote.",
          hitl: {
            situation: "tool_approval",
            action: "approve",
            toolName: "request_manager_approval",
            toolInput: { dealId: "DEAL-88213", requestedDiscountPct: 22, capPct: 15 },
            answer: "Finance Manager approved the discount above the standard cap for this Enterprise-tier deal.",
          },
        },
        {
          role: "agent",
          content: "One note — the customer's credit limit is on file with Finance; loop in your manager if you need the exact figure for the contract.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Disclosing the customer's specific credit limit to a sales rep without view access",
          },
        },
      ]),
    },
  ];
}

/**
 * Legal Contract-Terms Agent: just the one flagship conversation — attaching contract
 * clauses for a deal that needs a non-standard liability cap, covering every span type:
 * tool_call success (fetch_standard_clauses), hitl connect_account (linking the Legal
 * Knowledge Portal), hitl question+options (which jurisdiction's clause set applies), tool_call
 * failed-then-retried (checking clause compliance), hitl tool_approval (Legal counsel sign-off
 * for the non-standard liability cap), and a guardrail replace (masking the exact negotiated
 * cap figure before it goes back over a general channel).
 */
function legalSeed(now: number): Omit<ConversationRecord, "agentId">[] {
  return [
    {
      id: pseudoUlid("LGL-6001"),
      channel: "workspace",
      username: "Tran Bao Ngoc",
      email: "tran.bao.ngoc@fpt.com.vn",
      startedAt: now - 12 * MIN,
      endedAt: now - 15_000,
      error: "Timeout: Legal Knowledge Portal did not respond within 15s while checking clause compliance (auto-retried and succeeded on attempt 2).",
      messages: buildMessages("LGL-6001", now - 15_000, [
        { role: "customer", content: "I need clauses attached for the XYZ Corp contract — they're asking for a liability cap above our standard." },
        {
          role: "agent",
          content: "Let me pull the standard clause set first.",
          toolCalls: [{
            name: "fetch_standard_clauses",
            connector: "Legal Knowledge Portal",
            input: { productLine: "Enterprise SaaS" },
            output: { clauseSetVersion: "v4.2", standardLiabilityCap: "1x annual contract value" },
          }],
        },
        {
          role: "agent",
          content: "To check the specific deviation against precedent, I need your permission to connect to the Legal Knowledge Portal.",
          hitl: {
            situation: "connect_account",
            action: "authorized",
            provider: "Legal Knowledge Portal",
            answer: "Deal desk confirmed permission to connect the Legal Knowledge Portal to look up precedent.",
          },
        },
        { role: "customer", content: "Sure, go ahead." },
        { role: "agent", content: "Which governing law applies to this contract — Vietnam or Singapore?" },
        { role: "customer", content: "Singapore." },
        {
          role: "agent",
          content: "Noted — using the Singapore-law clause variant.",
          hitl: {
            situation: "question",
            action: "respond",
            question: "Which governing law applies to this contract — Vietnam or Singapore?",
            options: ["Vietnam law", "Singapore law"],
            answer: "Singapore.",
          },
        },
        {
          role: "agent",
          content: "I've also checked this deviation against compliance precedent.",
          toolCalls: [
            {
              name: "check_clause_compliance",
              connector: "Legal Knowledge Portal",
              input: { clauseSetVersion: "v4.2", requestedCap: "2x annual contract value" },
              output: {},
              status: "failed",
              error: "Timeout: Legal Knowledge Portal không phản hồi sau 15s.",
            },
            {
              name: "check_clause_compliance",
              connector: "Legal Knowledge Portal",
              input: { clauseSetVersion: "v4.2", requestedCap: "2x annual contract value" },
              output: { precedentFound: "true", riskLevel: "Medium" },
              status: "success",
            },
          ],
        },
        { role: "customer", content: "Are we clear to send the contract with that cap?" },
        {
          role: "agent",
          content: "Approved — Legal has signed off on the 2x liability cap for this deal.",
          hitl: {
            situation: "tool_approval",
            action: "approve",
            toolName: "request_legal_review",
            toolInput: { dealId: "XYZ-CORP-2026", requestedCap: "2x annual contract value", standardCap: "1x annual contract value" },
            answer: "Legal counsel approved the liability cap above the standard for this Singapore-law contract.",
          },
        },
        {
          role: "agent",
          content: "The contract package is ready — the exact negotiated cap figure is recorded with Legal; check with them directly if you need it for the customer-facing summary.",
          guardrail: {
            name: "output",
            action: "replaced",
            rule: "Disclosing the specific negotiated liability cap figure over an unrestricted general channel",
          },
        },
      ]),
    },
  ];
}

export const historyStore = {
  list(agentId: string): ConversationRecord[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(c => c.agentId === agentId)
      .sort((a, b) => b.endedAt - a.endedAt);
  },
  get(agentId: string, conversationId: string): ConversationRecord | undefined {
    seedAgent(agentId);
    return store.get(k(agentId, conversationId));
  },
};
