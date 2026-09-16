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
    /** question only: what the agent asked the person. */
    question?: string;
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
function pseudoUlid(seed: string): string {
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

/** This demo conversation set is written specifically for "cskh" (Banking ABC — Customer
 * Care) — card locks, account balances, loan schedules, wire transfers — so only that
 * agent gets seeded. Every other agent, including Draft ones that have never been
 * published or used, starts with zero conversations and shows the real empty state. */
const AUTO_SEEDED_AGENT_IDS = new Set(["cskh"]);

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  if (!AUTO_SEEDED_AGENT_IDS.has(agentId)) return;
  const now = Date.now();

  const seed: Omit<ConversationRecord, "agentId">[] = [
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
        { role: "agent", content: "Done — a replacement will arrive within 5-7 business days." },
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
  ];

  for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
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
