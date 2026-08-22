// In-memory trigger-execution-history store for the "Lịch sử chạy" tab prototype.
// This screen only exists for Automation Agents (R3/R6) — one org-level configuration,
// one timezone, no per-installer identity (a Console trigger has no installer at all).
import type { TriggerType, ExternalApp } from "./triggerStore";

export type RunStatus = "waiting" | "triggered" | "queued" | "running" | "completed" | "failed";

export const ORG_TIMEZONE = "GMT+07:00";

export interface TriggerRun {
  id: string;
  agentId: string;
  triggerId: string;
  triggerName: string;
  triggerType: TriggerType;
  app?: ExternalApp;          // external runs only, drives the row icon
  source: string;             // "Theo lịch" | "Webhook" | "{App} — {Event}"
  status: RunStatus;
  startedAt: number;
  timezone: string;           // the trigger's configured timezone, for display
  durationMs?: number;        // blank while waiting/queued/running
  payload?: string;           // pretty-printed JSON, Webhook/External runs only
  configSnapshot?: string;    // pretty-printed JSON of the trigger config used for this run
  outputSummary?: string;
  errorReason?: string;       // Failed runs only
}

const store: TriggerRun[] = [];
const seeded = new Set<string>();

function seedAgent(agentId: string) {
  if (seeded.has(agentId)) return;
  seeded.add(agentId);
  const now = Date.now();
  store.push(
    {
      id: "run-seed-1", agentId, triggerId: "daily-report", triggerName: "Báo cáo hằng ngày", triggerType: "scheduled",
      source: "Theo lịch", status: "completed", startedAt: now - 3_600_000, timezone: ORG_TIMEZONE, durationMs: 4200,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      outputSummary: "Đã tạo và gửi báo cáo ngày cho kênh #reports.",
    },
    {
      id: "run-seed-2", agentId, triggerId: "daily-report", triggerName: "Báo cáo hằng ngày", triggerType: "scheduled",
      source: "Theo lịch", status: "completed", startedAt: now - 4_500_000, timezone: ORG_TIMEZONE, durationMs: 3900,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      outputSummary: "Đã tạo và gửi báo cáo ngày cho kênh #reports.",
    },
    {
      id: "run-seed-3", agentId, triggerId: "new-customer-email", triggerName: "Email khách hàng mới", triggerType: "external", app: "gmail",
      source: "Google Mail — Email mới nhận được", status: "failed", startedAt: now - 7_200_000, timezone: ORG_TIMEZONE, durationMs: 1800,
      payload: JSON.stringify({ from: "khachhang@vidu.com", subject: "Hỏi về đơn hàng #482" }, null, 2),
      errorReason: "Không thể xác thực với Google Mail API — token truy cập đã hết hạn.",
    },
    {
      id: "run-seed-4", agentId, triggerId: "new-customer-email", triggerName: "Email khách hàng mới", triggerType: "external", app: "gmail",
      source: "Google Mail — Email mới nhận được", status: "completed", startedAt: now - 8_100_000, timezone: ORG_TIMEZONE, durationMs: 2300,
      payload: JSON.stringify({ from: "customer@example.jp", subject: "Order inquiry #219" }, null, 2),
      outputSummary: "Đã trả lời email và tạo ticket hỗ trợ #219.",
    },
    {
      id: "run-seed-5", agentId, triggerId: "new-customer-email", triggerName: "Email khách hàng mới", triggerType: "external", app: "gmail",
      source: "Google Mail — Email mới nhận được", status: "running", startedAt: now - 15_000, timezone: ORG_TIMEZONE,
      payload: JSON.stringify({ from: "lead@doanhnghiep.vn", subject: "Yêu cầu báo giá" }, null, 2),
    },
    {
      id: "run-seed-6", agentId, triggerId: "order-created-webhook", triggerName: "Đơn hàng được tạo", triggerType: "developer",
      source: "Webhook", status: "completed", startedAt: now - 10_800_000, timezone: ORG_TIMEZONE, durationMs: 2100,
      payload: JSON.stringify({ event: "order.created", order_id: "12345", customer_id: "789" }, null, 2),
      outputSummary: "Đã xử lý đơn hàng #12345 và cập nhật hệ thống kho.",
    },
    {
      id: "run-seed-7", agentId, triggerId: "order-created-webhook", triggerName: "Đơn hàng được tạo", triggerType: "developer",
      source: "Webhook", status: "failed", startedAt: now - 12_600_000, timezone: ORG_TIMEZONE, durationMs: 900,
      payload: JSON.stringify({ event: "order.created", order_id: "12346", customer_id: "790" }, null, 2),
      errorReason: "Webhook trả về lỗi 500 từ hệ thống kho hàng.",
    },
    {
      id: "run-seed-8", agentId, triggerId: "order-created-webhook", triggerName: "Đơn hàng được tạo", triggerType: "developer",
      source: "Webhook", status: "completed", startedAt: now - 14_400_000, timezone: ORG_TIMEZONE, durationMs: 1650,
      payload: JSON.stringify({ event: "order.created", order_id: "12347", customer_id: "791" }, null, 2),
      outputSummary: "Đã xử lý đơn hàng #12347 và cập nhật hệ thống kho.",
    },
    {
      id: "run-seed-9", agentId, triggerId: "order-created-webhook", triggerName: "Đơn hàng được tạo", triggerType: "developer",
      source: "Webhook", status: "running", startedAt: now - 30_000, timezone: ORG_TIMEZONE,
      payload: JSON.stringify({ event: "order.created", order_id: "12348", customer_id: "792" }, null, 2),
    },
    {
      id: "run-seed-10", agentId, triggerId: "order-created-webhook", triggerName: "Đơn hàng được tạo", triggerType: "developer",
      source: "Webhook", status: "completed", startedAt: now - 16_200_000, timezone: ORG_TIMEZONE, durationMs: 1980,
      payload: JSON.stringify({ event: "order.created", order_id: "12349", customer_id: "793" }, null, 2),
      outputSummary: "Đã xử lý đơn hàng #12349 và cập nhật hệ thống kho.",
    },
    {
      id: "run-seed-11", agentId, triggerId: "daily-report", triggerName: "Báo cáo hằng ngày", triggerType: "scheduled",
      source: "Theo lịch", status: "failed", startedAt: now - 18_000_000, timezone: ORG_TIMEZONE, durationMs: 600,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      errorReason: "Không thể kết nối tới kênh #reports — bot đã bị gỡ khỏi kênh.",
    },
    {
      id: "run-seed-12", agentId, triggerId: "daily-report", triggerName: "Báo cáo hằng ngày", triggerType: "scheduled",
      source: "Theo lịch", status: "completed", startedAt: now - 19_800_000, timezone: ORG_TIMEZONE, durationMs: 4100,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      outputSummary: "Đã tạo và gửi báo cáo ngày cho kênh #reports.",
    },
    {
      id: "run-seed-13", agentId, triggerId: "daily-report", triggerName: "Báo cáo hằng ngày", triggerType: "scheduled",
      source: "Theo lịch", status: "failed", startedAt: now - 21_600_000, timezone: ORG_TIMEZONE, durationMs: 500,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      errorReason: "Hết hạn mức gọi API của kênh báo cáo.",
    },
    {
      id: "run-seed-14", agentId, triggerId: "order-created-webhook", triggerName: "Đơn hàng được tạo", triggerType: "developer",
      source: "Webhook", status: "completed", startedAt: now - 23_400_000, timezone: ORG_TIMEZONE, durationMs: 2250,
      payload: JSON.stringify({ event: "order.created", order_id: "12350", customer_id: "794" }, null, 2),
      outputSummary: "Đã xử lý đơn hàng #12350 và cập nhật hệ thống kho.",
    },
  );
}

export const runsStore = {
  list(agentId: string): TriggerRun[] {
    seedAgent(agentId);
    return store.filter(r => r.agentId === agentId).sort((a, b) => b.startedAt - a.startedAt);
  },
  get(runId: string): TriggerRun | undefined {
    return store.find(r => r.id === runId);
  },
  retry(runId: string): TriggerRun | undefined {
    const orig = store.find(r => r.id === runId);
    if (!orig) return undefined;
    const clone: TriggerRun = {
      ...orig,
      id: `run-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      status: "running",
      startedAt: Date.now(),
      durationMs: undefined,
      errorReason: undefined,
    };
    store.unshift(clone);
    return clone;
  },
  complete(runId: string, status: "completed" | "failed", patch: Partial<TriggerRun> = {}) {
    const r = store.find(x => x.id === runId);
    if (!r) return;
    Object.assign(r, { status, durationMs: Date.now() - r.startedAt, ...patch });
  },
};
