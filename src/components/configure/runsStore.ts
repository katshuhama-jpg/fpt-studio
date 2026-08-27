// In-memory trigger-execution-history store for the "Run history" tab prototype.
// A Console trigger belongs to the org-level Automation placement — one configuration,
// one timezone, no per-installer identity.
import { triggerStore, type TriggerType, type ExternalApp } from "./triggerStore";
import { agentPublishStore } from "./agentPublishStore";

export type RunStatus = "running" | "completed" | "failed";

export const ORG_TIMEZONE = "GMT+07:00";

export interface TriggerRun {
  id: string;
  agentId: string;
  triggerId: string;
  triggerName: string;
  triggerType: TriggerType;
  app?: ExternalApp;          // external runs only, drives the row icon
  source: string;             // "Schedule" | "Webhook" | "{App} — {Event}"
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
  // A trigger only fires once the agent is published — a Draft agent has never run, so
  // sample run history only makes sense once the agent actually has triggers AND is live.
  if (triggerStore.list(agentId).length === 0) return;
  if (!agentPublishStore.isPublished(agentId)) return;
  const now = Date.now();
  store.push(
    {
      id: "run-seed-1", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Schedule", status: "completed", startedAt: now - 3_600_000, timezone: ORG_TIMEZONE, durationMs: 4200,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      outputSummary: "Generated and sent the daily report to #reports.",
    },
    {
      id: "run-seed-2", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Schedule", status: "completed", startedAt: now - 4_500_000, timezone: ORG_TIMEZONE, durationMs: 3900,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      outputSummary: "Generated and sent the daily report to #reports.",
    },
    {
      id: "run-seed-3", agentId, triggerId: "new-customer-email", triggerName: "New customer email", triggerType: "external", app: "gmail",
      source: "Google Mail — New email received", status: "failed", startedAt: now - 7_200_000, timezone: ORG_TIMEZONE, durationMs: 1800,
      payload: JSON.stringify({ from: "customer@example.com", subject: "Question about order #482" }, null, 2),
      errorReason: "Could not authenticate with the Google Mail API — the access token has expired.",
    },
    {
      id: "run-seed-4", agentId, triggerId: "new-customer-email", triggerName: "New customer email", triggerType: "external", app: "gmail",
      source: "Google Mail — New email received", status: "completed", startedAt: now - 8_100_000, timezone: ORG_TIMEZONE, durationMs: 2300,
      payload: JSON.stringify({ from: "customer@example.jp", subject: "Order inquiry #219" }, null, 2),
      outputSummary: "Replied to the email and created support ticket #219.",
    },
    {
      id: "run-seed-5", agentId, triggerId: "new-customer-email", triggerName: "New customer email", triggerType: "external", app: "gmail",
      source: "Google Mail — New email received", status: "running", startedAt: now - 15_000, timezone: ORG_TIMEZONE,
      payload: JSON.stringify({ from: "lead@business.com", subject: "Requesting a quote" }, null, 2),
    },
    {
      id: "run-seed-11", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Schedule", status: "failed", startedAt: now - 18_000_000, timezone: ORG_TIMEZONE, durationMs: 600,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      errorReason: "Could not reach #reports — the bot has been removed from the channel.",
    },
    {
      id: "run-seed-12", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Schedule", status: "completed", startedAt: now - 19_800_000, timezone: ORG_TIMEZONE, durationMs: 4100,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      outputSummary: "Generated and sent the daily report to #reports.",
    },
    {
      id: "run-seed-13", agentId, triggerId: "daily-report", triggerName: "Daily report", triggerType: "scheduled",
      source: "Schedule", status: "failed", startedAt: now - 21_600_000, timezone: ORG_TIMEZONE, durationMs: 500,
      configSnapshot: JSON.stringify({ frequency: "daily", timeOfDay: "08:00", timezone: ORG_TIMEZONE }, null, 2),
      errorReason: "Hit the API rate limit for the reporting channel.",
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
