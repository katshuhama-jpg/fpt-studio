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
import { toast } from "sonner";
import { Clock, Webhook, Globe, Copy, Check, ChevronDown, ChevronLeft, Plus, X, RefreshCw, AlertTriangle } from "lucide-react";

const SAMPLE_PAYLOAD = JSON.stringify({ event: "order.created", order_id: "12345", customer_id: "789" }, null, 2);

const NAME_MAX = 50;
const DESC_MAX = 200;

const CATEGORY_OPTIONS: { value: TriggerType; label: string; icon: any; desc: string }[] = [
  { value: "scheduled", label: "Schedule", icon: Clock, desc: "Run the agent automatically on a repeating schedule." },
  { value: "developer", label: "Webhook", icon: Webhook, desc: "Get a single URL that an external system can call (POST) to fire this agent." },
  { value: "external", label: "External app", icon: Globe, desc: "Fire the agent when something happens in another app." },
];

const PRIMARY_FREQUENCY_OPTIONS: { value: Exclude<CustomScheduleUnit, "cron">; label: string }[] = [
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

type WizardStep = "main" | "details" | "app" | "app-config" | "queue-work-hours";

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
  const [qwhTasksPeriodUnit, setQwhTasksPeriodUnit] = useState<"hour" | "day">("day");

  const [errors, setErrors] = useState<{ name?: string; description?: string; schedule?: string; credential?: string; payload?: string }>({});
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
    if (!name.trim()) e.name = "Please enter a name";
    else if (name.trim().length > NAME_MAX) e.name = `Name can't be longer than ${NAME_MAX} characters`;
    else if (isDuplicateName) e.name = "A trigger with this name already exists on this agent. Please choose another name.";
    if (!description.trim()) e.description = "Please enter a description";
    else if (description.length > DESC_MAX) e.description = `Description can't be longer than ${DESC_MAX} characters`;
    return e;
  };

  const validateDetails = () => {
    const e: typeof errors = {};
    if (category === "scheduled") {
      if (customUnit === "cron") {
        const check = checkCronExpression(cron);
        if (!check.valid) e.schedule = "Invalid cron expression. Format: minute hour day month weekday (e.g. 0 8 * * 1-5)";
        else if (check.tooFrequent) e.schedule = "Cron can't run more often than every 10 minutes.";
      }
      if (customUnit === "minute" && Number(intervalValue) < 10) {
        e.schedule = "Minimum 10 minutes.";
      }
      if (customUnit === "hour" && Number(intervalValue) < 1) {
        e.schedule = "Minimum 1 hour.";
      }
      if (customUnit === "week" && weekDays.length === 0) {
        e.schedule = "Select at least one day of the week.";
      }
      if (customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31)) {
        e.schedule = "Day of month must be between 1 and 31.";
      }
    }
    if (category === "developer") {
      if (!credentialId) {
        e.credential = "Choose a credential to protect the webhook before enabling it.";
      }
      try {
        if (payloadJson.trim()) JSON.parse(payloadJson);
      } catch {
        e.payload = "The sample payload isn't valid JSON. Please check it.";
      }
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
    else if (step === "queue-work-hours") setStep("app-config");
  };

  const selectedAccount = accountId ? connectedAccountStore.get(accountId) : undefined;
  const connectionExpired = !!selectedAccount?.expired;

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
      if (!accountId || connectionExpired) return;
      setStep("app-config");
      return;
    }
    if (step === "app-config") { setStep("queue-work-hours"); return; }
    submit();
  };

  const primaryLabel =
    step === "details" || step === "queue-work-hours" ? (mode === "create" ? "Create" : "Save") : "Continue";

  const connectedAccounts = connectedAccountStore.list(app);
  const categoryHeading = category === "scheduled" ? "Repeating schedule"
    : category === "developer" ? "Webhook"
    : EXTERNAL_APP_META[app].label;

  const stepSequence: WizardStep[] = category === "external"
    ? ["main", "app", "app-config", "queue-work-hours"]
    : ["main", "details"];
  const stepIndex = stepSequence.indexOf(step);
  const stepTotal = stepSequence.length;

  const cronCheck = checkCronExpression(cron);
  const detailsInvalid = step === "details" && Object.keys(validateDetails()).length > 0;

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
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-1.5 pr-6">
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
                Step {stepIndex + 1}/{stepTotal}
              </span>
            )}
          </div>
          <DialogTitle className="font-display flex items-center gap-2">
            {step === "main" ? (mode === "create" ? "Create a new trigger" : "Edit trigger")
              : step === "details" ? categoryHeading
              : step === "app" ? "Choose an app"
              : step === "app-config" ? `${EXTERNAL_APP_META[app].label} — Event & conditions`
              : step === "queue-work-hours" ? "Queue work hours (optional)"
              : EXTERNAL_APP_META[app].label}
            {step === "details" && category === "scheduled" && customUnit === "cron" && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded chip-accent">CRON</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                        Trigger type can't be changed. Create a new trigger to use a different type.
                      </p>
                    </div>
                  </div>
                );
              })()}

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
                    <span>Name <span className="text-destructive">*</span></span>
                    <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(er => ({ ...er, name: undefined })); }}
                    onBlur={() => {
                      if (isDuplicateName) setErrors(er => ({ ...er, name: "A trigger with this name already exists on this agent. Please choose another name." }));
                    }}
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
                    placeholder="What is this trigger for?"
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
                  <label className="text-xs font-medium mb-1.5 block">Frequency</label>
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
                    Need something more complex?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUnit("cron");
                        if (errors.schedule) setErrors(er => ({ ...er, schedule: undefined }));
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Use Cron (advanced)
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
                      placeholder="Number of minutes"
                      className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                        intervalValue !== "" && Number(intervalValue) < 10 ? "border-destructive" : "border-border focus:border-primary"
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${intervalValue !== "" && Number(intervalValue) < 10 ? "text-destructive" : "text-muted-foreground"}`}>
                      Minimum 10 minutes.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Start time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      The schedule is calculated from the start time. Example: start time 10:00, every 2 hours → 10:00, 12:00, 14:00…
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
                      placeholder="Number of hours"
                      className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                        intervalValue !== "" && Number(intervalValue) < 1 ? "border-destructive" : "border-border focus:border-primary"
                      }`}
                    />
                    <p className={`mt-1 text-[11px] ${intervalValue !== "" && Number(intervalValue) < 1 ? "text-destructive" : "text-muted-foreground"}`}>
                      Minimum 1 hour.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Start time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      The schedule is calculated from the start time. Example: start time 10:00, every 2 hours → 10:00, 12:00, 14:00…
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
                  <p className="mt-1 text-[11px] text-muted-foreground">Which month this trigger runs in every year.</p>
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
                  {customUnit === "month" && (dayOfMonth < 1 || dayOfMonth > 31) ? (
                    <p className="mt-1 text-[11px] text-destructive">Day of month must be between 1 and 31.</p>
                  ) : customUnit === "year" && month === 1 && dayOfMonth === 29 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      February 29 only exists in leap years. In other years, the agent will run on February 28.
                    </p>
                  ) : customUnit === "month" && [29, 30, 31].includes(dayOfMonth) ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Months without day {dayOfMonth} will run the agent on that month's last day instead.
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">Which day of the month this trigger runs on.</p>
                  )}
                </div>
              )}

              {["day", "week", "month", "year"].includes(customUnit) && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Run time</label>
                  <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                  <p className="mt-1 text-[11px] text-muted-foreground">The time this trigger runs, in the timezone below.</p>
                </div>
              )}
              {customUnit === "week" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Days of the week</label>
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
                    Select at least one day of the week.
                  </p>
                </div>
              )}
              {customUnit === "cron" && (
                <div>
                  <button
                    type="button"
                    onClick={() => setCustomUnit(lastNonCronUnit)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-base mb-2"
                  >
                    <ChevronLeft size={11} /> Back to basic schedule
                  </button>
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
                      if (!check.valid) setErrors(er => ({ ...er, schedule: "Invalid cron expression. Format: minute hour day month weekday (e.g. 0 8 * * 1-5)" }));
                      else if (check.tooFrequent) setErrors(er => ({ ...er, schedule: "Cron can't run more often than every 10 minutes." }));
                      else setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    placeholder="0 8 * * 1-5"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                      errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Standard cron format: minute · hour · day · month · weekday</p>
                  {errors.schedule ? (
                    <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>
                  ) : cronCheck.valid && !cronCheck.tooFrequent && (
                    <p className="mt-1 text-[11px] text-success">{describeCronVN(cron)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1.5 block">Timezone</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} className="ds-input h-9">
                  {TIMEZONE_OPTIONS.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">Used to calculate all the times above.</p>
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
                      toast.success("Webhook URL copied.");
                      setTimeout(() => setWebhookCopied(false), 1500);
                    }}
                    className="w-9 h-9 shrink-0 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                    aria-label="Copy webhook URL"
                  >
                    {webhookCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Give this URL to whoever is sending the events.</p>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Authentication method <span className="text-destructive">*</span>
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

              <div className="pt-1 border-t border-border">
                <label className="text-xs font-medium mb-1.5 block mt-3">
                  Expected payload (JSON) <span className="text-[10px] font-normal text-muted-foreground">Optional</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  A sample of what the external system will send. We use it to show you which fields the agent can read.
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
                      setErrors(er => ({ ...er, payload: "The sample payload isn't valid JSON. Please check it." }));
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
                  Required fields <span className="text-[10px] font-normal text-muted-foreground">Optional</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Runs will be rejected if these fields are missing from the payload. Leave empty to accept anything.
                </p>
                <input
                  value={requiredFields}
                  onChange={e => setRequiredFields(e.target.value)}
                  placeholder="e.g. event, order_id"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">The payload will be included in the agent's context when this trigger fires.</p>
            </div>
          )}

          {step === "app" && (
            <div className="space-y-4">
              {mode === "create" ? (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">App</label>
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
                      Trigger type can't be changed. Create a new trigger to use a different app.
                    </p>
                  </div>
                </div>
              )}

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
                      {acct.expired && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 chip-warning">Expired</span>
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

                {connectionExpired && (
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-[hsl(var(--warning-soft))] border border-warning/25">
                    <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-warning">
                        The connection to {EXTERNAL_APP_META[app].label} has expired. Please reconnect to continue.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (accountId) connectedAccountStore.reconnect(accountId); setAccountsTick(t => t + 1); }}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-warning/30 text-[11px] font-semibold text-warning hover:bg-warning/5 transition-base shrink-0"
                    >
                      <RefreshCw size={11} /> Reconnect
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
                      toast.success("Account connected.");
                    }}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
                  >
                    <Plus size={14} /> Connect account
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
                <label className="text-xs font-medium mb-1.5 block">Event <span className="text-destructive">*</span></label>
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
                    <label className="text-xs font-medium mb-1.5 block">Scope <span className="text-destructive">*</span></label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="radio" name="gmail-mode" checked={gmailMode === "inbox"} onChange={() => setGmailMode("inbox")} className="w-4 h-4 accent-primary" />
                        <span className="text-sm">All emails in the inbox</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="radio" name="gmail-mode" checked={gmailMode === "outreach_replies"} onChange={() => setGmailMode("outreach_replies")} className="w-4 h-4 accent-primary" />
                        <span className="text-sm">Only replies to outreach campaigns</span>
                      </label>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">Include attachments</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Filter by keyword</label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Filters emails the same way Google Mail search does.{" "}
                      <a
                        href="https://support.google.com/mail/answer/7190"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        See the guide
                      </a>
                      .
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
                    <p className="text-[11px] text-muted-foreground mb-1.5">Skip emails from addresses containing the values below.</p>
                    {excludeEmails.map((email, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          value={email}
                          onChange={e => setExcludeEmails(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                          placeholder="Enter an email…"
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
                    <p className="text-[11px] text-muted-foreground mb-1.5">Choose which drive to watch for changes.</p>
                    <select value={driveId} onChange={e => setDriveId(e.target.value)} className="ds-input h-9">
                      {DRIVE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Folders <span className="text-[10px] font-normal text-muted-foreground">Optional</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Restrict to specific folders. Leave blank to watch the whole drive.</p>
                    <ChipMultiSelect options={DRIVE_FOLDER_OPTIONS} value={driveFolders} onChange={setDriveFolders} placeholder="Whole drive" />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={customProperties} onChange={e => setCustomProperties(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">Also fire when a file's custom properties change, not just its content.</span>
                  </label>
                </>
              )}

            </div>
          )}

          {step === "queue-work-hours" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Control how and when the agent processes events from this trigger. Configure the settings below to match this trigger's handling to your working hours.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={qwhEnabled} onChange={e => setQwhEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">Enable</span>
              </label>
              {!qwhEnabled && (
                <p className="text-[11px] text-muted-foreground -mt-2">
                  Not enabled — the agent will process every event as soon as it arrives.
                </p>
              )}
              <div className={`space-y-4 transition-base ${qwhEnabled ? "" : "opacity-40"}`}>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Timezone</label>
                  <select value={qwhTimezone} onChange={e => setQwhTimezone(e.target.value)} disabled={!qwhEnabled} className="ds-input h-9 disabled:cursor-not-allowed">
                    {TIMEZONE_OPTIONS.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Working days</label>
                  <ChipMultiSelect options={WORK_DAY_OPTIONS} value={qwhWorkDays} onChange={setQwhWorkDays} placeholder="Choose working days" disabled={!qwhEnabled} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Working hours</label>
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
                  <label className="text-xs font-medium mb-1.5 block">Tasks processed per period</label>
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
            onClick={step === "main" ? requestClose : stepBack}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            {step === "main" ? "Cancel" : "Back"}
          </button>
          {step === "queue-work-hours" && (
            <button
              type="button"
              onClick={submit}
              className={`h-9 px-4 rounded-lg text-sm font-medium transition-base ${
                !qwhEnabled ? "bg-primary text-primary-foreground hover:bg-primary-glow" : "border border-border bg-surface hover:bg-surface-muted"
              }`}
            >
              {qwhEnabled ? "Skip" : "Skip — process events right away"}
            </button>
          )}
          <button
            type="button"
            onClick={primaryAction}
            disabled={
              (step === "main" && isDuplicateName) ||
              (step === "app" && (!accountId || connectionExpired)) ||
              detailsInvalid
            }
            className={`h-9 px-4 disabled:opacity-40 disabled:pointer-events-none ${
              step === "queue-work-hours" && !qwhEnabled
                ? "rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
                : "btn-primary"
            }`}
          >
            {primaryLabel}
          </button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>The trigger details you entered won't be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmDiscardOpen(false); onOpenChange(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          {selected ? selected.name : "Choose a credential"}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-white shadow-elev p-1.5">
          {credentials.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">No results</p>
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
            <Plus size={14} /> Create a new credential
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
