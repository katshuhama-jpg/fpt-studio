import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  triggerStore, type TriggerRecord, type TriggerType, type ScheduleFrequency, type CustomScheduleUnit,
  type WebhookAuthType, type ExternalApp, TIMEZONE_OPTIONS, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META, EXTERNAL_APP_ORDER,
  WORK_DAY_OPTIONS, TASKS_PERIOD_UNIT_OPTIONS, DRIVE_OPTIONS, DRIVE_FOLDER_OPTIONS,
} from "./triggerStore";
import { connectedAccountStore } from "./connectedAccountStore";
import { credentialStore, type CredentialAuthType } from "./credentialStore";
import { checkCronExpression, describeCronVN } from "./cronUtils";
import CreateCredentialDialog from "./CreateCredentialDialog";
import AppLogo from "./AppLogo";
import { perUserConnector } from "./agentAutomationGuard";
import { TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON } from "./agentPublishStore";
import { CATALOG as CONNECTOR_CATALOG } from "./ConnectionsTab";
import { toast } from "sonner";
import { Clock, Webhook, Globe, Copy, Check, ChevronDown, ChevronLeft, Plus, X, RefreshCw, AlertTriangle, Info } from "lucide-react";

const SAMPLE_PAYLOAD = JSON.stringify({ event: "order.created", order_id: "12345", customer_id: "789" }, null, 2);

const NAME_MAX = 50;
const DESC_MAX = 200;

const CATEGORY_OPTIONS: { value: TriggerType; label: string; icon: any; desc: string }[] = [
  { value: "scheduled", label: "Lịch", icon: Clock, desc: "Chạy agent tự động theo lịch lặp lại." },
  { value: "developer", label: "Webhook", icon: Webhook, desc: "Nhận một URL để hệ thống bên ngoài gọi (POST) và kích hoạt agent." },
  { value: "external", label: "Ứng dụng bên ngoài", icon: Globe, desc: "Kích hoạt agent khi có sự kiện ở ứng dụng khác." },
];

const PRIMARY_FREQUENCY_OPTIONS: { value: Exclude<CustomScheduleUnit, "cron">; label: string }[] = [
  { value: "minute", label: "Theo phút" },
  { value: "hour", label: "Theo giờ" },
  { value: "day", label: "Hằng ngày" },
  { value: "week", label: "Hằng tuần" },
  { value: "month", label: "Hằng tháng" },
  { value: "year", label: "Hằng năm" },
];

const WEEKDAY_CHIPS: { value: number; label: string }[] = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const MONTH_OPTIONS: { value: number; label: string }[] = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
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

const AUTH_OPTIONS: { value: WebhookAuthType; label: string }[] = [
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
];

function generateWebhookId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let id = "";
  for (let i = 0; i < 25; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

type WizardStep = "main" | "details" | "app" | "app-config";

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
  const [lastNonCronUnit, setLastNonCronUnit] = useState<Exclude<CustomScheduleUnit, "cron">>("day");
  const [intervalValue, setIntervalValue] = useState("");
  const [cron, setCron] = useState("0 9 * * 1");
  const [timezone, setTimezone] = useState("GMT+07:00");

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [authentication, setAuthentication] = useState<WebhookAuthType>("bearer");
  const [credentialId, setCredentialId] = useState("");
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [payloadJson, setPayloadJson] = useState(SAMPLE_PAYLOAD);
  const [requiredFields, setRequiredFields] = useState("");

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

  // External — Queue Work Hours (shared)
  const [qwhEnabled, setQwhEnabled] = useState(false);
  const [qwhTimezone, setQwhTimezone] = useState("GMT+07:00");
  const [qwhWorkDays, setQwhWorkDays] = useState<string[]>(["weekdays"]);
  const [qwhStartTime, setQwhStartTime] = useState("09:00");
  const [qwhEndTime, setQwhEndTime] = useState("17:00");
  const [qwhAllDay, setQwhAllDay] = useState(false);
  const [qwhTasksPerPeriod, setQwhTasksPerPeriod] = useState("10");
  const [qwhTasksPeriodUnit, setQwhTasksPeriodUnit] = useState<"hour" | "day" | "week">("day");

  const [errors, setErrors] = useState<{
    name?: string; description?: string; schedule?: string; credential?: string; payload?: string; requiredFields?: string;
    qwhWorkDays?: string; qwhTime?: string; qwhTasksPerPeriod?: string;
  }>({});
  const [qwhOpen, setQwhOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");

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
    setLastNonCronUnit(unit === "cron" ? "day" : unit);
    setIntervalValue(sched?.intervalValue != null ? String(sched.intervalValue) : "");
    setCron(sched?.cron ?? "0 9 * * 1");
    setTimezone(sched?.timezone ?? "GMT+07:00");

    const dev = t?.config.developer;
    setWebhookUrl(dev?.webhookUrl ?? `https://agents.fpt.ai/console/api/webhooks/triggers/${generateWebhookId()}`);
    setAuthentication(dev?.authentication ?? "bearer");
    setCredentialId(dev?.credentialId ?? "");
    setPayloadJson(dev?.payloadSchema ?? SAMPLE_PAYLOAD);
    setRequiredFields(dev?.requiredFields?.join(", ") ?? "");

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
    const qwh = ext?.queueWorkHours;
    setQwhEnabled(qwh?.enabled ?? false);
    setQwhTimezone(qwh?.timezone ?? "GMT+07:00");
    setQwhWorkDays(qwh?.workDays ?? ["weekdays"]);
    setQwhStartTime(qwh?.startTime ?? "09:00");
    setQwhEndTime(qwh?.endTime ?? "17:00");
    setQwhAllDay(qwh?.allDay ?? false);
    setQwhTasksPerPeriod(qwh?.tasksPerPeriod != null ? String(qwh.tasksPerPeriod) : "10");
    setQwhTasksPeriodUnit(qwh?.tasksPeriodUnit ?? "day");

    setInitialSnapshot(JSON.stringify({
      name: t?.name ?? "", description: t?.description ?? "", category: cat,
      timeOfDay: sched?.timeOfDay ?? "08:00", weekDays: sched?.weekDays?.length ? sched.weekDays : [1],
      dayOfMonth: sched?.dayOfMonth ?? 1, month: sched?.month ?? 0, startTime: sched?.startTime ?? defaultStartTime(),
      customUnit: unit, intervalValue: sched?.intervalValue != null ? String(sched.intervalValue) : "",
      cron: sched?.cron ?? "0 9 * * 1", timezone: sched?.timezone ?? "GMT+07:00",
      authentication: dev?.authentication ?? "bearer", credentialId: dev?.credentialId ?? "",
      payloadJson: dev?.payloadSchema ?? SAMPLE_PAYLOAD, requiredFields: dev?.requiredFields?.join(", ") ?? "",
      app: extApp, accountId: ext?.accountId ?? "", event: ext?.event ?? EXTERNAL_APP_EVENTS[extApp][0].value,
      gmailMode: ext?.gmailMode ?? "inbox", includeAttachments: ext?.includeAttachments ?? true,
      filterSearch: ext?.filterSearch ?? "", excludeEmails: ext?.excludeEmails ?? [],
      driveId: ext?.driveId ?? "my-drive", driveFolders: ext?.driveFolders ?? [], customProperties: ext?.customProperties ?? false,
      qwhEnabled: qwh?.enabled ?? false, qwhTimezone: qwh?.timezone ?? "GMT+07:00", qwhWorkDays: qwh?.workDays ?? ["weekdays"],
      qwhStartTime: qwh?.startTime ?? "09:00", qwhEndTime: qwh?.endTime ?? "17:00", qwhAllDay: qwh?.allDay ?? false,
      qwhTasksPerPeriod: qwh?.tasksPerPeriod != null ? String(qwh.tasksPerPeriod) : "10", qwhTasksPeriodUnit: qwh?.tasksPeriodUnit ?? "day",
    }));
  }, [open, trigger]);

  const isDuplicateName = name.trim() !== "" && triggerStore.isDuplicateName(agentId, name, trigger?.id);

  const validateBasics = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Vui lòng nhập tên";
    else if (name.trim().length > NAME_MAX) e.name = `Tên không quá ${NAME_MAX} ký tự`;
    else if (isDuplicateName) e.name = "Agent này đã có trigger dùng tên này. Hãy chọn tên khác.";
    if (!description.trim()) e.description = "Vui lòng nhập mô tả";
    else if (description.length > DESC_MAX) e.description = `Mô tả không quá ${DESC_MAX} ký tự`;
    return e;
  };

  const validateDetails = () => {
    const e: typeof errors = {};
    if (category === "scheduled") {
      if (customUnit === "cron") {
        const check = checkCronExpression(cron);
        if (!check.valid) e.schedule = "Biểu thức Cron chưa đúng định dạng. Ví dụ hợp lệ: 0 9 * * 1";
        else if (check.tooFrequent) e.schedule = "Cron không được chạy dày hơn mỗi 10 phút.";
      }
      if (customUnit === "minute" && Number(intervalValue) < 10) {
        e.schedule = "Tối thiểu 10 phút.";
      }
      if (customUnit === "hour" && Number(intervalValue) < 1) {
        e.schedule = "Tối thiểu 1 giờ.";
      }
      if (customUnit === "week" && weekDays.length === 0) {
        e.schedule = "Hãy chọn ngày chạy.";
      }
      if (customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31)) {
        e.schedule = "Hãy chọn ngày chạy.";
      }
      if (!e.schedule && ["day", "week", "month", "year"].includes(customUnit) && !timeOfDay) {
        e.schedule = "Hãy chọn giờ chạy.";
      }
    }
    if (category === "developer") {
      if (!credentialId) {
        e.credential = "Chọn một credential để bảo vệ webhook trước khi bật.";
      }
      let parsedPayload: any;
      try {
        if (payloadJson.trim()) parsedPayload = JSON.parse(payloadJson);
      } catch {
        e.payload = "JSON chưa đúng định dạng. Kiểm tra lại dấu ngoặc và dấu phẩy.";
      }
      const fields = requiredFields.split(",").map(f => f.trim()).filter(Boolean);
      if (fields.length && parsedPayload && typeof parsedPayload === "object") {
        const missing = fields.find(f => !(f in parsedPayload));
        if (missing) e.requiredFields = `Trường "${missing}" không có trong payload dự kiến.`;
      }
    }
    if (category === "external" && qwhEnabled) {
      if (qwhWorkDays.length === 0) e.qwhWorkDays = "Chọn ít nhất một ngày làm việc.";
      if (!qwhAllDay && qwhStartTime >= qwhEndTime) e.qwhTime = "Giờ bắt đầu phải sớm hơn giờ kết thúc.";
      const n = Number(qwhTasksPerPeriod);
      if (!Number.isInteger(n) || n < 1 || n > 1000) e.qwhTasksPerPeriod = "Nhập số từ 1 đến 1000.";
    }
    return e;
  };

  const submit = () => {
    const eBasics = validateBasics();
    const eDetails = validateDetails();
    const e = { ...eBasics, ...eDetails };
    setErrors(e);
    if (Object.keys(e).length) {
      setStep(eBasics.name || eBasics.description ? "main" : category === "external" ? "app-config" : "details");
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
      const fields = requiredFields.split(",").map(f => f.trim()).filter(Boolean);
      config.developer = {
        webhookUrl,
        authentication,
        credentialId,
        ...(payloadJson.trim() ? { payloadSchema: payloadJson.trim() } : {}),
        ...(fields.length ? { requiredFields: fields } : {}),
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

    const trimmedName = name.trim();
    if (mode === "create") {
      const rec = triggerStore.create(agentId, {
        name: trimmedName,
        type: category,
        enabled: true,
        description: description.trim(),
        config,
      });
      if (!rec) {
        // Backstop: every entry point that opens this wizard already checks
        // perUserConnector() first, so this should be unreachable — but if it's ever
        // reached anyway, fail loudly instead of silently discarding what was entered.
        const blocked = perUserConnector(agentId);
        const blockedName = blocked ? (CONNECTOR_CATALOG.find(c => c.id === blocked.connectorId)?.name ?? blocked.connectorId) : "";
        toast.error(TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON(blockedName));
        return;
      }
      toast.success(`Created trigger "${trimmedName}".`);
      onSubmitted?.(rec);
    } else if (trigger) {
      triggerStore.update(agentId, trigger.id, {
        name: trimmedName,
        type: category,
        description: description.trim(),
        config,
      });
      toast.success(`Updated trigger "${trimmedName}".`);
      onSubmitted?.({ ...trigger, name: trimmedName, type: category, description: description.trim(), config });
    }
    onOpenChange(false);
  };

  const stepBack = () => {
    if (step === "details") setStep("main");
    else if (step === "app") setStep("main");
    else if (step === "app-config") setStep("app");
  };

  const selectedAccount = accountId ? connectedAccountStore.get(accountId) : undefined;
  const connectionExpired = !!selectedAccount?.expired;
  const noAccountSelected = step === "app" && !accountId;

  const primaryAction = () => {
    if (step === "main") {
      const e = validateBasics();
      setErrors(e);
      if (Object.keys(e).length) return;
      if (category === "external") setStep("app");
      else setStep("details");
      return;
    }
    if (step === "details") { submit(); return; }
    if (step === "app") {
      if (!accountId) { toast.error("Hãy chọn một tài khoản để tiếp tục."); return; }
      if (connectionExpired) return;
      setStep("app-config");
      return;
    }
    submit();
  };

  // The working-hours block used to be its own final step; it's now a collapsed accordion
  // inside "Sự kiện & điều kiện", so app-config is the real final step for external triggers.
  const primaryLabel =
    step === "app-config"
      ? (mode === "create"
          ? (qwhEnabled ? "Tạo trigger" : "Tạo — xử lý sự kiện ngay khi đến")
          : (qwhEnabled ? "Lưu trigger" : "Lưu — xử lý sự kiện ngay khi đến"))
      : step === "details" ? (mode === "create" ? "Tạo" : "Lưu") : "Tiếp tục";

  const connectedAccounts = connectedAccountStore.list(app);
  const categoryHeading = category === "scheduled" ? "Lịch lặp lại"
    : category === "developer" ? "Webhook"
    : EXTERNAL_APP_META[app].label;

  const stepSequence: WizardStep[] = category === "external"
    ? ["main", "app", "app-config"]
    : ["main", "details"];
  const stepIndex = stepSequence.indexOf(step);
  const stepTotal = stepSequence.length;

  const cronCheck = checkCronExpression(cron);
  const detailsInvalid = (step === "details" || step === "app-config") && Object.keys(validateDetails()).length > 0;

  const currentSnapshot = JSON.stringify({
    name, description, category,
    timeOfDay, weekDays, dayOfMonth, month, startTime, customUnit, intervalValue, cron, timezone,
    authentication, credentialId, payloadJson, requiredFields,
    app, accountId, event, gmailMode, includeAttachments, filterSearch, excludeEmails,
    driveId, driveFolders, customProperties,
    qwhEnabled, qwhTimezone, qwhWorkDays, qwhStartTime, qwhEndTime, qwhAllDay, qwhTasksPerPeriod, qwhTasksPeriodUnit,
  });
  const hasUnsavedInput = initialSnapshot !== "" && currentSnapshot !== initialSnapshot;
  const requestClose = () => {
    if (hasUnsavedInput) setConfirmDiscardOpen(true);
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) requestClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-1.5 pr-6">
            {step !== "main" ? (
              <button
                type="button"
                onClick={stepBack}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base w-fit"
              >
                <ChevronLeft size={13} /> Quay lại
              </button>
            ) : <span />}
            {stepTotal > 1 && (
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                Bước {stepIndex + 1}/{stepTotal}
              </span>
            )}
          </div>
          <DialogTitle className="font-display flex items-center gap-2">
            {step === "main" ? (mode === "create" ? "Tạo Trigger mới" : "Chỉnh sửa trigger")
              : step === "details" ? categoryHeading
              : step === "app" ? "Chọn ứng dụng"
              : step === "app-config" ? `${EXTERNAL_APP_META[app].label} — Sự kiện & điều kiện`
              : EXTERNAL_APP_META[app].label}
            {step === "details" && category === "scheduled" && customUnit === "cron" && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded chip-accent">CRON</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto px-6 py-4">
          {step === "main" && (
            <>
              {mode === "edit" && (() => {
                const opt = CATEGORY_OPTIONS.find(o => o.value === category);
                const Icon = opt?.icon ?? Clock;
                return (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface-muted/60">
                    <Icon size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{opt?.label ?? categoryHeading}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Không đổi được loại trigger. Tạo trigger mới nếu muốn dùng loại khác.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {mode === "create" && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">Loại</label>
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
                        <div className="text-[11px] text-muted-foreground leading-snug">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              <div className="rounded-xl border border-border bg-surface/60 p-3 space-y-3">
                <div>
                  <label className="text-xs font-medium flex items-center justify-between mb-1.5">
                    <span>Tên <span className="text-destructive">*</span></span>
                    <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(er => ({ ...er, name: undefined })); }}
                    onBlur={() => {
                      if (isDuplicateName) setErrors(er => ({ ...er, name: "Agent này đã có trigger dùng tên này. Hãy chọn tên khác." }));
                    }}
                    placeholder="ví dụ: Báo cáo hằng ngày"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      errors.name ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium flex items-center justify-between mb-1.5">
                    <span>Mô tả <span className="text-destructive">*</span></span>
                    <span className="text-[10px] font-mono text-muted-foreground">{description.length}/{DESC_MAX}</span>
                  </label>
                  <textarea
                    value={description}
                    rows={2}
                    onChange={e => { setDescription(e.target.value); if (errors.description) setErrors(er => ({ ...er, description: undefined })); }}
                    placeholder="Trigger này dùng để làm gì?"
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
              {customUnit !== "cron" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Tần suất</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIMARY_FREQUENCY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setCustomUnit(opt.value);
                          setLastNonCronUnit(opt.value);
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
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Cần lịch phức tạp hơn?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUnit("cron");
                        if (errors.schedule) setErrors(er => ({ ...er, schedule: undefined }));
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Dùng Cron (nâng cao)
                    </button>
                  </p>
                </div>
              )}

              {customUnit === "minute" && (
                <>
                  <div>
                    <input
                      type="number" min={10}
                      value={intervalValue}
                      onChange={e => setIntervalValue(e.target.value)}
                      placeholder="Số phút"
                      className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                        intervalValue !== "" && Number(intervalValue) < 10 ? "border-destructive" : "border-border focus:border-primary"
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${intervalValue !== "" && Number(intervalValue) < 10 ? "text-destructive" : "text-muted-foreground"}`}>
                      Tối thiểu 10 phút.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Giờ bắt đầu</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Lịch được tính từ giờ bắt đầu. Ví dụ: giờ bắt đầu 10:00, mỗi 15 phút → 10:00, 10:15, 10:30…
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
                      placeholder="Số giờ"
                      className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                        intervalValue !== "" && Number(intervalValue) < 1 ? "border-destructive" : "border-border focus:border-primary"
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${intervalValue !== "" && Number(intervalValue) < 1 ? "text-destructive" : "text-muted-foreground"}`}>
                      Tối thiểu 1 giờ.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Giờ bắt đầu</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Lịch được tính từ giờ bắt đầu. Ví dụ: giờ bắt đầu 10:00, mỗi 2 giờ → 10:00, 12:00, 14:00…
                    </p>
                  </div>
                </>
              )}

              {customUnit === "year" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Tháng</label>
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
                  <p className="mt-1 text-[11px] text-muted-foreground">Tháng mà trigger này chạy hằng năm.</p>
                </div>
              )}

              {(customUnit === "month" || customUnit === "year") && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Ngày trong tháng</label>
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
                      if (v >= 1 && v <= 31 && errors.schedule === "Hãy chọn ngày chạy.") setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    onBlur={() => {
                      if (customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31)) {
                        setErrors(er => ({ ...er, schedule: "Hãy chọn ngày chạy." }));
                      }
                    }}
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      customUnit === "month" && errors.schedule === "Hãy chọn ngày chạy." ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {customUnit === "month" && errors.schedule === "Hãy chọn ngày chạy." ? (
                    <p className="mt-1 text-[11px] text-destructive">Hãy chọn ngày chạy.</p>
                  ) : customUnit === "year" && month === 1 && dayOfMonth === 29 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Ngày 29/2 chỉ có trong năm nhuận. Các năm khác, agent sẽ chạy vào ngày 28/2.
                    </p>
                  ) : customUnit === "month" && [29, 30, 31].includes(dayOfMonth) ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Những tháng không có ngày {dayOfMonth} sẽ chạy agent vào ngày cuối cùng của tháng đó.
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">Ngày trong tháng mà trigger này chạy.</p>
                  )}
                </div>
              )}

              {["day", "week", "month", "year"].includes(customUnit) && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Giờ chạy</label>
                  <input
                    type="time" value={timeOfDay}
                    onChange={e => {
                      setTimeOfDay(e.target.value);
                      if (e.target.value && errors.schedule === "Hãy chọn giờ chạy.") setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    onBlur={() => {
                      if (!timeOfDay) setErrors(er => ({ ...er, schedule: "Hãy chọn giờ chạy." }));
                    }}
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      errors.schedule === "Hãy chọn giờ chạy." ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.schedule === "Hãy chọn giờ chạy." ? (
                    <p className="mt-1 text-[11px] text-destructive">Hãy chọn giờ chạy.</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">Giờ trigger chạy, theo múi giờ bên dưới.</p>
                  )}
                </div>
              )}
              {customUnit === "week" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Ngày trong tuần</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_CHIPS.map(d => {
                      const active = weekDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            const next = active ? weekDays.filter(x => x !== d.value) : [...weekDays, d.value];
                            setWeekDays(next);
                            if (next.length === 0) setErrors(er => ({ ...er, schedule: "Hãy chọn ngày chạy." }));
                            else if (errors.schedule === "Hãy chọn ngày chạy.") setErrors(er => ({ ...er, schedule: undefined }));
                          }}
                          className={`h-8 rounded-lg text-xs font-medium transition-base ${
                            active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.schedule === "Hãy chọn ngày chạy." ? (
                    <p className="mt-1 text-[11px] text-destructive">Hãy chọn ngày chạy.</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">Các ngày trong tuần agent sẽ chạy.</p>
                  )}
                </div>
              )}
              {customUnit === "cron" && (
                <div>
                  <button
                    type="button"
                    onClick={() => setCustomUnit(lastNonCronUnit)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-base mb-2"
                  >
                    <ChevronLeft size={11} /> Quay về lịch cơ bản
                  </button>
                  <label className="text-xs font-medium mb-1.5 block">Biểu thức Cron</label>
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
                      if (!check.valid) setErrors(er => ({ ...er, schedule: "Biểu thức Cron chưa đúng định dạng. Ví dụ hợp lệ: 0 9 * * 1" }));
                      else if (check.tooFrequent) setErrors(er => ({ ...er, schedule: "Cron không được chạy dày hơn mỗi 10 phút." }));
                      else setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    placeholder="0 8 * * 1-5"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                      errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Định dạng cron chuẩn: phút · giờ · ngày · tháng · thứ</p>
                  {errors.schedule ? (
                    <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>
                  ) : cronCheck.valid && !cronCheck.tooFrequent && (
                    <p className="mt-1 text-[11px] text-success">{describeCronVN(cron)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1.5 block">Múi giờ</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} className="ds-input h-9">
                  {TIMEZONE_OPTIONS.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">Dùng để tính toàn bộ mốc giờ ở trên.</p>
              </div>
            </div>
          )}

          {step === "details" && category === "developer" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Webhook URL</label>
                <div className="flex items-start gap-1.5">
                  <div
                    title={webhookUrl}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-muted text-xs font-mono text-muted-foreground break-all"
                  >
                    {webhookUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(webhookUrl).catch(() => {});
                      setWebhookCopied(true);
                      toast.success("Đã sao chép webhook URL.");
                      setTimeout(() => setWebhookCopied(false), 1500);
                    }}
                    className="w-9 h-9 shrink-0 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                    aria-label="Sao chép webhook URL"
                  >
                    {webhookCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Gửi URL này cho bên sẽ gọi sự kiện tới.</p>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Phương thức xác thực <span className="text-destructive">*</span>
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

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  {authentication === "bearer" ? "Token" : "Credential cho Basic Auth"} <span className="text-destructive">*</span>
                </label>
                <CredentialField
                  authType={authentication}
                  value={credentialId}
                  onChange={id => { setCredentialId(id); if (errors.credential) setErrors(er => ({ ...er, credential: undefined })); }}
                  error={errors.credential}
                />
                {errors.credential && <p className="mt-1 text-[11px] text-destructive">{errors.credential}</p>}
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  Credential của Trigger là credential Dùng chung ở cấp Workspace, có thể khác với credential của Connector.
                </p>
              </div>

              <div className="pt-1 border-t border-border">
                <label className="text-xs font-medium mb-1.5 block mt-3">
                  Payload dự kiến (JSON) <span className="text-[10px] font-normal text-muted-foreground">Tuỳ chọn</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Một mẫu dữ liệu mà hệ thống bên ngoài sẽ gửi. Dùng để biết agent đọc được trường nào.
                </p>
                <textarea
                  value={payloadJson}
                  rows={5}
                  onChange={e => { setPayloadJson(e.target.value); if (errors.payload) setErrors(er => ({ ...er, payload: undefined })); }}
                  onBlur={() => {
                    try {
                      if (payloadJson.trim()) JSON.parse(payloadJson);
                      setErrors(er => ({ ...er, payload: undefined }));
                    } catch {
                      setErrors(er => ({ ...er, payload: "JSON chưa đúng định dạng. Kiểm tra lại dấu ngoặc và dấu phẩy." }));
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-lg border bg-surface text-xs font-mono outline-none resize-none transition-base ${
                    errors.payload ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
                {errors.payload && <p className="mt-1 text-[11px] text-destructive">{errors.payload}</p>}
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Trường bắt buộc <span className="text-[10px] font-normal text-muted-foreground">Tuỳ chọn</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Lần chạy sẽ bị từ chối nếu thiếu các trường này trong payload. Để trống nếu chấp nhận mọi payload.
                </p>
                <input
                  value={requiredFields}
                  onChange={e => { setRequiredFields(e.target.value); if (errors.requiredFields) setErrors(er => ({ ...er, requiredFields: undefined })); }}
                  onBlur={() => setErrors(er => ({ ...er, requiredFields: validateDetails().requiredFields }))}
                  placeholder="ví dụ: event, order_id"
                  className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                    errors.requiredFields ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
                {errors.requiredFields && <p className="mt-1 text-[11px] text-destructive">{errors.requiredFields}</p>}
              </div>
              <p className="text-[11px] text-muted-foreground">Payload sẽ được đưa vào ngữ cảnh của agent khi trigger này chạy.</p>
            </div>
          )}

          {step === "app" && (
            <div className="space-y-4">
              {mode === "create" ? (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Ứng dụng</label>
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
              ) : (
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface-muted/60">
                  <AppLogo app={app} size={22} />
                  <div>
                    <p className="text-sm font-medium">{EXTERNAL_APP_META[app].label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Không đổi được loại trigger. Tạo trigger mới nếu muốn dùng ứng dụng khác.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Tài khoản đã kết nối</h4>
                <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-surface-muted/60">
                  <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Tài khoản này được dùng chung cho mọi người dùng của agent. Trigger được setup ở Workspace,
                    không phải tài khoản cá nhân của từng người.
                  </p>
                </div>
                <div className="space-y-1.5 mb-1">
                  {connectedAccounts.length === 0 && (
                    <p className="text-xs text-muted-foreground py-1">Chưa có tài khoản nào được kết nối.</p>
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
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                        style={{ background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #C7D2FE" }}
                      >
                        Dùng chung
                      </span>
                      {acct.expired && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 chip-warning">Hết hạn</span>
                      )}
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
                {noAccountSelected && (
                  <p className="text-[11px] text-destructive mb-3">Hãy chọn một tài khoản để tiếp tục.</p>
                )}

                {connectionExpired && (
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-[hsl(var(--warning-soft))] border border-warning/25">
                    <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-warning">
                        Kết nối tới {EXTERNAL_APP_META[app].label} đã hết hạn. Vui lòng kết nối lại để tiếp tục.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (accountId) connectedAccountStore.reconnect(accountId); setAccountsTick(t => t + 1); }}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-warning/30 text-[11px] font-semibold text-warning hover:bg-warning/5 transition-base shrink-0"
                    >
                      <RefreshCw size={11} /> Kết nối lại
                    </button>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const acct = connectedAccountStore.connect(app, `you+${app}@fptsmartcloud.com`);
                      setAccountId(acct.id);
                      setAccountsTick(t => t + 1);
                      toast.success("Đã kết nối tài khoản.");
                    }}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
                  >
                    <Plus size={14} /> Kết nối tài khoản
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "app-config" && (
            <div className="space-y-5">
              {accountId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted">
                  <AppLogo app={app} size={18} />
                  <span className="text-xs font-medium text-foreground truncate flex-1">
                    {connectedAccountStore.get(accountId)?.email}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1.5 block">Sự kiện <span className="text-destructive">*</span></label>
                <div className="space-y-1.5">
                  {EXTERNAL_APP_EVENTS[app].map(ev => (
                    <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="external-event"
                        checked={event === ev.value}
                        onChange={() => setEvent(ev.value)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm">{ev.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {app === "gmail" && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Phạm vi <span className="text-destructive">*</span></label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="radio" name="gmail-mode" checked={gmailMode === "inbox"} onChange={() => setGmailMode("inbox")} className="w-4 h-4 accent-primary" />
                        <span className="text-sm">Toàn bộ email trong hộp thư đến</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="radio" name="gmail-mode" checked={gmailMode === "outreach_replies"} onChange={() => setGmailMode("outreach_replies")} className="w-4 h-4 accent-primary" />
                        <span className="text-sm">Chỉ email trả lời chiến dịch outreach</span>
                      </label>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">Bao gồm tệp đính kèm</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Lọc theo từ khoá</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Lọc email theo cú pháp tìm kiếm của Google Mail.{" "}
                      <a
                        href="https://support.google.com/mail/answer/7190"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Xem hướng dẫn
                      </a>
                      .
                    </p>
                    <input
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      placeholder="ví dụ: from:sales@acme.com"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Loại trừ email từ</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Bỏ qua email từ các địa chỉ chứa giá trị bên dưới.</p>
                    {excludeEmails.map((email, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          value={email}
                          onChange={e => setExcludeEmails(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                          placeholder="Nhập một email…"
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
                      <Plus size={13} /> Thêm email
                    </button>
                  </div>
                </>
              )}

              {app === "gdrive" && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Drive</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Chọn drive cần theo dõi thay đổi.</p>
                    <select value={driveId} onChange={e => setDriveId(e.target.value)} className="ds-input h-9">
                      {DRIVE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Thư mục <span className="text-[10px] font-normal text-muted-foreground">Tuỳ chọn</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Giới hạn theo thư mục cụ thể. Để trống để theo dõi toàn bộ drive.</p>
                    <ChipMultiSelect options={DRIVE_FOLDER_OPTIONS} value={driveFolders} onChange={setDriveFolders} placeholder="Toàn bộ drive" />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={customProperties} onChange={e => setCustomProperties(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">Cũng chạy khi custom properties của tệp thay đổi, không chỉ nội dung.</span>
                  </label>
                </>
              )}

              <QueueWorkHoursAccordion
                open={qwhOpen}
                onToggle={() => setQwhOpen(o => !o)}
                enabled={qwhEnabled}
                onEnabledChange={setQwhEnabled}
                timezone={qwhTimezone}
                onTimezoneChange={setQwhTimezone}
                workDays={qwhWorkDays}
                onWorkDaysChange={setQwhWorkDays}
                startTime={qwhStartTime}
                onStartTimeChange={setQwhStartTime}
                endTime={qwhEndTime}
                onEndTimeChange={setQwhEndTime}
                allDay={qwhAllDay}
                onAllDayChange={setQwhAllDay}
                tasksPerPeriod={qwhTasksPerPeriod}
                onTasksPerPeriodChange={setQwhTasksPerPeriod}
                tasksPeriodUnit={qwhTasksPeriodUnit}
                onTasksPeriodUnitChange={setQwhTasksPeriodUnit}
                errors={errors}
                onClearError={key => setErrors(er => ({ ...er, [key]: undefined }))}
                onValidate={() => {
                  const v = validateDetails();
                  setErrors(er => ({ ...er, qwhWorkDays: v.qwhWorkDays, qwhTime: v.qwhTime, qwhTasksPerPeriod: v.qwhTasksPerPeriod }));
                }}
              />
            </div>
          )}

        </div>

        <DialogFooter className="mt-0 px-6 pb-6 pt-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={step === "main" ? requestClose : stepBack}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            {step === "main" ? "Huỷ" : "Quay lại"}
          </button>
          <button
            type="button"
            onClick={primaryAction}
            aria-disabled={noAccountSelected}
            disabled={
              (step === "main" && isDuplicateName) ||
              (step === "app" && connectionExpired) ||
              detailsInvalid
            }
            className={`h-9 px-4 btn-primary disabled:opacity-40 disabled:pointer-events-none ${
              noAccountSelected ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {primaryLabel}
          </button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời đi mà không lưu?</AlertDialogTitle>
            <AlertDialogDescription>Nội dung trigger bạn vừa nhập sẽ không được lưu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmDiscardOpen(false); onOpenChange(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rời đi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

/** Was its own final wizard step; folded into "Sự kiện & điều kiện" as a collapsed accordion
 * so the External-app wizard stays at 4 total steps (main, app, app-config) instead of
 * growing an extra one every time a setting gets added to it. */
function QueueWorkHoursAccordion({
  open, onToggle, enabled, onEnabledChange, timezone, onTimezoneChange, workDays, onWorkDaysChange,
  startTime, onStartTimeChange, endTime, onEndTimeChange, allDay, onAllDayChange,
  tasksPerPeriod, onTasksPerPeriodChange, tasksPeriodUnit, onTasksPeriodUnitChange,
  errors, onClearError, onValidate,
}: {
  open: boolean; onToggle: () => void;
  enabled: boolean; onEnabledChange: (v: boolean) => void;
  timezone: string; onTimezoneChange: (v: string) => void;
  workDays: string[]; onWorkDaysChange: (v: string[]) => void;
  startTime: string; onStartTimeChange: (v: string) => void;
  endTime: string; onEndTimeChange: (v: string) => void;
  allDay: boolean; onAllDayChange: (v: boolean) => void;
  tasksPerPeriod: string; onTasksPerPeriodChange: (v: string) => void;
  tasksPeriodUnit: "hour" | "day" | "week"; onTasksPeriodUnitChange: (v: "hour" | "day" | "week") => void;
  errors: { qwhWorkDays?: string; qwhTime?: string; qwhTasksPerPeriod?: string };
  onClearError: (key: "qwhWorkDays" | "qwhTime" | "qwhTasksPerPeriod") => void;
  onValidate: () => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-muted transition-base"
      >
        <span className="text-sm font-medium">Giờ làm việc của hàng đợi (tuỳ chọn)</span>
        <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3.5 pt-1 space-y-4 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kiểm soát cách và thời điểm agent xử lý sự kiện từ trigger này. Cấu hình bên dưới để khớp với giờ làm việc của bạn.
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={enabled} onChange={e => onEnabledChange(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium">Bật</span>
          </label>
          {!enabled && (
            <p className="text-[11px] text-muted-foreground -mt-2">
              Chưa bật — agent sẽ xử lý mọi sự kiện ngay khi nhận được.
            </p>
          )}
          <div className={`space-y-4 transition-base ${enabled ? "" : "opacity-40"}`}>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Múi giờ</label>
              <select value={timezone} onChange={e => onTimezoneChange(e.target.value)} disabled={!enabled} className="ds-input h-9 disabled:cursor-not-allowed">
                {TIMEZONE_OPTIONS.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Ngày làm việc</label>
              <ChipMultiSelect
                options={WORK_DAY_OPTIONS}
                value={workDays}
                onChange={v => { onWorkDaysChange(v); if (errors.qwhWorkDays) onClearError("qwhWorkDays"); }}
                placeholder="Chọn ngày làm việc"
                disabled={!enabled}
              />
              {errors.qwhWorkDays && <p className="mt-1 text-[11px] text-destructive">{errors.qwhWorkDays}</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Giờ làm việc</label>
              <div className="flex items-center gap-2">
                <input
                  type="time" value={startTime}
                  onChange={e => { onStartTimeChange(e.target.value); if (errors.qwhTime) onClearError("qwhTime"); }}
                  onBlur={onValidate}
                  disabled={!enabled || allDay}
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base disabled:cursor-not-allowed"
                />
                <span className="text-xs text-muted-foreground shrink-0">đến</span>
                <input
                  type="time" value={endTime}
                  onChange={e => { onEndTimeChange(e.target.value); if (errors.qwhTime) onClearError("qwhTime"); }}
                  onBlur={onValidate}
                  disabled={!enabled || allDay}
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base disabled:cursor-not-allowed"
                />
                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                  <input type="checkbox" checked={allDay} onChange={e => onAllDayChange(e.target.checked)} disabled={!enabled} className="w-4 h-4 accent-primary" />
                  <span className="text-xs">Cả ngày</span>
                </label>
              </div>
              {errors.qwhTime && <p className="mt-1 text-[11px] text-destructive">{errors.qwhTime}</p>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Số tác vụ xử lý mỗi kỳ</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} value={tasksPerPeriod}
                  onChange={e => { onTasksPerPeriodChange(e.target.value); if (errors.qwhTasksPerPeriod) onClearError("qwhTasksPerPeriod"); }}
                  onBlur={onValidate}
                  disabled={!enabled}
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base disabled:cursor-not-allowed"
                />
                <select
                  value={tasksPeriodUnit}
                  onChange={e => onTasksPeriodUnitChange(e.target.value as "hour" | "day" | "week")}
                  disabled={!enabled}
                  className="w-32 shrink-0 ds-input h-9 disabled:cursor-not-allowed"
                >
                  {TASKS_PERIOD_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {errors.qwhTasksPerPeriod && <p className="mt-1 text-[11px] text-destructive">{errors.qwhTasksPerPeriod}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
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
          {selected ? selected.name : "Chọn một credential"}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-white shadow-elev p-1.5">
          {credentials.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">Không có kết quả</p>
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
            <Plus size={14} /> Tạo credential mới
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
