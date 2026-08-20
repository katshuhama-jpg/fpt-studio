// In-memory trigger store for the Triggers feature prototype.
export type TriggerType = "manual" | "scheduled" | "developer" | "external";

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";
export type CustomScheduleUnit = "minute" | "hour" | "day" | "week" | "month" | "year" | "cron";
export type DeveloperMethod = "api" | "webhook" | "sdk";
export type ExternalApp = "gmail" | "slack" | "jira";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  timeOfDay?: string;               // "HH:mm"
  dayOfWeek?: number;                // 0-6, weekly only
  dayOfMonth?: number;               // 1-31, monthly only
  customUnit?: CustomScheduleUnit;   // frequency === "custom"
  cron?: string;                     // customUnit === "cron" only — lives under "Advanced schedule"
  timezone: string;
}

export interface DeveloperConfig {
  method: DeveloperMethod;
  webhookUrl?: string;    // method === "webhook", auto-generated
  secret?: string;        // method === "webhook", auto-generated
}

export interface ExternalConfig {
  app: ExternalApp;
  event: string;          // preset value from EXTERNAL_APP_EVENTS[app]
  conditions?: string;    // optional, revealed via progressive disclosure
}

export interface TriggerRecord {
  id: string;
  agentId: string;
  name: string;
  type: TriggerType;
  enabled: boolean;
  description: string;
  config: {
    schedule?: ScheduleConfig;
    developer?: DeveloperConfig;
    external?: ExternalConfig;
  };
  lastFiredAt: number | null;
  updatedAt: number;
  isDefault?: boolean;      // Manual is the seeded default
}

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "GMT+07:00", label: "GMT+07:00 — Vietnam, Bangkok, Jakarta" },
  { value: "GMT+08:00", label: "GMT+08:00 — Singapore, Hong Kong, Manila" },
  { value: "GMT+09:00", label: "GMT+09:00 — Tokyo, Seoul" },
  { value: "GMT+00:00", label: "GMT+00:00 — UTC" },
  { value: "GMT-05:00", label: "GMT-05:00 — US Eastern" },
  { value: "GMT-08:00", label: "GMT-08:00 — US Pacific" },
];

export const EXTERNAL_APP_EVENTS: Record<ExternalApp, { value: string; label: string }[]> = {
  gmail: [{ value: "new_email", label: "New email received" }],
  slack: [{ value: "new_message", label: "New message posted" }],
  jira: [
    { value: "issue_created", label: "Issue created" },
    { value: "issue_status_changed", label: "Issue status changed" },
  ],
};

const store = new Map<string, TriggerRecord>();
const k = (a: string, t: string) => `${a}:${t}`;

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();
  const seed: Omit<TriggerRecord, "agentId">[] = [
    {
      id: "manual-default",
      name: "Manual run",
      type: "manual",
      enabled: true,
      description: "User manually invokes the agent from the chat UI or API.",
      config: {},
      lastFiredAt: now - 120_000,
      updatedAt: now - 86_400_000 * 7,
      isDefault: true,
    },
    {
      id: "daily-report",
      name: "Daily report",
      type: "scheduled",
      enabled: true,
      description: "Run the agent every day at 08:00 to generate the daily report.",
      config: { schedule: { frequency: "daily", timeOfDay: "08:00", timezone: "GMT+07:00" } },
      lastFiredAt: now - 86_400_000,
      updatedAt: now - 86_400_000 * 14,
    },
    {
      id: "new-customer-email",
      name: "New customer email",
      type: "external",
      enabled: true,
      description: "Trigger the agent when a new customer email arrives in Gmail.",
      config: { external: { app: "gmail", event: "new_email" } },
      lastFiredAt: now - 86_400_000 * 2,
      updatedAt: now - 86_400_000 * 10,
    },
    {
      id: "order-created-webhook",
      name: "Order created",
      type: "developer",
      enabled: false,
      description: "External system pushes an order-created event to the agent.",
      config: {
        developer: {
          method: "webhook",
          webhookUrl: "https://api.tova.ai/agents/cskh/triggers/order-created-webhook",
          secret: "whsec_•••••••••",
        },
      },
      lastFiredAt: null,
      updatedAt: now - 86_400_000 * 3,
    },
  ];
  for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
}

export const triggerStore = {
  list(agentId: string): TriggerRecord[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(t => t.agentId === agentId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  },
  get(agentId: string, id: string) {
    seedAgent(agentId);
    return store.get(k(agentId, id));
  },
  isDuplicateName(agentId: string, name: string, excludeId?: string) {
    return this.list(agentId).some(
      t => t.name.trim().toLowerCase() === name.trim().toLowerCase() && t.id !== excludeId,
    );
  },
  create(agentId: string, data: Omit<TriggerRecord, "id" | "agentId" | "updatedAt" | "lastFiredAt">) {
    const id = `trg-${Date.now().toString(36)}`;
    const rec: TriggerRecord = {
      ...data,
      id,
      agentId,
      lastFiredAt: null,
      updatedAt: Date.now(),
    };
    store.set(k(agentId, id), rec);
    return rec;
  },
  update(agentId: string, id: string, patch: Partial<TriggerRecord>) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, ...patch, updatedAt: Date.now() });
  },
  toggle(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, enabled: !cur.enabled, updatedAt: Date.now() });
  },
  remove(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur || cur.isDefault) return;
    store.delete(k(agentId, id));
  },
};
