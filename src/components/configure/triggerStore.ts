// In-memory trigger store for the Triggers feature prototype.
export type TriggerType = "manual" | "scheduled" | "developer" | "external";

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";
export type CustomScheduleUnit = "minute" | "hour" | "day" | "week" | "month" | "year" | "cron";
export type DeveloperMethod = "api" | "webhook" | "sdk";
export type ExternalApp =
  | "gmail" | "gcalendar" | "gdrive" | "slack" | "teams" | "outlook" | "salesforce" | "hubspot" | "jira" | "zoom";

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
  /** Set once at creation, never touched again — the list's sort key, so toggling
   * or editing a trigger never reorders the grid (only updatedAt reflects those). */
  createdAt: number;
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

/** Ordered list driving the app picker grid — extend here to add a new app. */
export const EXTERNAL_APP_ORDER: ExternalApp[] = [
  "gmail", "gcalendar", "gdrive", "slack", "teams", "outlook", "salesforce", "hubspot", "jira", "zoom",
];

/**
 * Real brand logos, sourced from Wikimedia Commons and verified to resolve (not guessed).
 * Rendered via AppLogo.tsx — same "real logo via <img>" convention already used for
 * connector logos in WorkspaceConnectors.tsx.
 */
export const EXTERNAL_APP_META: Record<ExternalApp, { label: string; logoUrl: string }> = {
  gmail: { label: "Gmail", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" },
  gcalendar: { label: "Google Calendar", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" },
  gdrive: { label: "Google Drive", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" },
  slack: { label: "Slack", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
  teams: { label: "Microsoft Teams", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/94/Microsoft_Office_Teams_%282019%E2%80%932025%29.svg" },
  outlook: { label: "Microsoft Outlook", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/45/Microsoft_Office_Outlook_%282018%E2%80%932024%29.svg" },
  salesforce: { label: "Salesforce", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg" },
  hubspot: { label: "HubSpot", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg" },
  jira: { label: "Jira", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg" },
  zoom: { label: "Zoom", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/11/Zoom_Logo_2022.svg" },
};

export const EXTERNAL_APP_EVENTS: Record<ExternalApp, { value: string; label: string }[]> = {
  gmail: [{ value: "new_email", label: "New email received" }],
  gcalendar: [
    { value: "event_created", label: "New event created" },
    { value: "event_starting", label: "Event starting soon" },
  ],
  gdrive: [
    { value: "file_added", label: "New file added" },
    { value: "file_updated", label: "File updated" },
  ],
  slack: [{ value: "new_message", label: "New message posted" }],
  teams: [
    { value: "new_message", label: "New message posted" },
    { value: "meeting_scheduled", label: "New meeting scheduled" },
  ],
  outlook: [
    { value: "new_email", label: "New email received" },
    { value: "event_created", label: "New calendar event" },
  ],
  salesforce: [
    { value: "lead_created", label: "New lead created" },
    { value: "deal_stage_changed", label: "Deal stage changed" },
  ],
  hubspot: [
    { value: "contact_created", label: "New contact created" },
    { value: "deal_stage_changed", label: "Deal stage changed" },
  ],
  jira: [
    { value: "issue_created", label: "Issue created" },
    { value: "issue_status_changed", label: "Issue status changed" },
  ],
  zoom: [
    { value: "meeting_started", label: "Meeting started" },
    { value: "meeting_ended", label: "Meeting ended" },
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
      createdAt: now - 86_400_000 * 7,
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
      createdAt: now - 86_400_000 * 14,
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
      createdAt: now - 86_400_000 * 10,
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
      createdAt: now - 86_400_000 * 3,
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
        return b.createdAt - a.createdAt;
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
  create(agentId: string, data: Omit<TriggerRecord, "id" | "agentId" | "createdAt" | "updatedAt" | "lastFiredAt">) {
    const id = `trg-${Date.now().toString(36)}`;
    const rec: TriggerRecord = {
      ...data,
      id,
      agentId,
      lastFiredAt: null,
      createdAt: Date.now(),
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
