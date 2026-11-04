// "Kết thúc hội thoại tự động" (Conversation timeout) — per Agent, saved to the draft
// (takes effect after Publish). sessionStorage-backed, no backend.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { reminderStore, stepMinutes } from "@/components/reminders/reminderStore";

export interface ConversationTimeout { enabled: boolean; days: number; hours: number; minutes: number }
export const MIN_TIMEOUT_MIN = 5;
export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i);
export const DEFAULT_TIMEOUT: ConversationTimeout = { enabled: false, days: 0, hours: 0, minutes: 30 };

const KEY = "conversation_timeout_v2";
const SEEDED = "conversation_timeout_seeded_v2";
const map = loadMap<string, ConversationTimeout>(KEY);

/** Demo: "cskh" has values from before but is switched off (state b). */
function seed(agentId: string) {
  try {
    if (sessionStorage.getItem(`${SEEDED}:${agentId}`)) return;
    sessionStorage.setItem(`${SEEDED}:${agentId}`, "1");
  } catch { return; }
  if (agentId === "cskh" && !map.has(agentId)) {
    map.set(agentId, { enabled: false, days: 0, hours: 0, minutes: 25 });
    saveMap(KEY, map);
  }
}

export const conversationTimeoutStore = {
  get(agentId: string): ConversationTimeout { seed(agentId); const v = map.get(agentId); return v ? { ...DEFAULT_TIMEOUT, ...v } : DEFAULT_TIMEOUT; },
  /** Whether the Builder ever saved a value (state b: off but keeps the old value). */
  hasSaved(agentId: string): boolean { seed(agentId); return map.has(agentId); },
  save(agentId: string, v: ConversationTimeout) { map.set(agentId, v); saveMap(KEY, map); },
};

export const timeoutMinutes = (v: Pick<ConversationTimeout, "days" | "hours" | "minutes">) => (v.days || 0) * 1440 + v.hours * 60 + v.minutes;
/** "00:30", "1 ngày 02:30". */
export const hhmm = (min: number) => {
  const d = Math.floor(min / 1440), rest = min % 1440;
  const t = `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`;
  return d ? `${d} ngày ${t}` : t;
};

export interface TimelineStep { key: string; minutes: number; reminderName: string; step: number; blocked: boolean }
/** Steps of every enabled reminder, ordered by time; blocked = at or after the timeout. */
export function reminderSteps(agentId: string, timeoutMin?: number): TimelineStep[] {
  return reminderStore.list(agentId)
    .filter(r => r.enabled)
    .flatMap(r => r.steps.map((s, i) => ({
      key: s.id, minutes: stepMinutes(s), reminderName: r.name, step: i + 1,
      blocked: timeoutMin !== undefined && stepMinutes(s) >= timeoutMin,
    })))
    .sort((a, b) => a.minutes - b.minutes);
}

export function validateTimeout(v: ConversationTimeout): { duration?: string } {
  if (!v.enabled) return {};
  return { duration: timeoutMinutes(v) < MIN_TIMEOUT_MIN ? "Thời gian chờ tối thiểu là 5 phút." : undefined };
}
