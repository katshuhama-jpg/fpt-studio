// In-memory trigger-execution-history store for the "Lịch sử chạy" tab prototype.
import type { TriggerType, ExternalApp } from "./triggerStore";

export type RunStatus = "waiting" | "triggered" | "queued" | "running" | "completed" | "failed";

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
      id: "run-seed-1", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Theo lịch", status: "completed", startedAt: now - 3_600_000, timezone: "GMT+07:00", durationMs: 4200,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: "GMT+07:00" }, null, 2),
      outputSummary: "Đã tạo và gửi báo cáo ngày cho kênh #reports.",
    },
    {
      id: "run-seed-2", agentId, triggerId: "new-customer-email", triggerName: "New customer email", triggerType: "external", app: "gmail",
      source: "Google Mail — Email mới nhận được", status: "failed", startedAt: now - 7_200_000, timezone: "GMT+07:00", durationMs: 1800,
      payload: JSON.stringify({ from: "khachhang@vidu.com", subject: "Hỏi về đơn hàng #482" }, null, 2),
      errorReason: "Không thể xác thực với Google Mail API — token truy cập đã hết hạn.",
    },
    {
      id: "run-seed-3", agentId, triggerId: "order-created-webhook", triggerName: "Order created", triggerType: "developer",
      source: "Webhook", status: "completed", startedAt: now - 10_800_000, timezone: "GMT+07:00", durationMs: 2100,
      payload: JSON.stringify({ event: "order.created", order_id: "12345", customer_id: "789" }, null, 2),
      outputSummary: "Đã xử lý đơn hàng #12345 và cập nhật hệ thống kho.",
    },
    {
      id: "run-seed-4", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Theo lịch", status: "running", startedAt: now - 20_000, timezone: "GMT+07:00",
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
