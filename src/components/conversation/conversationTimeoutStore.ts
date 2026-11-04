// "Kết thúc hội thoại tự động" (Conversation timeout) — per Agent, saved to the draft
// (takes effect after Publish). sessionStorage-backed, no backend.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { reminderStore, stepMinutes } from "@/components/reminders/reminderStore";

export interface ConversationTimeout { enabled: boolean; hours: number; minutes: number; message: string }
export const MIN_TIMEOUT_MIN = 5;
export const MESSAGE_MAX = 500;
export const DEFAULT_TIMEOUT: ConversationTimeout = { enabled: false, hours: 0, minutes: 30, message: "" };

const KEY = "conversation_timeout_v1";
const SEEDED = "conversation_timeout_seeded_v1";
const map = loadMap<string, ConversationTimeout>(KEY);

/** Demo: "cskh" has values from before but is switched off (state b). */
function seed(agentId: string) {
  try {
    if (sessionStorage.getItem(`${SEEDED}:${agentId}`)) return;
    sessionStorage.setItem(`${SEEDED}:${agentId}`, "1");
  } catch { return; }
  if (agentId === "cskh" && !map.has(agentId)) {
    map.set(agentId, { enabled: false, hours: 0, minutes: 25, message: "Cuộc trò chuyện đã kết thúc do lâu không có phản hồi. Anh/chị cứ nhắn tin bất cứ lúc nào để bắt đầu lại nhé!" });
    saveMap(KEY, map);
  }
}

export const conversationTimeoutStore = {
  get(agentId: string): ConversationTimeout { seed(agentId); return map.get(agentId) ?? DEFAULT_TIMEOUT; },
  save(agentId: string, v: ConversationTimeout) { map.set(agentId, v); saveMap(KEY, map); },
};

export const timeoutMinutes = (v: Pick<ConversationTimeout, "hours" | "minutes">) => v.hours * 60 + v.minutes;
export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

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

export function validateTimeout(v: ConversationTimeout): { duration?: string; message?: string } {
  if (!v.enabled) return {};
  return {
    duration: timeoutMinutes(v) < MIN_TIMEOUT_MIN ? "Thời gian chờ tối thiểu là 5 phút." : undefined,
    message: v.message.trim() ? undefined : "Vui lòng nhập tin nhắn kết thúc.",
  };
}
