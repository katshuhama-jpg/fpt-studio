import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  triggerStore, type TriggerRecord, type TriggerType, type ScheduleFrequency, type CustomScheduleUnit,
  type WebhookAuthType, type ExternalApp, type NotificationRule, TIMEZONE_OPTIONS, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META, EXTERNAL_APP_ORDER,
  WORK_DAY_OPTIONS, TASKS_PERIOD_UNIT_OPTIONS, DRIVE_OPTIONS, DRIVE_FOLDER_OPTIONS,
} from "./triggerStore";
import { connectedAccountStore } from "./connectedAccountStore";
import { credentialStore, type CredentialAuthType } from "./credentialStore";
import CreateCredentialDialog from "./CreateCredentialDialog";
import AppLogo from "./AppLogo";
import { toast } from "sonner";
import { Clock, Webhook, Globe, Copy, Check, ChevronDown, ChevronLeft, Plus, X, Trash2 } from "lucide-react";

const NOTIFICATION_UNIT_OPTIONS: { value: NotificationRule["unit"]; label: string }[] = [
  { value: "minutes", label: "minutes" },
  { value: "hours", label: "hours" },
  { value: "days", label: "days" },
];
const NOTIFICATION_TIMING_OPTIONS: { value: NotificationRule["timing"]; label: string }[] = [
  { value: "before", label: "before" },
  { value: "after", label: "after" },
];
function defaultNotification(app: ExternalApp): NotificationRule {
  return { id: `notif-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, value: 3, unit: "minutes", timing: "before", message: EXTERNAL_APP_EVENTS[app][0].value };
}

const NAME_MAX = 50;
const DESC_MAX = 200;

const CATEGORY_OPTIONS: { value: TriggerType; label: string; icon: any; desc: string }[] = [
  { value: "scheduled", label: "Scheduled", icon: Clock, desc: "Run this Agent automatically based on a recurring schedule." },
  { value: "developer", label: "Webhook", icon: Webhook, desc: "Receive a unique URL that any external system can call (POST) to trigger this Agent." },
  { value: "external", label: "External application", icon: Globe, desc: "Trigger this Agent when something happens in another application." },
];

const PRIMARY_FREQUENCY_OPTIONS: { value: CustomScheduleUnit; label: string }[] = [
  { value: "minute", label: "Minutely" },
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annually" },
];

const WEEKDAY_CHIPS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const MONTH_OPTIONS: { value: number; label: string }[] = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, value) => ({ value, label }));

const MONTH_MAX_DAY = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function daysInMonthDisplay(month: number): number {
  return MONTH_MAX_DAY[month] ?? 31;
}

function defaultStartTime(): string {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes();
  if (m !== 0 && m !== 30) {
    if (m < 30) m = 30;
    else { m = 0; h = (h + 1) % 24; }
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function validateCronField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;
  const parts = field.split(",");
  if (parts.some(p => p === "")) return false;
  for (const part of parts) {
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      if (step <= 0) return false;
      if (stepMatch[1] !== "*") {
        const m = stepMatch[1].match(/^(\d+)(?:-(\d+))?$/);
        if (!m) return false;
        const a = Number(m[1]);
        const b = m[2] !== undefined ? Number(m[2]) : max;
        if (a < min || a > max || b < min || b > max || a > b) return false;
      }
      continue;
    }
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return false;
    const a = Number(m[1]);
    const b = m[2] !== undefined ? Number(m[2]) : a;
    if (a < min || a > max || b < min || b > max || a > b) return false;
  }
  return true;
}

function expandCronField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    const out: number[] = [];
    for (let i = min; i <= max; i++) out.push(i);
    return out;
  }
  const result = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      let a = min, b = max;
      if (stepMatch[1] !== "*") {
        const m = stepMatch[1].match(/^(\d+)(?:-(\d+))?$/)!;
        a = Number(m[1]);
        b = m[2] !== undefined ? Number(m[2]) : max;
      }
      for (let i = a; i <= b; i += step) result.add(i);
      continue;
    }
    const m = part.match(/^(\d+)(?:-(\d+))?$/)!;
    const a = Number(m[1]);
    const b = m[2] !== undefined ? Number(m[2]) : a;
    for (let i = a; i <= b; i++) result.add(i);
  }
  return [...result].sort((x, y) => x - y);
}

interface CronCheck { valid: boolean; tooFrequent: boolean; }
function checkCronExpression(expr: string): CronCheck {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return { valid: false, tooFrequent: false };
  const [minute, hour, dom, month, dow] = fields;
  if (
    !validateCronField(minute, 0, 59) ||
    !validateCronField(hour, 0, 23) ||
    !validateCronField(dom, 1, 31) ||
    !validateCronField(month, 1, 12) ||
    !validateCronField(dow, 0, 7)
  ) return { valid: false, tooFrequent: false };

  const minutes = expandCronField(minute, 0, 59);
  let tooFrequent = false;
  if (minutes.length > 1) {
    let minGap = Infinity;
    for (let i = 0; i < minutes.length; i++) {
      const next = minutes[(i + 1) % minutes.length];
      const gap = i === minutes.length - 1 ? next + 60 - minutes[i] : next - minutes[i];
      minGap = Math.min(minGap, gap);
    }
    tooFrequent = minGap < 10;
  }
  return { valid: true, tooFrequent };
}

const DOW_VN = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
function describeCronVN(expr: string): string {
  const [minute, hour, dom, month, dow] = expr.trim().split(/\s+/);
  const isSingle = (f: string) => /^\d+$/.test(f);
  const timePart = isSingle(minute) && isSingle(hour) ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` : null;

  let dowPart = "";
  if (dow !== "*") {
    const rangeMatch = dow.match(/^(\d)-(\d)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]) % 7, b = Number(rangeMatch[2]) % 7;
      dowPart = ` các ngày trong tuần (${DOW_VN[a]} – ${DOW_VN[b]})`;
    } else {
      dowPart = ` vào ${expandCronField(dow, 0, 7).map(d => DOW_VN[d % 7]).join(", ")}`;
    }
  }

  const domPart = dom !== "*" ? ` ngày ${dom} hàng tháng` : "";
  const monthPart = month !== "*" ? ` (tháng ${month})` : "";

  if (timePart) {
    if (dow !== "*" && dom === "*" && month === "*") return `Chạy ${timePart}${dowPart}`;
    if (dom !== "*" && dow === "*" && month === "*") return `Chạy ${timePart}${domPart}`;
    if (dom === "*" && dow === "*" && month === "*") return `Chạy hàng ngày lúc ${timePart}`;
    return `Chạy ${timePart}${domPart}${dowPart}${monthPart}`.trim();
  }
  return `Chạy theo lịch: phút ${minute}, giờ ${hour}, ngày ${dom}, tháng ${month}, thứ ${dow}`;
}

const AUTH_OPTIONS: { value: WebhookAuthType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
];

function generateWebhookId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let id = "";
  for (let i = 0; i < 25; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

type WizardStep = "main" | "details" | "app-picker" | "connected-accounts" | "app-config" | "queue-work-hours";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  agentId: string;
  trigger?: TriggerRecord;
  onSubmitted?: (rec: TriggerRecord) => void;
}

export default function TriggerFormDialog({ open, onOpenChange, mode, agentId, trigger, onSubmitted }: Props) {
  const [step, setStep] = useState<WizardStep>("main");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TriggerType>("scheduled");
  const [description, setDescription] = useState("");

  // Scheduled
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [weekDays, setWeekDays] = useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [month, setMonth] = useState(0);
  const [startTime, setStartTime] = useState(() => defaultStartTime());
  const [customUnit, setCustomUnit] = useState<CustomScheduleUnit>("day");
  const [intervalValue, setIntervalValue] = useState("");
  const [cron, setCron] = useState("0 9 * * 1");
  const [timezone, setTimezone] = useState("GMT+07:00");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [authentication, setAuthentication] = useState<WebhookAuthType>("none");
  const [credentialId, setCredentialId] = useState("");
  const [webhookCopied, setWebhookCopied] = useState(false);

  // External — app + connected account
  const [app, setApp] = useState<ExternalApp>("gmail");
  const [accountId, setAccountId] = useState("");
  const [accountsTick, setAccountsTick] = useState(0);
  const [event, setEvent] = useState("new_email");

  // External — Gmail
  const [gmailMode, setGmailMode] = useState<"inbox" | "outreach_replies">("inbox");
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [filterSearch, setFilterSearch] = useState("");
  const [excludeEmails, setExcludeEmails] = useState<string[]>([]);

  // External — Google Drive
  const [driveId, setDriveId] = useState("my-drive");
  const [driveFolders, setDriveFolders] = useState<string[]>([]);
  const [customProperties, setCustomProperties] = useState(false);

  // External — generic apps (Calendar, Slack, Teams, Outlook, Salesforce, HubSpot, Jira, Zoom)
  const [notifications, setNotifications] = useState<NotificationRule[]>([]);

  // External — Queue Work Hours (shared)
  const [qwhEnabled, setQwhEnabled] = useState(false);
  const [qwhTimezone, setQwhTimezone] = useState("GMT+07:00");
  const [qwhWorkDays, setQwhWorkDays] = useState<string[]>(["weekdays"]);
  const [qwhStartTime, setQwhStartTime] = useState("09:00");
  const [qwhEndTime, setQwhEndTime] = useState("17:00");
  const [qwhAllDay, setQwhAllDay] = useState(false);
  const [qwhTasksPerPeriod, setQwhTasksPerPeriod] = useState("10");
  const [qwhTasksPeriodUnit, setQwhTasksPeriodUnit] = useState<"hour" | "day">("day");

  const [errors, setErrors] = useState<{ name?: string; description?: string; schedule?: string; credential?: string }>({});

  void accountsTick;

  useEffect(() => {
    if (!open) return;
    const t = trigger;
    setStep("main");
    setName(t?.name ?? "");
    setDescription(t?.description ?? "");
    setErrors({});

    const cat: TriggerType = t?.type === "developer" || t?.type === "external" ? t.type : "scheduled";
    setCategory(cat);

    const sched = t?.config.schedule;
    const unit = sched?.customUnit ?? (sched?.frequency === "weekly" ? "week" : sched?.frequency === "monthly" ? "month" : "day");
    setTimeOfDay(sched?.timeOfDay ?? "08:00");
    setWeekDays(sched?.weekDays?.length ? sched.weekDays : [1]);
    setDayOfMonth(sched?.dayOfMonth ?? 1);
    setMonth(sched?.month ?? 0);
    setStartTime(sched?.startTime ?? defaultStartTime());
    setCustomUnit(unit);
    setIntervalValue(sched?.intervalValue != null ? String(sched.intervalValue) : "");
    setCron(sched?.cron ?? "0 9 * * 1");
    setTimezone(sched?.timezone ?? "GMT+07:00");
    setAdvancedOpen(unit === "cron");

    const dev = t?.config.developer;
    setWebhookUrl(dev?.webhookUrl ?? `https://agents.fpt.ai/console/api/webhooks/triggers/${generateWebhookId()}`);
    setAuthentication(dev?.authentication ?? "none");
    setCredentialId(dev?.credentialId ?? "");

    const ext = t?.config.external;
    const extApp = ext?.app ?? "gmail";
    setApp(extApp);
    setAccountId(ext?.accountId ?? "");
    setEvent(ext?.event ?? EXTERNAL_APP_EVENTS[extApp][0].value);
    setGmailMode(ext?.gmailMode ?? "inbox");
    setIncludeAttachments(ext?.includeAttachments ?? true);
    setFilterSearch(ext?.filterSearch ?? "");
    setExcludeEmails(ext?.excludeEmails ?? []);
    setDriveId(ext?.driveId ?? "my-drive");
    setDriveFolders(ext?.driveFolders ?? []);
    setCustomProperties(ext?.customProperties ?? false);
    setNotifications(ext?.notifications?.length ? ext.notifications : (!["gmail", "gdrive"].includes(extApp) ? [defaultNotification(extApp)] : []));
    const qwh = ext?.queueWorkHours;
    setQwhEnabled(qwh?.enabled ?? false);
    setQwhTimezone(qwh?.timezone ?? "GMT+07:00");
    setQwhWorkDays(qwh?.workDays ?? ["weekdays"]);
    setQwhStartTime(qwh?.startTime ?? "09:00");
    setQwhEndTime(qwh?.endTime ?? "17:00");
    setQwhAllDay(qwh?.allDay ?? false);
    setQwhTasksPerPeriod(qwh?.tasksPerPeriod != null ? String(qwh.tasksPerPeriod) : "10");
    setQwhTasksPeriodUnit(qwh?.tasksPeriodUnit ?? "day");
  }, [open, trigger]);

  const validateBasics = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    else if (name.trim().length > NAME_MAX) e.name = `Name must be ≤ ${NAME_MAX} characters`;
    else if (triggerStore.isDuplicateName(agentId, name, trigger?.id)) e.name = "Name already exists";
    if (!description.trim()) e.description = "Description is required";
    else if (description.length > DESC_MAX) e.description = `Description must be ≤ ${DESC_MAX} characters`;
    return e;
  };

  const validateDetails = () => {
    const e: typeof errors = {};
    if (category === "scheduled") {
      if (customUnit === "cron") {
        const check = checkCronExpression(cron);
        if (!check.valid) e.schedule = "Biểu thức Cron không hợp lệ. Định dạng: phút giờ ngày tháng thứ (ví dụ: 0 8 * * 1-5)";
        else if (check.tooFrequent) e.schedule = "Cron không được chạy dày hơn 10 phút một lần.";
      }
      if (customUnit === "minute" && Number(intervalValue) < 10) {
        e.schedule = "Tối thiểu 10 phút.";
      }
      if (customUnit === "hour" && Number(intervalValue) < 1) {
        e.schedule = "Tối thiểu 1 giờ.";
      }
      if (customUnit === "week" && weekDays.length === 0) {
        e.schedule = "Chọn ít nhất một ngày trong tuần.";
      }
      if (customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31)) {
        e.schedule = "Ngày trong tháng phải từ 1 đến 31.";
      }
    }
    if (category === "developer" && authentication !== "none" && !credentialId) {
      e.credential = "The credential is required";
    }
    return e;
  };

  const submit = () => {
    const eBasics = validateBasics();
    const eDetails = category === "scheduled" || category === "developer" ? validateDetails() : {};
    const e = { ...eBasics, ...eDetails };
    setErrors(e);
    if (Object.keys(e).length) {
      setStep(eBasics.name || eBasics.description ? "main" : "details");
      return;
    }

    const config: TriggerRecord["config"] = {};
    if (category === "scheduled") {
      config.schedule = {
        frequency: "custom",
        timezone,
        customUnit,
        ...(customUnit === "cron" ? { cron: cron.trim() } : {}),
        ...(customUnit === "minute" || customUnit === "hour" ? { intervalValue: Number(intervalValue), startTime } : {}),
        ...(["day", "week", "month", "year"].includes(customUnit) ? { timeOfDay } : {}),
        ...(customUnit === "week" ? { weekDays } : {}),
        ...(customUnit === "month" ? { dayOfMonth } : {}),
        ...(customUnit === "year" ? { dayOfMonth, month } : {}),
      };
    }
    if (category === "developer") {
      config.developer = {
        webhookUrl,
        authentication,
        ...(authentication !== "none" && credentialId ? { credentialId } : {}),
      };
    }
    if (category === "external") {
      config.external = {
        app,
        ...(accountId ? { accountId } : {}),
        event,
        ...(app === "gmail" ? {
          gmailMode,
          includeAttachments,
          ...(filterSearch.trim() ? { filterSearch: filterSearch.trim() } : {}),
          ...(excludeEmails.some(x => x.trim()) ? { excludeEmails: excludeEmails.filter(x => x.trim()) } : {}),
        } : {}),
        ...(app === "gdrive" ? {
          driveId,
          ...(driveFolders.length ? { driveFolders } : {}),
          customProperties,
        } : {}),
        ...(!["gmail", "gdrive"].includes(app) ? { notifications } : {}),
        queueWorkHours: {
          enabled: qwhEnabled,
          timezone: qwhTimezone,
          workDays: qwhWorkDays,
          startTime: qwhStartTime,
          endTime: qwhEndTime,
          allDay: qwhAllDay,
          tasksPerPeriod: Number(qwhTasksPerPeriod) || 0,
          tasksPeriodUnit: qwhTasksPeriodUnit,
        },
      };
    }

    if (mode === "create") {
      const rec = triggerStore.create(agentId, {
        name: name.trim(),
        type: category,
        enabled: true,
        description: description.trim(),
        config,
      });
      toast.success("Trigger created");
      onSubmitted?.(rec);
    } else if (trigger) {
      triggerStore.update(agentId, trigger.id, {
        name: name.trim(),
        type: category,
        description: description.trim(),
        config,
      });
      toast.success("Trigger updated");
      onSubmitted?.({ ...trigger, name: name.trim(), type: category, description: description.trim(), config });
    }
    onOpenChange(false);
  };

  const stepBack = () => {
    if (step === "details") setStep("main");
    else if (step === "app-picker") setStep("main");
    else if (step === "connected-accounts") setStep(mode === "create" ? "app-picker" : "main");
    else if (step === "app-config") setStep("connected-accounts");
    else if (step === "queue-work-hours") setStep("app-config");
  };

  const primaryAction = () => {
    if (step === "main") {
      const e = validateBasics();
      setErrors(e);
      if (Object.keys(e).length) return;
      if (category === "external") setStep(mode === "create" ? "app-picker" : "connected-accounts");
      else setStep("details");
      return;
    }
    if (step === "app-picker") { setStep("connected-accounts"); return; }
    if (step === "details") { submit(); return; }
    if (step === "connected-accounts") { setStep("app-config"); return; }
    if (step === "app-config") { setStep("queue-work-hours"); return; }
    submit();
  };

  const primaryLabel =
    step === "details" || step === "queue-work-hours" ? (mode === "create" ? "Create" : "Save") : "Continue";

  const connectedAccounts = connectedAccountStore.list(app);
  const categoryHeading = category === "scheduled" ? "Recurring Schedule"
    : category === "developer" ? "Webhook"
    : EXTERNAL_APP_META[app].label;

  const stepSequence: WizardStep[] = category === "external"
    ? (mode === "create" ? ["main", "app-picker", "connected-accounts", "app-config", "queue-work-hours"] : ["main", "connected-accounts", "app-config", "queue-work-hours"])
    : ["main", "details"];
  const stepIndex = stepSequence.indexOf(step);
  const stepTotal = stepSequence.length;

  const cronCheck = checkCronExpression(cron);
  const detailsInvalid = step === "details" && Object.keys(validateDetails()).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-1.5">
            {step !== "main" ? (
              <button
                type="button"
                onClick={stepBack}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base w-fit"
              >
                <ChevronLeft size={13} /> Back
              </button>
            ) : <span />}
            {stepTotal > 1 && (
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                Step {stepIndex + 1} of {stepTotal}
              </span>
            )}
          </div>
          <DialogTitle className="font-display">
            {step === "main" ? (mode === "create" ? "Create new trigger" : "Edit Trigger")
              : step === "details" ? categoryHeading
              : step === "app-picker" ? "Choose application"
              : step === "queue-work-hours" ? "Queue Work Hours"
              : EXTERNAL_APP_META[app].label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === "main" && (
            <>
              {mode === "edit" && (
                <h3 className="font-display text-base font-semibold -mb-1">{categoryHeading}</h3>
              )}

              {mode === "create" && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const active = category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-base ${
                          active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                        }`}
                      >
                        <Icon size={14} className={active ? "text-primary" : "text-muted-foreground"} />
                        <div className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-snug">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              <div className="rounded-xl border border-border bg-surface/60 p-3 space-y-3">
                <div>
                  <label className="text-xs font-medium flex items-center justify-between mb-1.5">
                    <span>Name <span className="text-destructive">*</span></span>
                    <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(er => ({ ...er, name: undefined })); }}
                    placeholder="e.g. Daily report"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      errors.name ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium flex items-center justify-between mb-1.5">
                    <span>Description <span className="text-destructive">*</span></span>
                    <span className="text-[10px] font-mono text-muted-foreground">{description.length}/{DESC_MAX}</span>
                  </label>
                  <textarea
                    value={description}
                    rows={2}
                    onChange={e => { setDescription(e.target.value); if (errors.description) setErrors(er => ({ ...er, description: undefined })); }}
                    placeholder="What does this trigger do?"
                    className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm outline-none resize-none transition-base ${
                      errors.description ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.description && <p className="mt-1 text-[11px] text-destructive">{errors.description}</p>}
                </div>
              </div>
            </>
          )}

          {step === "details" && category === "scheduled" && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Frequency</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRIMARY_FREQUENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCustomUnit(opt.value);
                        if (opt.value === "minute" || opt.value === "hour") setIntervalValue("");
                        if (errors.schedule) setErrors(er => ({ ...er, schedule: undefined }));
                      }}
                      className={`h-8 rounded-lg text-xs font-medium transition-base ${
                        customUnit === opt.value ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(o => !o)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-base"
                  >
                    <ChevronDown size={11} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                    Custom / Advanced
                  </button>
                  {advancedOpen && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomUnit("cron");
                          if (errors.schedule) setErrors(er => ({ ...er, schedule: undefined }));
                        }}
                        className={`h-8 px-3 rounded-lg text-xs font-medium transition-base ${
                          customUnit === "cron" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Cron
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {customUnit === "minute" && (
                <>
                  <div>
                    <input
                      type="number" min={10}
                      value={intervalValue}
                      onChange={e => setIntervalValue(e.target.value)}
                      placeholder="Minutes"
                      className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                        intervalValue !== "" && Number(intervalValue) < 10 ? "border-destructive" : "border-border focus:border-primary"
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${intervalValue !== "" && Number(intervalValue) < 10 ? "text-destructive" : "text-muted-foreground"}`}>
                      Tối thiểu 10 phút.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Start time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Lịch chạy được tính từ Start time. Ví dụ: Start time 10:00, mỗi 2 giờ → 10:00, 12:00, 14:00…
                    </p>
                  </div>
                </>
              )}
              {customUnit === "hour" && (
                <>
                  <div>
                    <input
                      type="number" min={1}
                      value={intervalValue}
                      onChange={e => setIntervalValue(e.target.value)}
                      placeholder="Hours"
                      className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                        intervalValue !== "" && Number(intervalValue) < 1 ? "border-destructive" : "border-border focus:border-primary"
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${intervalValue !== "" && Number(intervalValue) < 1 ? "text-destructive" : "text-muted-foreground"}`}>
                      Tối thiểu 1 giờ.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Start time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Lịch chạy được tính từ Start time. Ví dụ: Start time 10:00, mỗi 2 giờ → 10:00, 12:00, 14:00…
                    </p>
                  </div>
                </>
              )}

              {customUnit === "year" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Month</label>
                  <select
                    value={month}
                    onChange={e => {
                      const nv = Number(e.target.value);
                      setMonth(nv);
                      const max = daysInMonthDisplay(nv);
                      if (dayOfMonth > max) setDayOfMonth(max);
                    }}
                    className="ds-input h-9"
                  >
                    {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {(customUnit === "month" || customUnit === "year") && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Day of month</label>
                  <input
                    type="number" min={1} max={customUnit === "year" ? daysInMonthDisplay(month) : 31}
                    value={dayOfMonth}
                    onChange={e => {
                      let v = Number(e.target.value);
                      if (customUnit === "year") {
                        const max = daysInMonthDisplay(month);
                        if (v > max) v = max;
                      }
                      setDayOfMonth(v);
                    }}
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31) ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {customUnit === "year" && month === 1 && dayOfMonth === 29 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Ngày 29/02 chỉ tồn tại trong năm nhuận. Những năm không nhuận, agent sẽ chạy vào 28/02.
                    </p>
                  )}
                  {customUnit === "month" && [29, 30, 31].includes(dayOfMonth) && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Tháng không có ngày {dayOfMonth}, agent sẽ chạy vào ngày cuối cùng của tháng đó.
                    </p>
                  )}
                  {customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31) && (
                    <p className="mt-1 text-[11px] text-destructive">Ngày trong tháng phải từ 1 đến 31.</p>
                  )}
                </div>
              )}

              {["day", "week", "month", "year"].includes(customUnit) && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Time</label>
                  <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                </div>
              )}
              {customUnit === "week" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Days of week</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_CHIPS.map(d => {
                      const active = weekDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setWeekDays(prev => active ? prev.filter(x => x !== d.value) : [...prev, d.value])}
                          className={`h-8 rounded-lg text-xs font-medium transition-base ${
                            active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className={`mt-1 text-[11px] ${weekDays.length === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    Chọn ít nhất một ngày trong tuần.
                  </p>
                </div>
              )}
              {customUnit === "cron" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Cron expression</label>
                  <input
                    value={cron}
                    onChange={e => {
                      const v = e.target.value;
                      setCron(v);
                      if (errors.schedule) {
                        const check = checkCronExpression(v);
                        if (check.valid && !check.tooFrequent) setErrors(er => ({ ...er, schedule: undefined }));
                      }
                    }}
                    onBlur={() => {
                      const check = checkCronExpression(cron);
                      if (!check.valid) setErrors(er => ({ ...er, schedule: "Biểu thức Cron không hợp lệ. Định dạng: phút giờ ngày tháng thứ (ví dụ: 0 8 * * 1-5)" }));
                      else if (check.tooFrequent) setErrors(er => ({ ...er, schedule: "Cron không được chạy dày hơn 10 phút một lần." }));
                      else setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    placeholder="0 8 * * 1-5"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                      errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Standard cron format: minute hour day-of-month month day-of-week</p>
                  {errors.schedule ? (
                    <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>
                  ) : cronCheck.valid && !cronCheck.tooFrequent && (
                    <p className="mt-1 text-[11px] text-success">{describeCronVN(cron)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1.5 block">Time zone</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} className="ds-input h-9">
                  {TIMEZONE_OPTIONS.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === "details" && category === "developer" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Webhook URL</label>
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={webhookUrl}
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface-muted text-xs font-mono text-muted-foreground outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(webhookUrl).catch(() => {});
                      setWebhookCopied(true);
                      setTimeout(() => setWebhookCopied(false), 1500);
                    }}
                    className="w-9 h-9 shrink-0 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                    aria-label="Copy webhook URL"
                  >
                    {webhookCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Authentication <span className="text-destructive">*</span>
                </label>
                <select
                  value={authentication}
                  onChange={e => {
                    setAuthentication(e.target.value as WebhookAuthType);
                    setCredentialId("");
                    if (errors.credential) setErrors(er => ({ ...er, credential: undefined }));
                  }}
                  className="ds-input h-9"
                >
                  {AUTH_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {authentication !== "none" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">
                    {authentication === "bearer" ? "Token" : "Credential for Basic Auth"} <span className="text-destructive">*</span>
                  </label>
                  <CredentialField
                    authType={authentication}
                    value={credentialId}
                    onChange={id => { setCredentialId(id); if (errors.credential) setErrors(er => ({ ...er, credential: undefined })); }}
                    error={errors.credential}
                  />
                  {errors.credential && <p className="mt-1 text-[11px] text-destructive">{errors.credential}</p>}
                </div>
              )}
            </div>
          )}

          {step === "app-picker" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Application</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-0.5">
                {EXTERNAL_APP_ORDER.map(value => {
                  const meta = EXTERNAL_APP_META[value];
                  const active = app === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setApp(value);
                        setEvent(EXTERNAL_APP_EVENTS[value][0].value);
                        setAccountId("");
                        setNotifications(!["gmail", "gdrive"].includes(value) ? [defaultNotification(value)] : []);
                      }}
                      className={`flex items-center gap-2 h-11 px-2.5 rounded-lg border text-left transition-base ${
                        active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <AppLogo app={value} size={22} />
                      <span className={`text-xs font-medium truncate ${active ? "text-primary" : "text-foreground"}`}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "connected-accounts" && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Connected accounts</h4>
              <div className="space-y-1.5 mb-4">
                {connectedAccounts.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">No accounts connected yet.</p>
                )}
                {connectedAccounts.map(acct => (
                  <label
                    key={acct.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-base ${
                      accountId === acct.id ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <AppLogo app={app} size={20} />
                    <span className="flex-1 text-sm font-medium truncate">{acct.email}</span>
                    <input
                      type="radio"
                      name="connected-account"
                      checked={accountId === acct.id}
                      onChange={() => setAccountId(acct.id)}
                      className="w-4 h-4 accent-primary shrink-0"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const acct = connectedAccountStore.connect(app, `you+${app}@fptsmartcloud.com`);
                    setAccountId(acct.id);
                    setAccountsTick(t => t + 1);
                    toast.success("Account connected");
                  }}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
                >
                  <Plus size={14} /> Connect account
                </button>
              </div>
            </div>
          )}

          {step === "app-config" && (
            <div className="space-y-4">
              {accountId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted">
                  <AppLogo app={app} size={18} />
                  <span className="text-xs font-medium text-foreground truncate flex-1">
                    {connectedAccountStore.get(accountId)?.email}
                  </span>
                </div>
              )}

              {app === "gmail" && (
                <>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input type="radio" name="gmail-mode" checked={gmailMode === "inbox"} onChange={() => setGmailMode("inbox")} className="w-4 h-4 accent-primary" />
                      <span className="text-sm">All emails in inbox</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input type="radio" name="gmail-mode" checked={gmailMode === "outreach_replies"} onChange={() => setGmailMode("outreach_replies")} className="w-4 h-4 accent-primary" />
                      <span className="text-sm">Outreach replies only</span>
                    </label>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">Include attachments</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Filter by search</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Filter emails like you would in Google Mail.{" "}
                      <a
                        href="https://support.google.com/mail/answer/7190"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        See here
                      </a>{" "}
                      for options.
                    </p>
                    <input
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      placeholder="e.g. from:sales@acme.com"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Exclude emails from</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Ignore emails from addresses that contain values below.</p>
                    {excludeEmails.map((email, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          value={email}
                          onChange={e => setExcludeEmails(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                          placeholder="Enter email…"
                          className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                        />
                        <button
                          type="button"
                          onClick={() => setExcludeEmails(prev => prev.filter((_, xi) => xi !== i))}
                          className="w-9 h-9 shrink-0 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setExcludeEmails(prev => [...prev, ""])}
                      className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-surface-muted hover:bg-surface text-sm font-medium text-foreground transition-base"
                    >
                      <Plus size={13} /> Add email
                    </button>
                  </div>
                </>
              )}

              {app === "gdrive" && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Drive</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Select which drive to watch for changes.</p>
                    <select value={driveId} onChange={e => setDriveId(e.target.value)} className="ds-input h-9">
                      {DRIVE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Folders <span className="text-[10px] font-normal text-muted-foreground">Optional</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Restrict to specific folders. Leave empty to watch the entire drive.</p>
                    <ChipMultiSelect options={DRIVE_FOLDER_OPTIONS} value={driveFolders} onChange={setDriveFolders} placeholder="Entire drive" />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={customProperties} onChange={e => setCustomProperties(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">Also trigger on changes to custom file properties, not just content changes.</span>
                  </label>
                </>
              )}

              {!["gmail", "gdrive"].includes(app) && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-foreground">Notifications</h4>
                  {notifications.map((n, i) => (
                    <div key={n.id} className="rounded-lg border border-border p-3 space-y-3">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Notify when</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="number" min={1}
                            value={n.value}
                            onChange={e => setNotifications(prev => prev.map((x, xi) => xi === i ? { ...x, value: Number(e.target.value) } : x))}
                            className="h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                          />
                          <select
                            value={n.unit}
                            onChange={e => setNotifications(prev => prev.map((x, xi) => xi === i ? { ...x, unit: e.target.value as NotificationRule["unit"] } : x))}
                            className="ds-input h-9"
                          >
                            {NOTIFICATION_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <select
                            value={n.timing}
                            onChange={e => setNotifications(prev => prev.map((x, xi) => xi === i ? { ...x, timing: e.target.value as NotificationRule["timing"] } : x))}
                            className="ds-input h-9"
                          >
                            {NOTIFICATION_TIMING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Message</label>
                        <select
                          value={n.message}
                          onChange={e => setNotifications(prev => prev.map((x, xi) => xi === i ? { ...x, message: e.target.value } : x))}
                          className="ds-input h-9"
                        >
                          {EXTERNAL_APP_EVENTS[app].map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifications(prev => prev.filter((_, xi) => xi !== i))}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-base"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNotifications(prev => [...prev, defaultNotification(app)])}
                    className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-surface-muted hover:bg-surface text-sm font-medium text-foreground transition-base"
                  >
                    <Plus size={13} /> Add notification
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "queue-work-hours" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Customize how and when your agent should process events from this trigger. By configuring the following settings, you can ensure that triggers are processed in a manner that aligns with your work habits.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={qwhEnabled} onChange={e => setQwhEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">Enabled</span>
              </label>
              <div className={`space-y-4 transition-base ${qwhEnabled ? "" : "opacity-40"}`}>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Timezone</label>
                  <select value={qwhTimezone} onChange={e => setQwhTimezone(e.target.value)} disabled={!qwhEnabled} className="ds-input h-9 disabled:cursor-not-allowed">
                    {TIMEZONE_OPTIONS.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Work days</label>
                  <ChipMultiSelect options={WORK_DAY_OPTIONS} value={qwhWorkDays} onChange={setQwhWorkDays} placeholder="Select work days" disabled={!qwhEnabled} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Work hours</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time" value={qwhStartTime} onChange={e => setQwhStartTime(e.target.value)}
                      disabled={!qwhEnabled || qwhAllDay}
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">to</span>
                    <input
                      type="time" value={qwhEndTime} onChange={e => setQwhEndTime(e.target.value)}
                      disabled={!qwhEnabled || qwhAllDay}
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base disabled:cursor-not-allowed"
                    />
                    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                      <input type="checkbox" checked={qwhAllDay} onChange={e => setQwhAllDay(e.target.checked)} disabled={!qwhEnabled} className="w-4 h-4 accent-primary" />
                      <span className="text-xs">All day</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Tasks to process per period</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} value={qwhTasksPerPeriod} onChange={e => setQwhTasksPerPeriod(e.target.value)}
                      disabled={!qwhEnabled}
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base disabled:cursor-not-allowed"
                    />
                    <select
                      value={qwhTasksPeriodUnit}
                      onChange={e => setQwhTasksPeriodUnit(e.target.value as "hour" | "day")}
                      disabled={!qwhEnabled}
                      className="w-32 shrink-0 ds-input h-9 disabled:cursor-not-allowed"
                    >
                      {TASKS_PERIOD_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <button
            type="button"
            onClick={step === "main" ? () => onOpenChange(false) : stepBack}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            {step === "main" ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={primaryAction}
            disabled={(step === "connected-accounts" && !accountId) || detailsInvalid}
            className="btn-primary h-9 px-4 disabled:opacity-40 disabled:pointer-events-none"
          >
            {primaryLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialField({ authType, value, onChange, error }: {
  authType: CredentialAuthType;
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  void tick;
  const credentials = credentialStore.list(authType);
  const selected = credentials.find(c => c.id === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm text-left flex items-center justify-between transition-base ${
          error ? "border-destructive" : open ? "border-primary" : "border-border hover:border-primary/40"
        }`}
      >
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? selected.name : "Select credential"}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-white shadow-elev p-1.5">
          {credentials.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">No Result</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-0.5 mb-1">
              {credentials.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-base hover:bg-surface-muted ${
                    c.id === value ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); setCreateOpen(true); }}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-semibold text-primary hover:bg-primary-soft transition-base"
          >
            <Plus size={14} /> Create credential
          </button>
        </div>
      )}

      <CreateCredentialDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        authType={authType}
        onCreated={rec => { onChange(rec.id); setTick(t => t + 1); }}
      />
    </div>
  );
}

function ChipMultiSelect({ options, value, onChange, placeholder, disabled }: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const available = options.filter(o => !value.includes(o.value));
  const remove = (v: string) => onChange(value.filter(x => x !== v));
  const add = (v: string) => { onChange([...value, v]); setOpen(false); };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full min-h-9 px-2 py-1.5 rounded-lg border bg-surface flex items-center flex-wrap gap-1.5 transition-base ${
          disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
        } ${open ? "border-primary" : "border-border"}`}
      >
        {value.length === 0 && <span className="text-sm text-muted-foreground px-1">{placeholder}</span>}
        {value.map(v => {
          const opt = options.find(o => o.value === v);
          return (
            <span key={v} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-primary-soft text-primary text-xs font-medium">
              {opt?.label ?? v}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); remove(v); }}
                className="hover:bg-primary/20 rounded p-0.5 transition-base"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
        <ChevronDown size={14} className={`ml-auto text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-white shadow-elev py-1 max-h-48 overflow-y-auto">
          {available.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No more options</p>
          ) : (
            available.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => add(o.value)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base"
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
