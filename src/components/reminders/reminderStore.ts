// "Inactive reminder" — nudges a user who stopped replying while the Nhân sự số is waiting on them.
// Per agent: a master on/off switch + a list of reminders, each with up to 3 steps.
// sessionStorage-backed, no backend.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { CHANNEL_CATALOG } from "@/components/configure/channelCatalog";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { listLevel, parseToken, resolveRef, splitByRefs } from "@/components/configure/instructionRefs";

export interface ReminderStep {
  id: string;
  /** Wait = hours (0–23) + minutes (0–59). */
  hours: number;
  minutes: number;
  /** Text with {{ref:skill:…}} tokens for the skills it may use. */
  instruction: string;
  /** Optional — empty means "always send once the wait is over". */
  trigger: string;
  csat: boolean;
}
export interface Reminder {
  id: string;
  name: string;
  /** "all" includes channels published later. */
  channels: "all" | string[];
  steps: ReminderStep[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
export interface ReminderSettings {
  /** Master switch — off stops every pending nudge for this agent. */
  enabled: boolean;
}

export const MAX_STEPS = 3;
/** 23 giờ 59 phút. */
export const MAX_TOTAL_MIN = 23 * 60 + 59;
/** Hard cap per wait, counted across every reminder — the rule the whole feature hangs on. */
export const MAX_REPLIES_PER_WAIT = 3;
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
export const REMINDER_CHANNELS = CHANNEL_CATALOG.map(c => ({ id: c.id, name: c.name }));

/** How long after the user's last message a channel still allows an outbound message.
 * Beyond it the platform drops the nudge, so the sheet warns before saving. */
export const CHANNEL_WINDOW_MIN: Record<string, number> = {
  messenger: 24 * 60,
  zalo: 48 * 60,
  whatsapp: 24 * 60,
};
/** Mock: the API channel has no webhook subscribed to reminder events yet. */
export const API_REMINDER_EVENT_REGISTERED = false;

let seq = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const stepMinutes = (s: Pick<ReminderStep, "hours" | "minutes">) => (s.hours || 0) * 60 + (s.minutes || 0);
export const totalMinutes = (steps: ReminderStep[]) => steps.reduce((t, s) => t + stepMinutes(s), 0);
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return h >= 24 && h % 24 === 0 ? `${h / 24} ngày` : `${h} giờ`;
  return `${m} phút`;
}
export const channelLabel = (id: string) => REMINDER_CHANNELS.find(c => c.id === id)?.name ?? id;
export const includes = (channels: Reminder["channels"], id: string) => channels === "all" || channels.includes(id);

/* ───────────── channels ───────────── */

/** Channels this agent is actually published to — the only ones a reminder can target. */
export function publishedChannelIds(agentId: string): string[] {
  return agentPublishStore.get(agentId).channels ?? [];
}
export function publishedChannels(agentId: string) {
  const ids = publishedChannelIds(agentId);
  return REMINDER_CHANNELS.filter(c => ids.includes(c.id));
}
export const hasPublishedChannels = (agentId: string) => publishedChannelIds(agentId).length > 0;

/** "all" expanded against what is published right now. */
export function resolvedChannels(agentId: string, channels: Reminder["channels"]): string[] {
  const published = publishedChannelIds(agentId);
  return channels === "all" ? published : channels.filter(id => published.includes(id));
}

/** Channels the reminder targets that are no longer published — it gets switched off. */
export function missingChannels(agentId: string, r: Reminder): string[] {
  if (r.channels === "all") return [];
  const published = publishedChannelIds(agentId);
  return r.channels.filter(id => !published.includes(id));
}
/** True when nothing the reminder targets is live any more. */
export const lostAllChannels = (agentId: string, r: Reminder) =>
  r.channels !== "all" && r.channels.length > 0 && resolvedChannels(agentId, r.channels).length === 0;

/* ───────────── skills ───────────── */

/** Skill refs used in an instruction, resolved against the agent (missing = removed from it). */
export function stepSkills(agentId: string, instruction: string) {
  return splitByRefs(instruction)
    .filter(s => s.type === "ref" && s.ref.kind === "skill")
    .map(s => resolveRef(agentId, (s as { ref: NonNullable<ReturnType<typeof parseToken>> }).ref));
}
export const needsUpdate = (agentId: string, r: Reminder) =>
  r.steps.some(s => stepSkills(agentId, s.instruction).some(x => x.status !== "ok"));

export const emptyStep = (): ReminderStep => ({ id: uid("step"), hours: 0, minutes: 5, instruction: "", trigger: "", csat: false });
export const emptyReminder = (): Reminder => ({ id: uid("rem"), name: "", channels: "all", steps: [emptyStep()], enabled: true, createdAt: Date.now(), updatedAt: Date.now() });

/* ───────────── warnings (never block saving) ───────────── */

export interface OverlapHit {
  stepId: string;
  /** 1-based index of the step in the reminder being edited. */
  stepIndex: number;
  otherId: string;
  otherName: string;
  /** 1-based index of the colliding step in the other reminder. */
  otherStep: number;
  /** Step 1 vs step 1 is an exact collision (both counted from the same waiting message);
   * later steps only ever "có thể trùng" because earlier nudges shift the clock. */
  exact: boolean;
}

/** Running offset of each step from the message the agent is waiting on. */
const offsets = (steps: ReminderStep[]) => {
  let acc = 0;
  return steps.map(s => (acc += stepMinutes(s)));
};

/**
 * Steps of other enabled reminders that land on the same minute and share at least one
 * channel. Only reminders that are on count — a disabled one sends nothing.
 */
export function findOverlaps(agentId: string, r: Reminder, others: Reminder[]): OverlapHit[] {
  const mine = offsets(r.steps);
  const myChannels = new Set(resolvedChannels(agentId, r.channels));
  if (myChannels.size === 0) return [];
  const hits: OverlapHit[] = [];
  for (const o of others) {
    if (o.id === r.id || !o.enabled) continue;
    const shares = resolvedChannels(agentId, o.channels).some(c => myChannels.has(c));
    if (!shares) continue;
    const theirs = offsets(o.steps);
    mine.forEach((m, i) => {
      if (!stepMinutes(r.steps[i])) return;
      theirs.forEach((t, j) => {
        if (m !== t) return;
        hits.push({ stepId: r.steps[i].id, stepIndex: i + 1, otherId: o.id, otherName: o.name, otherStep: j + 1, exact: i === 0 && j === 0 });
      });
    });
  }
  return hits;
}

/** Channels whose interaction window the total wait can run past. */
export function windowWarnings(agentId: string, r: Reminder): { channel: string; windowMin: number }[] {
  const total = totalMinutes(r.steps);
  return resolvedChannels(agentId, r.channels)
    .filter(id => CHANNEL_WINDOW_MIN[id] !== undefined && total > CHANNEL_WINDOW_MIN[id])
    .map(id => ({ channel: channelLabel(id), windowMin: CHANNEL_WINDOW_MIN[id] }));
}

/** True when the reminder targets API but API has no reminder-event subscription. */
export const apiNotSubscribed = (agentId: string, r: Reminder) =>
  !API_REMINDER_EVENT_REGISTERED && resolvedChannels(agentId, r.channels).includes("api");

/* ───────────── persistence ───────────── */

const LIST_KEY = "inactive_reminders_v2";
const SETTINGS_KEY = "inactive_reminder_settings_v2";
const SEEDED_KEY = "inactive_reminders_seeded_v2";
const lists = loadMap<string, Reminder[]>(LIST_KEY);
const settings = loadMap<string, ReminderSettings>(SETTINGS_KEY);
const persist = () => saveMap(LIST_KEY, lists);
const DEFAULT_SETTINGS: ReminderSettings = { enabled: true };
const DAY = 86_400_000;

/** Demo data for two agents; every other agent starts empty (shows the empty state). */
function seed(agentId: string) {
  const flag = `${SEEDED_KEY}:${agentId}`;
  if (typeof sessionStorage === "undefined" || sessionStorage.getItem(flag)) return;
  sessionStorage.setItem(flag, "1");
  if (agentId !== "cskh" && agentId !== "slash-demo") return;
  const skill = listLevel(agentId, { cat: "skills" })[0];
  const skillTok = skill ? skill.token : "";
  const step = (hours: number, minutes: number, instruction: string, trigger: string, csat = false): ReminderStep =>
    ({ id: uid("step"), hours, minutes, instruction, trigger, csat });
  lists.set(agentId, [
    {
      // Lần 1 = 5 phút, cùng kênh "web" với "Chốt đơn" → minh hoạ cảnh báo trùng thời gian.
      id: uid("rem"), name: "Nhắc xin số điện thoại", channels: ["web", "zalo"], enabled: true,
      createdAt: Date.now() - 12 * DAY, updatedAt: Date.now() - DAY,
      steps: [step(0, 5, `Nhắc khách để lại số điện thoại để nhân viên gọi lại ${skillTok}`.trim(), "Khách chưa để lại số điện thoại sau khi được hỏi.")],
    },
    {
      id: uid("rem"), name: "Chốt đơn", channels: ["web"], enabled: true,
      createdAt: Date.now() - 9 * DAY, updatedAt: Date.now() - 3 * DAY,
      steps: [
        step(0, 5, "Hỏi khách có cần hỗ trợ hoàn tất đơn hàng không.", ""),
        step(0, 30, "Nhắc lần hai, nói rõ ưu đãi chỉ giữ trong hôm nay.", "Khách vẫn chưa xác nhận đơn."),
        step(2, 0, "Gửi link tiếp tục đặt hàng và xin đánh giá trải nghiệm.", "", true),
      ],
    },
    {
      // Kênh messenger không nằm trong danh sách publish của agent → mất kênh, tự tắt.
      id: uid("rem"), name: "Nhắc chọn sản phẩm", channels: ["messenger"], enabled: false,
      createdAt: Date.now() - 20 * DAY, updatedAt: Date.now() - 7 * DAY,
      steps: [step(0, 45, "Gợi ý lại 3 sản phẩm phù hợp nhất với nhu cầu khách đã nói.", "Khách chưa chọn sản phẩm nào.")],
    },
    {
      id: uid("rem"), name: "Nhắc tra cứu khoản vay", channels: ["web"], enabled: false,
      createdAt: Date.now() - 30 * DAY, updatedAt: Date.now() - 7 * DAY,
      steps: [step(0, 45, "Dùng {{ref:skill:legacy-loan-lookup|tra-cuu-khoan-vay-cu}} để nhắc khách số tiền còn nợ.", "Khách hỏi về khoản vay nhưng chưa xác nhận số hợp đồng.")],
    },
  ]);
  persist();
}

/** Older saved shapes: { amount, unit } steps, and reminders with no createdAt. */
function migrate(r: Reminder): Reminder {
  const createdAt = r.createdAt ?? r.updatedAt ?? Date.now();
  if (r.steps.every(s => typeof s.hours === "number")) return r.createdAt ? r : { ...r, createdAt };
  return { ...r, createdAt, steps: r.steps.map(s => {
    if (typeof s.hours === "number") return s;
    const o = s as unknown as { amount?: number | ""; unit?: string };
    const total = typeof o.amount === "number" ? o.amount * (o.unit === "hour" ? 60 : 1) : 0;
    return { ...s, hours: Math.min(23, Math.floor(total / 60)), minutes: total % 60 };
  }) };
}

export const reminderStore = {
  list(agentId: string): Reminder[] { seed(agentId); return (lists.get(agentId) ?? []).map(migrate); },
  settings(agentId: string): ReminderSettings { return settings.get(agentId) ?? DEFAULT_SETTINGS; },
  setSettings(agentId: string, s: ReminderSettings) { settings.set(agentId, s); saveMap(SETTINGS_KEY, settings); },
  save(agentId: string, r: Reminder) {
    const cur = this.list(agentId);
    const exists = cur.some(x => x.id === r.id);
    const next = { ...r, createdAt: r.createdAt ?? Date.now(), updatedAt: Date.now() };
    lists.set(agentId, exists ? cur.map(x => (x.id === r.id ? next : x)) : [next, ...cur]);
    persist();
  },
  setEnabled(agentId: string, id: string, enabled: boolean) {
    lists.set(agentId, this.list(agentId).map(x => (x.id === id ? { ...x, enabled } : x)));
    persist();
  },
  remove(agentId: string, id: string) { lists.set(agentId, this.list(agentId).filter(x => x.id !== id)); persist(); },
  /** Copy for "Nhân bản": new ids, "(bản sao)" suffix, off until saved and turned on. */
  duplicate(r: Reminder): Reminder {
    return { ...r, id: uid("rem"), name: `${r.name} (bản sao)`.slice(0, 100), enabled: false, createdAt: Date.now(), updatedAt: Date.now(), steps: r.steps.map(s => ({ ...s, id: uid("step") })) };
  },
  /** A reminder whose channels all went away can't run — switch it off so the table tells the truth. */
  syncLostChannels(agentId: string): number {
    const cur = this.list(agentId);
    let changed = 0;
    const next = cur.map(r => {
      if (r.enabled && lostAllChannels(agentId, r)) { changed++; return { ...r, enabled: false }; }
      return r;
    });
    if (changed) { lists.set(agentId, next); persist(); }
    return changed;
  },
};

/* ───────────── validation ───────────── */

export interface ReminderErrors { fields: Map<string, string>; total?: string }

export function validateReminder(agentId: string, r: Reminder, others: Reminder[]): ReminderErrors {
  const fields = new Map<string, string>();
  const name = r.name.trim();
  if (!name) fields.set("name", "Vui lòng nhập Reminder name.");
  else if (others.some(o => o.id !== r.id && o.name.trim().toLowerCase() === name.toLowerCase())) fields.set("name", "Tên reminder đã tồn tại trong Agent.");
  if (r.channels !== "all" && r.channels.length === 0) fields.set("channels", "Vui lòng chọn kênh áp dụng.");
  for (const s of r.steps) {
    const k = (f: string) => `step.${s.id}.${f}`;
    const m = stepMinutes(s);
    if (m === 0) fields.set(k("duration"), "Vui lòng nhập Duration.");
    else if (m > MAX_TOTAL_MIN) fields.set(k("duration"), "Thời gian chờ không được vượt quá 23 giờ 59 phút.");
    if (!s.instruction.replace(/\{\{ref:[^}]*\}\}/g, "x").trim()) fields.set(k("instruction"), "Vui lòng nhập Instruction.");
    else if (stepSkills(agentId, s.instruction).some(x => x.status !== "ok")) fields.set(k("instruction"), "Skill không còn tồn tại, vui lòng gỡ hoặc thay thế.");
    // Trigger is optional — empty means the nudge always goes out when the wait is over.
  }
  const total = totalMinutes(r.steps) > MAX_TOTAL_MIN ? "Tổng thời gian chờ của các lần nhắc không được vượt quá 23 giờ 59 phút." : undefined;
  return { fields, total };
}

/** Simulated "✨ Tạo tự động": derives a trigger condition from the instruction. */
export async function generateTrigger(instruction: string, signal?: AbortSignal): Promise<string> {
  await new Promise((resolve, reject) => {
    const t = setTimeout(resolve, 1200);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); });
  });
  const plain = instruction.replace(/\{\{ref:[^|}]*\|?([^}]*)\}\}/g, "$1").replace(/\s+/g, " ").trim();
  if (plain.length < 12) throw new Error("too short");
  const first = plain.split(/[.!?]/)[0].trim();
  return `Người dùng chưa phản hồi kể từ tin nhắn trước và yêu cầu "${first.charAt(0).toLowerCase()}${first.slice(1)}" vẫn chưa được hoàn tất.`;
}
/** Brief caps the generate call at ~10s. */
export const GENERATE_TIMEOUT_MS = 10_000;
