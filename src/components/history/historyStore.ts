// In-memory conversation-history store for the History feature prototype.
// Mirrors the Task store pattern (src/components/tasks/taskStore.ts). Read-only —
// past conversations can't be edited — so this only exposes list/get, no CRUD.

import {
  Building02Icon, MessengerIcon, ApiIcon, HeadsetIcon, WhatsappIcon,
  InstagramIcon, LineIcon, ViberIcon, GoogleIcon,
} from "@hugeicons/core-free-icons";

export type ConversationChannel =
  | "workspace" | "messenger" | "zalo" | "teams" | "hifpt" | "api"
  | "engage" | "whatsapp" | "instagram" | "line" | "viber" | "google";

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
};

export interface ConversationMessage {
  id: string;
  role: "customer" | "agent";
  content: string;
  at: number; // epoch ms
  feedback?: "up" | "down"; // only ever set on role: "agent"
}

export interface ConversationRecord {
  id: string;
  agentId: string;
  channel: ConversationChannel;
  username: string;
  startedAt: number;
  endedAt: number;
  messages: ConversationMessage[];
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
    out += CROCKFORD_BASE32[x % 32];
  }
  return out;
}

/** Builds a conversation's messages, spacing each `at` timestamp a couple minutes apart, ending at `endedAt`. */
function buildMessages(
  seedKey: string,
  endedAt: number,
  turns: { role: "customer" | "agent"; content: string; feedback?: "up" | "down" }[],
): ConversationMessage[] {
  const startAt = endedAt - turns.length * 2 * MIN;
  return turns.map((t, i) => ({
    id: pseudoUlid(`${seedKey}-m${i + 1}`),
    role: t.role,
    content: t.content,
    at: startAt + i * 2 * MIN,
    feedback: t.feedback,
  }));
}

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();

  const seed: Omit<ConversationRecord, "agentId">[] = [
    {
      id: pseudoUlid("CV-1042"),
      channel: "messenger",
      username: "Nguyen Thi Lan",
      startedAt: now - 45 * MIN,
      endedAt: now - 40 * MIN,
      messages: buildMessages("CV-1042", now - 40 * MIN, [
        { role: "customer", content: "I lost my credit card, can you lock it right now?" },
        { role: "agent", content: "I'm sorry to hear that. I've located your Visa card ending in 4821 — locking it now." },
        { role: "agent", content: "Your card is locked. No further transactions can go through until you unlock it or request a replacement.", feedback: "up" },
        { role: "customer", content: "Thank you, that was fast." },
      ]),
    },
    {
      id: pseudoUlid("CV-1041"),
      channel: "zalo",
      username: "Tran Van Hung",
      startedAt: now - 3 * 60 * MIN,
      endedAt: now - 2 * 60 * MIN - 55 * MIN,
      messages: buildMessages("CV-1041", now - 2 * 60 * MIN - 55 * MIN, [
        { role: "customer", content: "What's my current account balance?" },
        { role: "agent", content: "Your checking account ending in 2290 has a balance of 45,320,000 VND as of this morning." },
        { role: "customer", content: "Perfect, thanks." },
      ]),
    },
    {
      id: pseudoUlid("CV-1038"),
      channel: "whatsapp",
      username: "Le Thi Mai",
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
      startedAt: now - 2 * DAY - 10 * MIN,
      endedAt: now - 2 * DAY,
      messages: buildMessages("CV-1035", now - 2 * DAY, [
        { role: "customer", content: "My wallet was stolen this morning, I need to report my debit card lost." },
        { role: "agent", content: "Understood — I've locked debit card ending in 7734 immediately." },
        { role: "agent", content: "Would you like a replacement card mailed to your address on file, or would you prefer to pick one up at a branch?" },
        { role: "customer", content: "Mail is fine." },
        { role: "agent", content: "Done — a replacement will arrive within 5-7 business days." },
      ]),
    },
    {
      id: pseudoUlid("CV-1030"),
      channel: "zalo",
      username: "Hoang Thi Thu",
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
      startedAt: now - 6 * DAY - 8 * MIN,
      endedAt: now - 6 * DAY,
      messages: buildMessages("CV-1027", now - 6 * DAY, [
        { role: "customer", content: "There's a charge on my statement I don't recognize — 1,200,000 VND to \"QRPAY MERCHANT 88\"." },
        { role: "agent", content: "I see that charge from yesterday. I've opened a dispute case — reference #DP-5567." },
        { role: "agent", content: "The disputed amount is temporarily credited back while we investigate. This usually takes 5-10 business days." },
        { role: "customer", content: "Okay, thank you for looking into it." },
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
      ]),
    },
    {
      id: pseudoUlid("CV-1016"),
      channel: "zalo",
      username: "Bui Thi Ngoc",
      startedAt: now - 15 * DAY - 10 * MIN,
      endedAt: now - 15 * DAY,
      messages: buildMessages("CV-1016", now - 15 * DAY, [
        { role: "customer", content: "Can you send me my loan repayment schedule?" },
        { role: "agent", content: "Your home loan has 18 payments remaining, 8,500,000 VND due on the 5th of each month." },
        { role: "customer", content: "Can I make an extra payment this month to reduce the principal?" },
        { role: "agent", content: "Yes — extra payments are applied directly to principal. You can submit one from the Loans tab, or I can start it here." },
        { role: "customer", content: "I'll do it from the app, thanks." },
      ]),
    },
    {
      id: pseudoUlid("CV-1009"),
      channel: "line",
      username: "Ngo Van Phuc",
      startedAt: now - 22 * DAY - 6 * MIN,
      endedAt: now - 22 * DAY,
      messages: buildMessages("CV-1009", now - 22 * DAY, [
        { role: "customer", content: "I want to open a savings account, what are the interest rates?" },
        { role: "agent", content: "Our 6-month term deposit is currently 4.8% p.a., and 12-month is 5.5% p.a." },
        { role: "agent", content: "Would you like me to start opening one for you now?" },
        { role: "customer", content: "Not yet, just checking rates." },
      ]),
    },
    {
      id: pseudoUlid("CV-1004"),
      channel: "zalo",
      username: "Dang Thi Hoa",
      startedAt: now - 28 * DAY - 4 * MIN,
      endedAt: now - 28 * DAY,
      messages: buildMessages("CV-1004", now - 28 * DAY, [
        { role: "customer", content: "Why was I charged a 50,000 VND monthly fee? I thought my account was fee-free." },
        { role: "agent", content: "Your account is fee-free with a minimum balance of 5,000,000 VND — last month it dropped below that for a few days." },
        { role: "customer", content: "That's annoying, nobody told me." },
        { role: "agent", content: "I understand the frustration — I've waived this month's fee as a one-time courtesy and enabled low-balance alerts for you.", feedback: "down" },
      ]),
    },
    {
      id: pseudoUlid("CV-0988"),
      channel: "workspace",
      username: "Trinh Van Duc",
      startedAt: now - 45 * DAY - 4 * MIN,
      endedAt: now - 45 * DAY,
      messages: buildMessages("CV-0988", now - 45 * DAY, [
        { role: "customer", content: "I need to update the phone number on my account." },
        { role: "agent", content: "Sure — please share the new number and I'll send a verification code to it." },
        { role: "customer", content: "0912 345 678" },
        { role: "agent", content: "Code sent. Once verified, your account will use this number for all future OTPs.", feedback: "up" },
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
