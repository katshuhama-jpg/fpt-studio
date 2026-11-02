import { useEffect, useState } from "react";
import { getAllTenants, getCurrentTenantId, subscribeTenantChange, TENANTS, type Tenant } from "@/lib/spaceStore";
import { currentPersona } from "@/lib/demoPersona";
import { notificationStore, REVIEWERS } from "@/components/notifications/notificationStore";
import { auditLogStore, type AuditAction } from "@/components/governance/auditLogStore";

/**
 * Hạn mức sử dụng (Usage & Quota) - spec: claude/SPEC_HanMuc_SuDung.md (02/11/2026).
 *
 * - Credit gói tính cho cả Space, làm mới theo kỳ tháng (BR-01). Kỳ demo bắt đầu ngày 19 hằng tháng.
 * - Credit mua thêm có hạn 12 tháng, trừ sau credit gói (BR-02). Hết cả hai -> Nhân sự số dừng ngay (BR-03).
 * - Cảnh báo 80%, 95% và khi dự kiến hết trong <= 7 ngày, qua banner + chuông (BR-05, BR-06).
 * - Phase 1 mua thêm = gửi yêu cầu, Sales liên hệ và kích hoạt thủ công (BR-09).
 *
 * Prototype: không có backend đo đếm thật. Mức dùng đến từ "kịch bản demo" chọn ở cuối tab Hạn mức sử dụng,
 * lưu theo Space trong sessionStorage.
 */

export type CreditScenario = "normal" | "warn80" | "forecast" | "warn95" | "exhausted";
export type StorageScenario = "normal" | "near" | "full";
export type UsageLevel = "ok" | "topup" | "warn80" | "forecast" | "warn95" | "exhausted";

export const CREDIT_PRICE = 160;
export const CREDIT_STEP = 10_000;
export const DEFAULT_FALLBACK = "Hệ thống đang tạm gián đoạn. Vui lòng liên hệ lại sau hoặc gọi hotline của chúng tôi.";
export const FALLBACK_MAX = 300;

export interface TopUpLot { id: string; credits: number; remaining: number; activatedAt: number; expiresAt: number }
export interface PurchaseRequest {
  id: string;
  kind: "credit" | "storage";
  /** credit: số credit · storage: số GB */
  amount: number;
  note: string;
  contactName: string;
  contactPhone: string;
  status: "pending" | "activated" | "cancelled";
  createdAt: number;
  createdBy: string;
  handledAt?: number;
}

interface SpaceUsageState {
  credit: CreditScenario;
  storage: StorageScenario;
  lots: TopUpLot[];
  extraStorageGB: number;
  requests: PurchaseRequest[];
  fallback: string;
  /** Mốc đã báo trong kỳ: "<periodKey>:<level>" */
  notified: string[];
  /** Banner đã ẩn: level -> thời điểm ẩn (ẩn 24 giờ) */
  dismissed: Record<string, number>;
  /** Trần chạy thử theo người dùng Console (Test run, Refine với AI, chạy bộ test ở Evaluate). null = không giới hạn */
  buildCapDefault: number | null;
  /** Trần riêng: số = trần riêng, null = không giới hạn, thiếu = theo mặc định */
  buildCaps: Record<string, number | null>;
  /** Phần trần được Admin duyệt thêm trong kỳ: "<periodKey>:<memberId>" -> credit */
  buildBonus: Record<string, number>;
  /** Credit chạy thử phát sinh thêm trong prototype (mỗi lần gửi) */
  buildExtra: Record<string, number>;
  capRequests: CapRequest[];
}

export interface CapRequest {
  id: string;
  memberId: string;
  memberName: string;
  amount: number | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  decidedAmount?: number;
  rejectReason?: string;
  decidedBy?: string;
}

/* ---------------- Plan quotas ---------------- */

export interface PlanQuota {
  credit: number;
  /** null = không mua thêm được (Free) */
  canBuy: boolean;
  /** Enterprise mua thêm theo hợp đồng qua Account Manager */
  viaContract: boolean;
  storageGB: number;
  storageNote: string;
  usersIncluded: number | null;
  usersActive: number;
}

export function planQuota(plan: string): PlanQuota {
  switch (plan) {
    case "Free": return { credit: 300, canBuy: false, viaContract: false, storageGB: 1, storageNote: "1 GB cho cả Space", usersIncluded: 1, usersActive: 1 };
    case "Team": return { credit: 55_000, canBuy: true, viaContract: false, storageGB: 75, storageNote: "3 GB × 25 người dùng", usersIncluded: 25, usersActive: 18 };
    case "Enterprise": return { credit: 1_500_000, canBuy: true, viaContract: true, storageGB: 2_000, storageNote: "Theo hợp đồng", usersIncluded: null, usersActive: 1_240 };
    default: return { credit: 220_000, canBuy: true, viaContract: false, storageGB: 500, storageNote: "5 GB × 100 người dùng", usersIncluded: 100, usersActive: 64 };
  }
}

/* ---------------- Demo members (credit theo member) ---------------- */

/** Credit chạy thử (Console) trong kỳ - demo cố định, Mai Hoang đã chạm trần mặc định 10.000 */
const BUILD_USED: Record<string, number> = {
  "m-fsoft-ceo": 6_200, "m-plat-1": 10_000, "m-kt": 8_400, "m-hl": 2_300, "m-bp": 3_600,
  "m-fsoft-coo": 900, "m-na": 1_500, "m-dq": 700, "m-plat-7": 400,
};

const MEMBER_SHARES: { id: string; name: string; initials: string; agents: number; share: number }[] = [
  { id: "m-fsoft-ceo", name: "Tran Nam", initials: "TN", agents: 5, share: 0.22 },
  { id: "m-plat-1", name: "Mai Hoang", initials: "MH", agents: 4, share: 0.18 },
  { id: "m-kt", name: "Khoa Tran", initials: "KT", agents: 3, share: 0.15 },
  { id: "m-hl", name: "Hoa Le", initials: "HL", agents: 2, share: 0.12 },
  { id: "m-bp", name: "Bao Pham", initials: "BP", agents: 3, share: 0.1 },
  { id: "m-fsoft-coo", name: "Linh Phan", initials: "LP", agents: 1, share: 0.09 },
  { id: "m-na", name: "Ngoc Anh Vu", initials: "NA", agents: 2, share: 0.07 },
  { id: "m-dq", name: "Duc Quang", initials: "DQ", agents: 1, share: 0.05 },
  { id: "m-plat-7", name: "Kim Chi", initials: "KC", agents: 0, share: 0.02 },
];

/* ---------------- Persistence ---------------- */

const KEY = "usage_state_v1";
export const USAGE_EVT = "usage-changed";
type StateMap = Record<string, SpaceUsageState>;

function load(): StateMap {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as StateMap; } catch { return {}; }
}
let map: StateMap = load();
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(USAGE_EVT)); } catch { /* ssr */ }
}

function defaultState(): SpaceUsageState {
  return {
    credit: "forecast", storage: "normal", lots: [], extraStorageGB: 0, requests: [], fallback: DEFAULT_FALLBACK, notified: [], dismissed: {},
    buildCapDefault: 10_000, buildCaps: {}, buildBonus: {}, buildExtra: {}, capRequests: [],
  };
}
function stateOf(tenantId: string): SpaceUsageState {
  if (!map[tenantId]) map[tenantId] = defaultState();
  const d = defaultState();
  // Dữ liệu demo cũ trong phiên chưa có các trường mới
  for (const k of Object.keys(d) as (keyof SpaceUsageState)[]) if (map[tenantId][k] === undefined) (map[tenantId] as any)[k] = d[k];
  return map[tenantId];
}
function tenantOf(id: string): Tenant {
  return getAllTenants().find(t => t.id === id) ?? TENANTS[0];
}

/* ---------------- Period ---------------- */

const DAY = 86_400_000;
const PERIOD_DAY = 19;
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

export function currentPeriod(now = new Date()) {
  const today = startOfDay(now);
  let start = new Date(today.getFullYear(), today.getMonth(), PERIOD_DAY);
  if (start > today) start = new Date(today.getFullYear(), today.getMonth() - 1, PERIOD_DAY);
  const renew = new Date(start.getFullYear(), start.getMonth() + 1, PERIOD_DAY);
  const end = new Date(renew.getTime() - DAY);
  const elapsedDays = Math.round((today.getTime() - start.getTime()) / DAY) + 1;
  const daysToRenew = Math.round((renew.getTime() - today.getTime()) / DAY);
  return { start, end, renew, today, elapsedDays, daysToRenew, key: start.toISOString().slice(0, 10) };
}

export const fmtDate = (d: Date | number) => {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
};
export const fmtDateFull = (d: Date | number) => `${fmtDate(d)}/${new Date(d).getFullYear()}`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString("vi-VN");
/** GB: dưới 10 GB hiện 1 chữ số thập phân (0,6 GB), từ 10 GB làm tròn. */
export const fmtGB = (n: number) => n < 10 ? n.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) : fmtNum(n);

/* ---------------- Snapshot ---------------- */

const SCENARIO_PCT: Record<CreditScenario, number> = { normal: 0.41, warn80: 0.81, forecast: 0.87, warn95: 0.96, exhausted: 1 };
const STORAGE_PCT: Record<StorageScenario, number> = { normal: 0.62, near: 0.86, full: 0 };

export interface UsageSnapshot {
  tenant: Tenant;
  plan: string;
  quota: PlanQuota;
  period: ReturnType<typeof currentPeriod>;
  planUsed: number;
  planRemaining: number;
  pct: number;
  lots: TopUpLot[];
  lotsRemaining: number;
  nearestLotExpiry: number | null;
  available: number;
  avg7: number;
  forecastDate: Date | null;
  level: UsageLevel;
  exhausted: boolean;
  daily: { date: Date; used: number; forecast: boolean }[];
  members: { id: string; name: string; initials: string; agents: number; used: number; share: number; build: BuildStatus }[];
  buildCapDefault: number | null;
  capRequests: CapRequest[];
  storage: { totalGB: number; usedGB: number; remainingBytes: number; pct: number; note: string; full: boolean; near: boolean };
  requests: PurchaseRequest[];
  pendingCredit: PurchaseRequest | null;
  pendingStorage: PurchaseRequest | null;
  fallback: string;
  scenario: { credit: CreditScenario; storage: StorageScenario };
  dismissed: Record<string, number>;
}

export function getUsage(tenantId = getCurrentTenantId()): UsageSnapshot {
  const st = stateOf(tenantId);
  const tenant = tenantOf(tenantId);
  const quota = planQuota(tenant.plan);
  const period = currentPeriod();
  const pct = SCENARIO_PCT[st.credit];
  const planUsed = Math.round(quota.credit * pct);
  const planRemaining = Math.max(0, quota.credit - planUsed);
  const now = Date.now();
  const lots = st.lots.filter(l => l.expiresAt > now && l.remaining > 0).sort((a, b) => a.expiresAt - b.expiresAt);
  const lotsRemaining = lots.reduce((s, l) => s + l.remaining, 0);
  const available = planRemaining + lotsRemaining;

  // Mức dùng trung bình 7 ngày gần nhất - chọn theo kịch bản để ngày dự kiến hết rơi đúng chỗ cần demo.
  const toRenew = Math.max(1, period.daysToRenew);
  const avg7 = (() => {
    switch (st.credit) {
      case "normal": return Math.max(1, (quota.credit - planUsed) / (toRenew + 12));
      case "warn80": return Math.max(1, planRemaining / (toRenew + 3));
      case "forecast": return Math.max(1, planRemaining / Math.min(5, Math.max(1, toRenew - 1)));
      case "warn95": return Math.max(1, planRemaining / Math.min(2, toRenew));
      default: return quota.credit * 0.045;
    }
  })();
  const daysLeft = available > 0 ? Math.floor(available / avg7) : 0;
  const forecastDate = available > 0 ? new Date(period.today.getTime() + daysLeft * DAY) : null;
  const forecastBeforeRenew = !!forecastDate && forecastDate < period.renew;

  const exhausted = available <= 0;
  const level: UsageLevel = exhausted ? "exhausted"
    : planRemaining <= 0 && lotsRemaining > 0 ? "topup"
    : pct >= 0.95 ? "warn95"
    : forecastBeforeRenew && daysLeft <= 7 ? "forecast"
    : pct >= 0.8 ? "warn80"
    : "ok";

  // Credit theo ngày: hình dáng cố định, scale đúng bằng planUsed.
  const shape = Array.from({ length: period.elapsedDays }, (_, i) => 0.6 + 0.4 * Math.sin(i * 1.3) ** 2 + i * 0.03);
  const shapeSum = shape.reduce((a, b) => a + b, 0) || 1;
  const daily: UsageSnapshot["daily"] = shape.map((v, i) => ({ date: new Date(period.start.getTime() + i * DAY), used: (v / shapeSum) * planUsed, forecast: false }));
  let left = available;
  for (let i = 1; i < toRenew; i++) {
    const used = Math.min(avg7, Math.max(0, left));
    left -= used;
    daily.push({ date: new Date(period.today.getTime() + i * DAY), used, forecast: true });
  }

  const members = MEMBER_SHARES.map(m => ({ ...m, used: Math.round(planUsed * m.share), build: buildStatusOf(tenantId, m.id) }));

  const totalGB = quota.storageGB + st.extraStorageGB;
  const usedGB = st.storage === "full" ? totalGB : totalGB * STORAGE_PCT[st.storage];
  const storagePct = totalGB ? usedGB / totalGB : 0;

  const requests = [...st.requests].sort((a, b) => b.createdAt - a.createdAt);
  return {
    tenant, plan: tenant.plan, quota, period, planUsed, planRemaining, pct, lots, lotsRemaining,
    nearestLotExpiry: lots[0]?.expiresAt ?? null, available, avg7, forecastDate, level, exhausted, daily, members,
    storage: {
      totalGB, usedGB, remainingBytes: Math.max(0, (totalGB - usedGB) * 1024 ** 3), pct: storagePct, note: quota.storageNote,
      full: st.storage === "full", near: storagePct >= 0.8,
    },
    requests,
    pendingCredit: requests.find(r => r.kind === "credit" && r.status === "pending") ?? null,
    pendingStorage: requests.find(r => r.kind === "storage" && r.status === "pending") ?? null,
    fallback: st.fallback || DEFAULT_FALLBACK,
    buildCapDefault: st.buildCapDefault,
    capRequests: [...st.capRequests].sort((a, b) => b.createdAt - a.createdAt),
    scenario: { credit: st.credit, storage: st.storage },
    dismissed: st.dismissed,
  };
}

/** Dùng ở nơi không phải component (vd Test run trong Agent Builder). */
export function isCreditExhausted(tenantId = getCurrentTenantId()) {
  return getUsage(tenantId).exhausted;
}

/* ---------------- Trần chạy thử theo người dùng Console ---------------- */

export interface BuildStatus {
  used: number;
  /** null = không giới hạn */
  cap: number | null;
  /** Trần đến từ mặc định hay đặt riêng */
  custom: boolean;
  bonus: number;
  pct: number;
  near: boolean;
  blocked: boolean;
  pending: CapRequest | null;
}

export function buildStatusOf(tenantId: string, memberId: string): BuildStatus {
  const st = stateOf(tenantId);
  const period = currentPeriod();
  const used = (BUILD_USED[memberId] ?? 0) + (st.buildExtra[memberId] ?? 0);
  const custom = Object.prototype.hasOwnProperty.call(st.buildCaps, memberId);
  const base = custom ? st.buildCaps[memberId] : st.buildCapDefault;
  const bonus = st.buildBonus[`${period.key}:${memberId}`] ?? 0;
  const cap = base === null || base === undefined ? null : base + bonus;
  const pct = cap ? used / cap : 0;
  return {
    used, cap, custom, bonus, pct, near: !!cap && pct >= 0.8, blocked: !!cap && used >= cap,
    pending: st.capRequests.find(r => r.memberId === memberId && r.status === "pending") ?? null,
  };
}

/** Người đang đăng nhập có chạy thử được không (dùng ở Test run, Refine với AI, Evaluate). */
export function isBuildBlocked(tenantId = getCurrentTenantId()) {
  return buildStatusOf(tenantId, currentPersona().id).blocked;
}

/* ---------------- Notifications (BR-05: mỗi mốc 1 lần mỗi kỳ, gửi Admin) ---------------- */

const LEVEL_TEXT: Partial<Record<UsageLevel, (u: UsageSnapshot) => string>> = {
  warn80: () => "Space đã dùng 80% credit tháng này",
  forecast: u => `Space dự kiến hết credit vào ${u.forecastDate ? fmtDate(u.forecastDate) : ""}`,
  warn95: () => "Space đã dùng 95% credit tháng này",
  exhausted: () => "Space đã hết credit. Nhân sự số đang tạm dừng trên mọi kênh",
};

export function syncUsageNotifications(tenantId = getCurrentTenantId()) {
  const u = getUsage(tenantId);
  const st = stateOf(tenantId);
  let changed = false;
  const notify = (key: string, kind: "usage_alert" | "usage_exhausted" | "usage_storage_alert", title: string) => {
    const k = `${u.period.key}:${key}`;
    const resourceId = `usage:${tenantId}:${k}`;
    // Đã báo trong kỳ thì thôi - trừ khi bản seed thông báo của prototype vừa xóa mất nó.
    if (st.notified.includes(k) && notificationStore.some(n => n.resourceId === resourceId)) return;
    if (!st.notified.includes(k)) { st.notified.push(k); changed = true; }
    notificationStore.push({
      kind, recipients: [REVIEWERS], actorId: "system", actorName: "FPT AI EOS", title, resourceId,
      segments: [[title]], href: "/plans?tab=usage",
    });
  };
  const text = LEVEL_TEXT[u.level];
  if (text) notify(u.level, u.level === "exhausted" ? "usage_exhausted" : "usage_alert", text(u));
  if (u.storage.near) notify(u.storage.full ? "storage-full" : "storage-80", "usage_storage_alert",
    u.storage.full ? "Dung lượng knowledge đã đầy. Không tải thêm tài liệu được" : "Dung lượng knowledge đã dùng 80%");
  // Trần chạy thử: báo riêng từng người khi dùng 80% và khi chạm trần (mỗi mốc 1 lần mỗi kỳ)
  for (const m of u.members) {
    const lvl = m.build.blocked ? "cap100" : m.build.near ? "cap80" : null;
    if (!lvl || !m.build.cap) continue;
    const k = `${u.period.key}:${lvl}:${m.id}`;
    const resourceId = `usage:${tenantId}:${k}`;
    if (st.notified.includes(k) && notificationStore.some(n => n.resourceId === resourceId)) continue;
    if (!st.notified.includes(k)) { st.notified.push(k); changed = true; }
    const title = lvl === "cap100" ? `Bạn đã dùng hết hạn mức chạy thử tháng này (${fmtNum(m.build.cap)} credit)` : `Bạn đã dùng 80% hạn mức chạy thử tháng này`;
    notificationStore.push({ kind: "usage_alert", recipients: [m.id], actorId: "system", actorName: "FPT AI EOS", title, segments: [[title]], resourceId, href: "/plans?tab=usage" });
  }
  if (changed) save();
}

/* ---------------- Audit Log ---------------- */

const reqDetail = (r: Pick<PurchaseRequest, "kind" | "amount">) => r.kind === "credit" ? `${fmtNum(r.amount)} credit` : `${fmtNum(r.amount)} GB dung lượng`;
function audit(action: AuditAction, tenantId: string, detail?: string, note?: string, actor?: { id: string; name: string }) {
  const p = actor ?? { id: currentPersona().id, name: currentPersona().name };
  auditLogStore.log({
    at: Date.now(), actorId: p.id, actorName: p.name, action, resourceType: "usage",
    resourceId: tenantId, resourceName: `Gói và hạn mức - ${tenantOf(tenantId).name}`, detail, note,
  });
}

/* ---------------- Actions ---------------- */

export const usageStore = {
  setBuildCapDefault(cap: number | null, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    st.buildCapDefault = cap;
    audit("usage_cap_changed", tenantId, `Trần chạy thử mặc định: ${cap === null ? "Không giới hạn" : `${fmtNum(cap)} credit`}`);
    save();
  },
  /** cap: số = trần riêng, null = không giới hạn, undefined = theo mặc định */
  setBuildCap(memberId: string, memberName: string, cap: number | null | undefined, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    if (cap === undefined) delete st.buildCaps[memberId]; else st.buildCaps[memberId] = cap;
    audit("usage_cap_changed", tenantId, `Trần chạy thử của ${memberName}: ${cap === undefined ? "Theo mặc định" : cap === null ? "Không giới hạn" : `${fmtNum(cap)} credit`}`);
    save();
  },
  /** Demo: mỗi lần chạy thử tốn thêm credit của người đang đăng nhập. */
  addBuildUsage(credits: number, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    const id = currentPersona().id;
    st.buildExtra[id] = (st.buildExtra[id] ?? 0) + credits;
    save();
  },
  requestBuildCap(amount: number | null, reason: string, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    const p = currentPersona();
    if (st.capRequests.some(r => r.memberId === p.id && r.status === "pending")) return;
    const req: CapRequest = { id: `cap-${Date.now().toString(36)}`, memberId: p.id, memberName: p.name, amount, reason, status: "pending", createdAt: Date.now() };
    st.capRequests.push(req);
    const title = `${p.name} xin thêm hạn mức chạy thử${amount ? ` ${fmtNum(amount)} credit` : ""}`;
    notificationStore.push({
      kind: "usage_cap_request", recipients: [REVIEWERS], actorId: p.id, actorName: p.name, title,
      segments: [[p.name, true], [` xin thêm hạn mức chạy thử${amount ? ` ${fmtNum(amount)} credit` : ""}`]], note: reason, href: "/plans?tab=usage",
    });
    save();
  },
  decideBuildCap(id: string, approve: boolean, opts: { amount?: number; reason?: string } = {}, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    const r = st.capRequests.find(x => x.id === id);
    if (!r || r.status !== "pending") return;
    const p = currentPersona();
    r.decidedBy = p.name;
    if (approve) {
      const amount = opts.amount ?? r.amount ?? 0;
      r.status = "approved"; r.decidedAmount = amount;
      const k = `${currentPeriod().key}:${r.memberId}`;
      st.buildBonus[k] = (st.buildBonus[k] ?? 0) + amount;
      audit("usage_cap_request_approved", tenantId, `${r.memberName} · thêm ${fmtNum(amount)} credit chạy thử`);
      const title = `${p.name} đã duyệt thêm ${fmtNum(amount)} credit chạy thử cho bạn`;
      notificationStore.push({ kind: "usage_cap_approved", recipients: [r.memberId], actorId: p.id, actorName: p.name, title, segments: [[p.name, true], [` đã duyệt thêm ${fmtNum(amount)} credit chạy thử cho bạn`]], href: "/plans?tab=usage" });
    } else {
      r.status = "rejected"; r.rejectReason = opts.reason;
      audit("usage_cap_request_rejected", tenantId, `${r.memberName}`, opts.reason);
      const title = `${p.name} đã từ chối yêu cầu xin thêm hạn mức chạy thử`;
      notificationStore.push({ kind: "usage_cap_rejected", recipients: [r.memberId], actorId: p.id, actorName: p.name, title, segments: [[p.name, true], [" đã từ chối yêu cầu xin thêm hạn mức chạy thử"]], note: opts.reason, href: "/plans?tab=usage" });
    }
    save();
  },
  setScenario(patch: Partial<{ credit: CreditScenario; storage: StorageScenario }>, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    if (patch.credit) { st.credit = patch.credit; st.notified = st.notified.filter(k => k.includes("storage") || k.includes(":cap")); st.dismissed = {}; }
    if (patch.storage) { st.storage = patch.storage; st.notified = st.notified.filter(k => !k.includes("storage")); }
    save();
  },
  /** Demo: đưa Space về trạng thái ban đầu (xóa yêu cầu, credit mua thêm). */
  reset(tenantId = getCurrentTenantId()) {
    map[tenantId] = defaultState();
    save();
  },
  setFallback(text: string, tenantId = getCurrentTenantId()) {
    stateOf(tenantId).fallback = text.trim();
    audit("usage_fallback_changed", tenantId, undefined, text.trim() || DEFAULT_FALLBACK);
    save();
  },
  dismiss(level: string, tenantId = getCurrentTenantId()) {
    stateOf(tenantId).dismissed[level] = Date.now();
    save();
  },
  submitRequest(r: Pick<PurchaseRequest, "kind" | "amount" | "note" | "contactName" | "contactPhone">, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    const req: PurchaseRequest = { ...r, id: `req-${Date.now().toString(36)}`, status: "pending", createdAt: Date.now(), createdBy: currentPersona().id };
    st.requests.push(req);
    audit("usage_request_sent", tenantId, reqDetail(req), r.note || undefined);
    save();
    return req;
  },
  cancelRequest(id: string, tenantId = getCurrentTenantId()) {
    const r = stateOf(tenantId).requests.find(x => x.id === id);
    if (!r || r.status !== "pending") return;
    r.status = "cancelled"; r.handledAt = Date.now();
    audit("usage_request_cancelled", tenantId, reqDetail(r));
    save();
  },
  /** Demo: giả lập Sales kích hoạt yêu cầu (phase 1 làm thủ công ngoài sản phẩm). */
  activateRequest(id: string, tenantId = getCurrentTenantId()) {
    const st = stateOf(tenantId);
    const r = st.requests.find(x => x.id === id);
    if (!r || r.status !== "pending") return;
    r.status = "activated"; r.handledAt = Date.now();
    if (r.kind === "credit") {
      const now = Date.now();
      const exp = new Date(now); exp.setFullYear(exp.getFullYear() + 1);
      st.lots.push({ id: `lot-${now.toString(36)}`, credits: r.amount, remaining: r.amount, activatedAt: now, expiresAt: exp.getTime() });
    } else {
      st.extraStorageGB += r.amount;
      if (st.storage === "full") st.storage = "near";
    }
    st.dismissed = {};
    audit("usage_request_activated", tenantId, reqDetail(r), undefined, { id: "sales", name: "FPT AI Sales" });
    const title = r.kind === "credit"
      ? `Đã kích hoạt ${fmtNum(r.amount)} credit mua thêm cho Space`
      : `Đã nâng thêm ${fmtNum(r.amount)} GB dung lượng knowledge cho Space`;
    notificationStore.push({
      kind: "usage_request_activated", recipients: [REVIEWERS, r.createdBy], actorId: "sales", actorName: "FPT AI Sales",
      title, segments: [[title]], href: "/plans?tab=usage",
    });
    save();
  },
};

/* ---------------- Hook ---------------- */

export function useUsage(): UsageSnapshot {
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener(USAGE_EVT, on);
    const off = subscribeTenantChange(on);
    // Seed thông báo của prototype có thể ghi đè danh sách - kiểm tra lại để không mất cảnh báo hạn mức.
    const onNotif = () => syncUsageNotifications();
    window.addEventListener(notificationStore.EVT, onNotif);
    // Ngày dự kiến hết đổi theo ngày - không cần cập nhật theo giây trong prototype.
    return () => { window.removeEventListener(USAGE_EVT, on); window.removeEventListener(notificationStore.EVT, onNotif); off(); };
  }, []);
  const u = getUsage();
  const capKey = u.members.map(m => `${m.build.near ? 1 : 0}${m.build.blocked ? 1 : 0}`).join("");
  useEffect(() => { syncUsageNotifications(); }, [u.level, u.storage.near, u.storage.full, u.tenant.id, capKey]);
  return u;
}

/** Hạn mức chạy thử của người đang đăng nhập - cập nhật khi dữ liệu đổi. */
export function useBuildCap(): BuildStatus {
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener(USAGE_EVT, on);
    const off = subscribeTenantChange(on);
    return () => { window.removeEventListener(USAGE_EVT, on); off(); };
  }, []);
  return buildStatusOf(getCurrentTenantId(), currentPersona().id);
}
