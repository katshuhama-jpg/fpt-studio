// "Inactive reminder" — nudges a user who stopped replying while the Nhân sự số is waiting on them.
// Per agent: global settings (on/off, quiet hours) + a list of reminders, each with up to 3 steps.
// sessionStorage-backed, no backend.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { CHANNEL_CATALOG } from "@/components/configure/channelCatalog";
import { listLevel, parseToken, resolveRef, splitByRefs } from "@/components/configure/instructionRefs";

export interface ReminderStep {
  id: string;
  /** Wait = hours + minutes; minutes are a multiple of 5 (0–55). */
  hours: number;
  minutes: number;
  /** Text with {{ref:skill:…}} tokens for the skills it may use. */
  instruction: string;
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
  updatedAt: number;
}
export interface ReminderSettings {
  enabled: boolean;
  quiet: { on: boolean; from: string; to: string };
}

export const MAX_STEPS = 3;
export const MAX_TOTAL_MIN = 23 * 60;
export const MINUTE_STEP = 5;
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
export const REMINDER_CHANNELS = CHANNEL_CATALOG.map(c => ({ id: c.id, name: c.name }));
/** Channels that can't show rating buttons — CSAT falls back to plain text there. */
const NO_RATING_BUTTONS = new Set(["api", "slack", "zalo", "whatsapp"]);

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
export const textFallbackChannels = (channels: Reminder["channels"]) =>
  (channels === "all" ? REMINDER_CHANNELS.map(c => c.id) : channels).filter(id => NO_RATING_BUTTONS.has(id)).map(channelLabel);

/** Skill refs used in an instruction, resolved against the agent (missing = removed from it). */
export function stepSkills(agentId: string, instruction: string) {
  return splitByRefs(instruction)
    .filter(s => s.type === "ref" && s.ref.kind === "skill")
    .map(s => resolveRef(agentId, (s as { ref: NonNullable<ReturnType<typeof parseToken>> }).ref));
}
export const needsUpdate = (agentId: string, r: Reminder) =>
  r.steps.some(s => stepSkills(agentId, s.instruction).some(x => x.status !== "ok"));

export const emptyStep = (): ReminderStep => ({ id: uid("step"), hours: 0, minutes: 0, instruction: "", trigger: "", csat: false });
export const emptyReminder = (): Reminder => ({ id: uid("rem"), name: "", channels: "all", steps: [emptyStep()], enabled: true, updatedAt: Date.now() });

/* ───────────── persistence ───────────── */

const LIST_KEY = "inactive_reminders_v1";
const SETTINGS_KEY = "inactive_reminder_settings_v1";
const SEEDED_KEY = "inactive_reminders_seeded_v1";
const lists = loadMap<string, Reminder[]>(LIST_KEY);
const settings = loadMap<string, ReminderSettings>(SETTINGS_KEY);
const persist = () => saveMap(LIST_KEY, lists);
const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, quiet: { on: true, from: "21:00", to: "08:00" } };

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
      id: uid("rem"), name: "Nhắc xin số điện thoại", channels: ["web", "zalo"], enabled: true, updatedAt: Date.now() - 86_400_000,
      steps: [
        step(0, 30, `Nhắc khách để lại số điện thoại để nhân viên gọi lại ${skillTok}`.trim(), "Khách chưa để lại số điện thoại sau khi được hỏi."),
        step(3, 0, "Nhắc lần hai, nói rõ ưu đãi chỉ giữ trong hôm nay.", "Khách vẫn chưa để lại số điện thoại."),
      ],
    },
    {
      id: uid("rem"), name: "Hỏi lại khi khách bỏ dở đăng ký", channels: "all", enabled: true, updatedAt: Date.now() - 3 * 86_400_000,
      steps: [
        step(1, 0, "Hỏi khách có cần hỗ trợ hoàn tất đăng ký không.", "Khách đã bắt đầu đăng ký nhưng chưa hoàn tất."),
        step(4, 0, "Gửi link tiếp tục đăng ký và xin đánh giá trải nghiệm.", "Khách vẫn chưa hoàn tất đăng ký.", true),
      ],
    },
    {
      id: uid("rem"), name: "Nhắc tra cứu khoản vay", channels: ["web"], enabled: false, updatedAt: Date.now() - 7 * 86_400_000,
      steps: [step(0, 45, "Dùng {{ref:skill:legacy-loan-lookup|tra-cuu-khoan-vay-cu}} để nhắc khách số tiền còn nợ.", "Khách hỏi về khoản vay nhưng chưa xác nhận số hợp đồng.")],
    },
  ]);
  persist();
}

/** Steps saved before the hours/minutes split stored { amount, unit }. */
function migrate(r: Reminder): Reminder {
  if (r.steps.every(s => typeof s.hours === "number")) return r;
  return { ...r, steps: r.steps.map(s => {
    if (typeof s.hours === "number") return s;
    const o = s as unknown as { amount?: number | ""; unit?: string };
    const total = typeof o.amount === "number" ? o.amount * (o.unit === "hour" ? 60 : 1) : 0;
    const mins = Math.round((total % 60) / MINUTE_STEP) * MINUTE_STEP;
    return { ...s, hours: Math.min(23, Math.floor(total / 60)), minutes: mins === 60 ? 55 : mins };
  }) };
}

export const reminderStore = {
  list(agentId: string): Reminder[] { seed(agentId); return (lists.get(agentId) ?? []).map(migrate); },
  settings(agentId: string): ReminderSettings { return settings.get(agentId) ?? DEFAULT_SETTINGS; },
  setSettings(agentId: string, s: ReminderSettings) { settings.set(agentId, s); saveMap(SETTINGS_KEY, settings); },
  save(agentId: string, r: Reminder) {
    const cur = this.list(agentId);
    const next = { ...r, updatedAt: Date.now() };
    lists.set(agentId, cur.some(x => x.id === r.id) ? cur.map(x => (x.id === r.id ? next : x)) : [next, ...cur]);
    persist();
  },
  setEnabled(agentId: string, id: string, enabled: boolean) {
    lists.set(agentId, this.list(agentId).map(x => (x.id === id ? { ...x, enabled } : x)));
    persist();
  },
  remove(agentId: string, id: string) { lists.set(agentId, this.list(agentId).filter(x => x.id !== id)); persist(); },
  /** Copy for "Nhân bản": new ids, "(bản sao)" suffix, off until saved and turned on. */
  duplicate(r: Reminder): Reminder {
    return { ...r, id: uid("rem"), name: `${r.name} (bản sao)`.slice(0, 100), enabled: false, steps: r.steps.map(s => ({ ...s, id: uid("step") })) };
  },
};

/* ───────────── validation ───────────── */

export interface ReminderErrors { fields: Map<string, string>; total?: string }

export function validateReminder(agentId: string, r: Reminder, others: Reminder[]): ReminderErrors {
  const fields = new Map<string, string>();
  const name = r.name.trim();
  if (!name) fields.set("name", "Vui lòng nhập Reminder name.");
  else if (others.some(o => o.id !== r.id && o.name.trim().toLowerCase() === name.toLowerCase())) fields.set("name", "Tên reminder đã tồn tại.");
  if (r.channels !== "all" && r.channels.length === 0) fields.set("channels", "Vui lòng nhập Channels.");
  for (const s of r.steps) {
    const k = (f: string) => `step.${s.id}.${f}`;
    const m = stepMinutes(s);
    if (m === 0) fields.set(k("duration"), "Vui lòng nhập Duration.");
    else if (m < MINUTE_STEP || m > MAX_TOTAL_MIN || s.minutes % MINUTE_STEP !== 0) fields.set(k("duration"), "Thời gian chờ phải từ 5 phút đến 23 giờ.");
    if (!s.instruction.replace(/\{\{ref:[^}]*\}\}/g, "x").trim()) fields.set(k("instruction"), "Vui lòng nhập Instruction.");
    else if (stepSkills(agentId, s.instruction).some(x => x.status !== "ok")) fields.set(k("instruction"), "Skill không còn tồn tại, vui lòng gỡ hoặc thay thế.");
    if (!s.trigger.trim()) fields.set(k("trigger"), "Vui lòng nhập Trigger hoặc dùng Tạo tự động.");
  }
  const total = totalMinutes(r.steps) > MAX_TOTAL_MIN ? "Tổng thời gian không được vượt quá 23 giờ." : undefined;
  return { fields, total };
}

/** Simulated "✨ Tạo tự động": derives a trigger condition from the instruction. */
export async function generateTrigger(instruction: string): Promise<string> {
  await new Promise(r => setTimeout(r, 1200));
  const plain = instruction.replace(/\{\{ref:[^|}]*\|?([^}]*)\}\}/g, "$1").replace(/\s+/g, " ").trim();
  if (plain.length < 12) throw new Error("too short");
  const first = plain.split(/[.!?]/)[0].trim();
  return `Người dùng chưa phản hồi kể từ tin nhắn trước và yêu cầu "${first.charAt(0).toLowerCase()}${first.slice(1)}" vẫn chưa được hoàn tất.`;
}
