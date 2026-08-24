// In-memory trigger store for the Triggers feature prototype.
import { connectedAccountStore } from "./connectedAccountStore";
import { checkCronExpression } from "./cronUtils";

export type TriggerType = "scheduled" | "developer" | "external";

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";
export type CustomScheduleUnit = "minute" | "hour" | "day" | "week" | "month" | "year" | "cron";
export type WebhookAuthType = "bearer" | "basic";
export type ExternalApp =
  | "gmail" | "gcalendar" | "gdrive" | "slack" | "teams" | "outlook" | "salesforce" | "hubspot" | "jira" | "zoom";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  timeOfDay?: string;               // "HH:mm"
  weekDays?: number[];               // 0-6 (0=Sun..6=Sat), weekly only, multi-select
  dayOfMonth?: number;               // 1-31, monthly + annually
  month?: number;                    // 0-11, annually only
  startTime?: string;                // "HH:mm" anchor, minutely/hourly only
  customUnit?: CustomScheduleUnit;   // frequency === "custom"
  intervalValue?: number;           // customUnit === "minute" (>=10) or "hour" (>=1)
  cron?: string;                     // customUnit === "cron" only — lives under "Custom / Advanced"
  timezone: string;
}

export interface DeveloperConfig {
  webhookUrl: string;              // auto-generated
  authentication: WebhookAuthType;
  credentialId?: string;           // required — Create/Save is blocked without it
  payloadSchema?: string;          // raw JSON text, sample of the expected request body
  requiredFields?: string[];       // keys that must be present in every incoming request
}

export interface QueueWorkHoursConfig {
  enabled: boolean;
  timezone: string;
  workDays: string[];      // values from WORK_DAY_OPTIONS
  startTime: string;       // "HH:mm"
  endTime: string;         // "HH:mm"
  allDay: boolean;
  tasksPerPeriod: number;
  tasksPeriodUnit: "hour" | "day";
}

export interface ExternalConfig {
  app: ExternalApp;
  accountId?: string;      // selected ConnectedAccount id
  event: string;           // preset value from EXTERNAL_APP_EVENTS[app], chosen explicitly by the builder

  // Gmail
  gmailMode?: "inbox" | "outreach_replies";
  includeAttachments?: boolean;
  filterSearch?: string;
  excludeEmails?: string[];

  // Google Drive
  driveId?: string;
  driveFolders?: string[];
  customProperties?: boolean;

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
  gmail: { label: "Google Mail", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" },
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
  gmail: [{ value: "new_email", label: "Email mới nhận được" }],
  gcalendar: [
    { value: "event_starting", label: "Sự kiện sắp diễn ra" },
    { value: "event_created", label: "Sự kiện mới được tạo" },
  ],
  gdrive: [
    { value: "file_added", label: "Tệp mới được thêm" },
    { value: "file_updated", label: "Tệp được cập nhật" },
  ],
  slack: [
    { value: "new_message", label: "Tin nhắn mới" },
    { value: "mention", label: "Được nhắc tên (mention)" },
  ],
  teams: [
    { value: "new_message", label: "Tin nhắn mới được đăng" },
    { value: "meeting_scheduled", label: "Cuộc họp mới được lên lịch" },
  ],
  outlook: [
    { value: "new_email", label: "Email mới nhận được" },
    { value: "event_created", label: "Sự kiện lịch mới" },
  ],
  salesforce: [
    { value: "lead_created", label: "Lead mới được tạo" },
    { value: "deal_stage_changed", label: "Giai đoạn deal thay đổi" },
  ],
  hubspot: [
    { value: "contact_created", label: "Liên hệ mới được tạo" },
    { value: "deal_stage_changed", label: "Giai đoạn deal thay đổi" },
  ],
  jira: [
    { value: "issue_created", label: "Issue được tạo" },
    { value: "issue_updated", label: "Issue được cập nhật" },
    { value: "issue_status_changed", label: "Issue đổi trạng thái" },
  ],
  zoom: [
    { value: "meeting_started", label: "Cuộc họp bắt đầu" },
    { value: "meeting_ended", label: "Cuộc họp kết thúc" },
  ],
};

export const WORK_DAY_OPTIONS: { value: string; label: string }[] = [
  { value: "weekdays", label: "Ngày trong tuần" },
  { value: "weekends", label: "Cuối tuần" },
  { value: "monday", label: "Thứ Hai" },
  { value: "tuesday", label: "Thứ Ba" },
  { value: "wednesday", label: "Thứ Tư" },
  { value: "thursday", label: "Thứ Năm" },
  { value: "friday", label: "Thứ Sáu" },
  { value: "saturday", label: "Thứ Bảy" },
  { value: "sunday", label: "Chủ Nhật" },
];

export const TASKS_PERIOD_UNIT_OPTIONS: { value: "hour" | "day"; label: string }[] = [
  { value: "hour", label: "Mỗi giờ" },
  { value: "day", label: "Mỗi ngày" },
];

export const DRIVE_OPTIONS: { value: string; label: string }[] = [
  { value: "my-drive", label: "Drive của tôi" },
  { value: "shared-sales", label: "Drive dùng chung — Sales" },
  { value: "shared-support", label: "Drive dùng chung — Support" },
];

export const DRIVE_FOLDER_OPTIONS: { value: string; label: string }[] = [
  { value: "agents", label: "Agent" },
  { value: "reports", label: "Báo cáo" },
  { value: "contracts", label: "Hợp đồng" },
  { value: "shared", label: "Dùng chung" },
  { value: "archive", label: "Lưu trữ" },
];

const store = new Map<string, TriggerRecord>();
const k = (a: string, t: string) => `${a}:${t}`;
const seededAgents = new Set<string>();

/** Demo agents seeded with sample triggers so their Automation identity (kind is derived
 * from trigger count — see agentKindStore.ts) is visible without manual setup. Every other
 * agent, including freshly created ones, starts with zero triggers and is Conversational
 * until the Builder actually adds one. */
const AUTO_SEEDED_AGENT_IDS = new Set(["nightly-report", "invoice-reminder"]);

function seedAgent(agentId: string) {
  if (seededAgents.has(agentId)) return;
  seededAgents.add(agentId);
  if (!AUTO_SEEDED_AGENT_IDS.has(agentId)) return;
  const now = Date.now();
  const seed: Omit<TriggerRecord, "agentId">[] = [
    {
      id: "daily-report",
      name: "Báo cáo hằng ngày",
      type: "scheduled",
      enabled: true,
      description: "Chạy agent mỗi ngày lúc 08:00 để tạo báo cáo hằng ngày.",
      config: { schedule: { frequency: "daily", timeOfDay: "08:00", timezone: "GMT+07:00" } },
      lastFiredAt: now - 86_400_000,
      createdAt: now - 86_400_000 * 14,
      updatedAt: now - 86_400_000 * 14,
    },
    {
      id: "new-customer-email",
      name: "Email khách hàng mới",
      type: "external",
      enabled: true,
      description: "Kích hoạt agent khi có email khách hàng mới đến trong Google Mail.",
      config: { external: { app: "gmail", accountId: "acct-gmail-1", event: "new_email", gmailMode: "inbox", includeAttachments: true } },
      lastFiredAt: now - 86_400_000 * 2,
      createdAt: now - 86_400_000 * 10,
      updatedAt: now - 86_400_000 * 10,
    },
    {
      id: "order-created-webhook",
      name: "Đơn hàng được tạo",
      type: "developer",
      enabled: false,
      description: "Hệ thống bên ngoài đẩy sự kiện đơn hàng được tạo đến agent.",
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

/** True when a trigger's required config is missing, so it can't safely be activated —
 * a Webhook without a credential, an External app whose connection is missing/expired,
 * or a Scheduled trigger whose saved cron expression is invalid. */
export function triggerNeedsSetup(t: TriggerRecord): boolean {
  if (t.type === "developer" && t.config.developer) {
    return !t.config.developer.credentialId;
  }
  if (t.type === "external" && t.config.external) {
    const acct = t.config.external.accountId ? connectedAccountStore.get(t.config.external.accountId) : undefined;
    return !acct || !!acct.expired;
  }
  if (t.type === "scheduled" && t.config.schedule?.customUnit === "cron") {
    return !checkCronExpression(t.config.schedule.cron ?? "").valid;
  }
  return false;
}
