// sessionStorage-backed per-KB Settings ("Cài đặt" tab): the global sync schedule and the
// four sync-option toggles. One record per Knowledge Base.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time: string; // "HH:mm", 15-minute steps
  daysOfWeek?: number[]; // 0=Sun..6=Sat, weekly only
  dayOfMonth?: number | "last"; // monthly only
}

export interface KnowledgeSettings {
  kbId: string;
  scheduleEnabled: boolean;
  /** Up to MAX_SCHEDULES independent schedules — e.g. a daily catch-up sync plus a heavier
   * weekend re-crawl. Kept as an array (rather than one ScheduleConfig) so a KB can run more
   * than one cadence at once; schedulesConflict()/findScheduleConflicts() below stop the user
   * from saving two schedules that would fire at the same moment. */
  schedules: ScheduleConfig[];
  syncExistingUrls: boolean;
  autoAddFromSitemap: boolean;
  autoDownloadAttachments: boolean;
  attachmentFolderId: string | null;
  createVersionOnSync: boolean;
}

const STORE_KEY = "knowledge_settings_store_v1";
const store = loadMap<string, KnowledgeSettings>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

export const MAX_SCHEDULES = 3;

const DEFAULT_SCHEDULE: ScheduleConfig = { frequency: "daily", time: "02:00" };

function defaults(kbId: string): KnowledgeSettings {
  return {
    kbId, scheduleEnabled: false, schedules: [DEFAULT_SCHEDULE],
    syncExistingUrls: true, autoAddFromSitemap: false,
    autoDownloadAttachments: false, attachmentFolderId: null,
    createVersionOnSync: true,
  };
}

export const knowledgeSettingsStore = {
  get(kbId: string): KnowledgeSettings {
    return store.get(kbId) ?? defaults(kbId);
  },
  update(kbId: string, patch: Partial<Omit<KnowledgeSettings, "kbId">>) {
    const cur = store.get(kbId) ?? defaults(kbId);
    const next = { ...cur, ...patch };
    store.set(kbId, next);
    persist();
    return next;
  },
};

/** Plain-language summary line shown under the schedule builder, e.g.
 * "Đồng bộ hàng ngày lúc 02:00 (GMT+7). Lần chạy kế tiếp: 04/09/2026 02:00." */
export function describeSchedule(s: ScheduleConfig): string {
  const freqLabel = s.frequency === "daily" ? "hàng ngày" : s.frequency === "weekly" ? "hàng tuần" : "hàng tháng";
  const next = nextRun(s);
  const nextLabel = next
    ? next.toLocaleDateString("vi-VN") + " " + next.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "—";
  return `Đồng bộ ${freqLabel} lúc ${s.time} (GMT+7). Lần chạy kế tiếp: ${nextLabel}.`;
}

/** Short cadence label for the "Cài đặt đồng bộ" toolbar button's state chip, e.g. "Hàng ngày 02:00". */
export function shortCadence(s: ScheduleConfig): string {
  const freqLabel = s.frequency === "daily" ? "Hàng ngày" : s.frequency === "weekly" ? "Hàng tuần" : "Hàng tháng";
  return `${freqLabel} ${s.time}`;
}

/** True if two schedules could fire at the same moment. Same time-of-day is required for any
 * conflict; beyond that: daily conflicts with anything at that time, weekly conflicts with another
 * weekly sharing a day, monthly conflicts with another monthly sharing a day-of-month. Weekly vs
 * monthly at the same time is not flagged — whether they actually collide depends on the calendar
 * for that month, so it can't be determined generically. */
export function schedulesConflict(a: ScheduleConfig, b: ScheduleConfig): boolean {
  if (a.time !== b.time) return false;
  if (a.frequency === "daily" || b.frequency === "daily") return true;
  if (a.frequency === "weekly" && b.frequency === "weekly") {
    const da = new Set(a.daysOfWeek ?? [1]);
    return (b.daysOfWeek ?? [1]).some(d => da.has(d));
  }
  if (a.frequency === "monthly" && b.frequency === "monthly") {
    return (a.dayOfMonth ?? 1) === (b.dayOfMonth ?? 1);
  }
  return false;
}

/** All conflicting index pairs within a schedule list, for the "Lịch đồng bộ" conflict banner. */
export function findScheduleConflicts(schedules: ScheduleConfig[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      if (schedulesConflict(schedules[i], schedules[j])) pairs.push([i, j]);
    }
  }
  return pairs;
}

/** Plain-language summary of every schedule in the list, one per line — used where a KB-level
 * "Theo lịch chung của kho" summary needs to show all active schedules, not just one. */
export function describeSchedules(list: ScheduleConfig[]): string {
  return list.map(describeSchedule).join("\n");
}

/** Short cadence label summarizing a whole schedule list for the toolbar chip, e.g.
 * "Hàng ngày 02:00" for one schedule, or "Hàng ngày 02:00 +1 lịch" when there are more. */
export function shortCadenceMulti(list: ScheduleConfig[]): string {
  if (list.length === 0) return "";
  const first = shortCadence(list[0]);
  return list.length > 1 ? `${first} +${list.length - 1} lịch` : first;
}

const DAY_MS = 86_400_000;

export function nextRun(s: ScheduleConfig): Date | null {
  const [h, m] = s.time.split(":").map(Number);
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(h, m, 0, 0);

  if (s.frequency === "daily") {
    if (candidate.getTime() <= now.getTime()) candidate.setTime(candidate.getTime() + DAY_MS);
    return candidate;
  }
  if (s.frequency === "weekly") {
    const days = (s.daysOfWeek ?? [1]).slice().sort();
    for (let i = 0; i < 8; i++) {
      const d = new Date(candidate.getTime() + i * DAY_MS);
      if (days.includes(d.getDay()) && d.getTime() > now.getTime() - 1) return d;
    }
    return candidate;
  }
  // monthly
  const dom = s.dayOfMonth === "last" ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : (s.dayOfMonth ?? 1);
  candidate.setDate(dom);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
    const domNext = s.dayOfMonth === "last" ? new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate() : (s.dayOfMonth ?? 1);
    candidate.setDate(domNext);
  }
  return candidate;
}
