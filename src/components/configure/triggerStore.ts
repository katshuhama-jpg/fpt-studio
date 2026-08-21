// In-memory trigger store for the Triggers feature prototype.
export type TriggerType = "scheduled" | "developer" | "external";

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";
export type CustomScheduleUnit = "minute" | "hour" | "day" | "week" | "month" | "year" | "cron";
export type WebhookAuthType = "none" | "bearer" | "basic";
export type ExternalApp =
  | "gmail" | "gcalendar" | "gdrive" | "slack" | "teams" | "outlook" | "salesforce" | "hubspot" | "jira" | "zoom";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  timeOfDay?: string;               // "HH:mm"
  dayOfWeek?: number;                // 0-6, weekly only
  dayOfMonth?: number;               // 1-31, monthly only
  customUnit?: CustomScheduleUnit;   // frequency === "custom"
  intervalValue?: number;           // customUnit === "minute" (>=10) or "hour" (>=1)
  cron?: string;                     // customUnit === "cron" only — lives under "Advanced schedule"
  timezone: string;
}

export interface DeveloperConfig {
  webhookUrl: string;              // auto-generated
  authentication: WebhookAuthType;
  credentialId?: string;           // set when authentication !== "none"
}

export interface QueueWorkHoursConfig {
  enabled: boolean;
  timezone: string;
  workDays: string[];      // values from WORK_DAY_OPTIONS
  startTime: string;       // "HH:mm"
  endTime: string;         // "HH:mm"
  allDay: boolean;
  tasksPerPeriod: number;
}

export interface ExternalConfig {
  app: ExternalApp;
  accountId?: string;      // selected ConnectedAccount id
  event: string;           // preset value from EXTERNAL_APP_EVENTS[app]
  conditions?: string;     // optional, revealed via progressive disclosure — generic apps only

  // Gmail
  gmailMode?: "inbox" | "outreach_replies";
  includeAttachments?: boolean;
  filterSearch?: string;
  excludeEmails?: string[];

  // Google Drive
  driveId?: string;
  driveFolders?: string[];
  customProperties?: boolean;

  // Calendar / Slack / Teams / Outlook / Salesforce / HubSpot / Jira / Zoom — one bespoke
  // select + one bespoke toggle each, described by EXTERNAL_APP_EXTRA_FIELD below.
  extraSelect?: string;
  extraToggle?: boolean;

  queueWorkHours?: QueueWorkHoursConfig;
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

export const WORK_DAY_OPTIONS: { value: string; label: string }[] = [
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const DRIVE_OPTIONS: { value: string; label: string }[] = [
  { value: "my-drive", label: "My Drive" },
  { value: "shared-sales", label: "Shared drive — Sales" },
  { value: "shared-support", label: "Shared drive — Support" },
];

export const DRIVE_FOLDER_OPTIONS: { value: string; label: string }[] = [
  { value: "agents", label: "Agents" },
  { value: "reports", label: "Reports" },
  { value: "contracts", label: "Contracts" },
  { value: "shared", label: "Shared" },
  { value: "archive", label: "Archive" },
];

/** One bespoke select + one bespoke toggle per "generic" external app (Gmail and Google
 * Drive get fully custom screens instead — see TriggerFormDialog.tsx). */
export const EXTERNAL_APP_EXTRA_FIELD: Partial<Record<ExternalApp, {
  selectLabel: string; selectOptions: { value: string; label: string }[];
  toggleLabel: string;
}>> = {
  gcalendar: {
    selectLabel: "Calendar",
    selectOptions: [
      { value: "primary", label: "Primary calendar" },
      { value: "work", label: "Work" },
      { value: "personal", label: "Personal" },
    ],
    toggleLabel: "Include all-day events",
  },
  slack: {
    selectLabel: "Channel",
    selectOptions: [
      { value: "all", label: "All channels" },
      { value: "general", label: "#general" },
      { value: "sales", label: "#sales" },
      { value: "support", label: "#support" },
    ],
    toggleLabel: "Include thread replies",
  },
  teams: {
    selectLabel: "Channel",
    selectOptions: [
      { value: "all", label: "All channels" },
      { value: "general", label: "General" },
      { value: "sales", label: "Sales" },
      { value: "support", label: "Support" },
    ],
    toggleLabel: "Include thread replies",
  },
  outlook: {
    selectLabel: "Folder",
    selectOptions: [
      { value: "inbox", label: "Inbox" },
      { value: "flagged", label: "Flagged" },
    ],
    toggleLabel: "Include attachments",
  },
  salesforce: {
    selectLabel: "Object",
    selectOptions: [
      { value: "lead", label: "Lead" },
      { value: "opportunity", label: "Opportunity" },
      { value: "contact", label: "Contact" },
    ],
    toggleLabel: "Include updated records, not just new ones",
  },
  hubspot: {
    selectLabel: "Object",
    selectOptions: [
      { value: "contact", label: "Contact" },
      { value: "deal", label: "Deal" },
      { value: "company", label: "Company" },
    ],
    toggleLabel: "Include updated records, not just new ones",
  },
  jira: {
    selectLabel: "Project",
    selectOptions: [
      { value: "all", label: "All projects" },
      { value: "engineering", label: "Engineering" },
      { value: "support", label: "Support" },
      { value: "product", label: "Product" },
    ],
    toggleLabel: "Include sub-tasks",
  },
  zoom: {
    selectLabel: "Meeting type",
    selectOptions: [
      { value: "all", label: "All meetings" },
      { value: "scheduled", label: "Scheduled only" },
      { value: "instant", label: "Instant only" },
    ],
    toggleLabel: "Include recording link when available",
  },
};

const store = new Map<string, TriggerRecord>();
const k = (a: string, t: string) => `${a}:${t}`;

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();
  const seed: Omit<TriggerRecord, "agentId">[] = [
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
      config: { external: { app: "gmail", accountId: "acct-gmail-1", event: "new_email", gmailMode: "inbox", includeAttachments: true } },
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
          webhookUrl: "https://agents.fpt.ai/console/api/webhooks/triggers/01M0F37JPXPMGYSMJ0VR9CFC7",
          authentication: "bearer",
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
      .sort((a, b) => b.createdAt - a.createdAt);
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
    if (!store.has(k(agentId, id))) return;
    store.delete(k(agentId, id));
  },
};
