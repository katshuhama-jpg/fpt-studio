import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  triggerStore, type TriggerRecord, type TriggerType, type ScheduleFrequency, type CustomScheduleUnit,
  type WebhookAuthType, type ExternalApp, TIMEZONE_OPTIONS, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META, EXTERNAL_APP_ORDER,
} from "./triggerStore";
import { credentialStore, type CredentialAuthType } from "./credentialStore";
import CreateCredentialDialog from "./CreateCredentialDialog";
import AppLogo from "./AppLogo";
import { toast } from "sonner";
import { Clock, Webhook, Globe, Copy, Check, ChevronDown, Plus } from "lucide-react";

const NAME_MAX = 50;
const DESC_MAX = 200;

const CATEGORY_OPTIONS: { value: Exclude<TriggerType, "manual">; label: string; icon: any; desc: string }[] = [
  { value: "scheduled", label: "Scheduled", icon: Clock, desc: "Run this Agent automatically based on a recurring schedule." },
  { value: "developer", label: "Webhook", icon: Webhook, desc: "Receive a unique URL that any external system can call (POST) to trigger this Agent." },
  { value: "external", label: "External application", icon: Globe, desc: "Trigger this Agent when something happens in another application." },
];

const FREQUENCY_UNIT_OPTIONS: { value: CustomScheduleUnit; label: string }[] = [
  { value: "minute", label: "Minutely" },
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annually" },
  { value: "cron", label: "Cron" },
];

const DAY_OF_WEEK_OPTIONS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  agentId: string;
  trigger?: TriggerRecord;
  onSubmitted?: (rec: TriggerRecord) => void;
}

export default function TriggerFormDialog({ open, onOpenChange, mode, agentId, trigger, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Exclude<TriggerType, "manual">>("scheduled");
  const [description, setDescription] = useState("");

  // Scheduled
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [customUnit, setCustomUnit] = useState<CustomScheduleUnit>("day");
  const [intervalValue, setIntervalValue] = useState("");
  const [cron, setCron] = useState("0 9 * * 1");
  const [timezone, setTimezone] = useState("GMT+07:00");

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [authentication, setAuthentication] = useState<WebhookAuthType>("none");
  const [credentialId, setCredentialId] = useState("");
  const [webhookCopied, setWebhookCopied] = useState(false);

  // External
  const [app, setApp] = useState<ExternalApp>("gmail");
  const [event, setEvent] = useState("new_email");
  const [showConditions, setShowConditions] = useState(false);
  const [conditions, setConditions] = useState("");

  const [errors, setErrors] = useState<{ name?: string; description?: string; schedule?: string; credential?: string }>({});

  useEffect(() => {
    if (!open) return;
    const t = trigger;
    setName(t?.name ?? "");
    setDescription(t?.description ?? "");
    setErrors({});

    const cat = (t?.type === "developer" || t?.type === "external" ? t.type : "scheduled") as Exclude<TriggerType, "manual">;
    setCategory(cat);

    const sched = t?.config.schedule;
    const unit = sched?.customUnit ?? (sched?.frequency === "weekly" ? "week" : sched?.frequency === "monthly" ? "month" : "day");
    setTimeOfDay(sched?.timeOfDay ?? "08:00");
    setDayOfWeek(sched?.dayOfWeek ?? 1);
    setDayOfMonth(sched?.dayOfMonth ?? 1);
    setCustomUnit(unit);
    setIntervalValue(sched?.intervalValue != null ? String(sched.intervalValue) : "");
    setCron(sched?.cron ?? "0 9 * * 1");
    setTimezone(sched?.timezone ?? "GMT+07:00");

    const dev = t?.config.developer;
    setWebhookUrl(dev?.webhookUrl ?? `https://agents.fpt.ai/console/api/webhooks/triggers/${generateWebhookId()}`);
    setAuthentication(dev?.authentication ?? "none");
    setCredentialId(dev?.credentialId ?? "");

    const ext = t?.config.external;
    setApp(ext?.app ?? "gmail");
    setEvent(ext?.event ?? EXTERNAL_APP_EVENTS[ext?.app ?? "gmail"][0].value);
    setShowConditions(!!ext?.conditions);
    setConditions(ext?.conditions ?? "");
  }, [open, trigger]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    else if (name.trim().length > NAME_MAX) e.name = `Name must be ≤ ${NAME_MAX} characters`;
    else if (triggerStore.isDuplicateName(agentId, name, trigger?.id)) e.name = "Name already exists";
    if (!description.trim()) e.description = "Description is required";
    else if (description.length > DESC_MAX) e.description = `Description must be ≤ ${DESC_MAX} characters`;
    if (category === "scheduled" && customUnit === "cron" && !cron.trim()) {
      e.schedule = "Cron expression is required";
    }
    if (category === "scheduled" && customUnit === "minute" && Number(intervalValue) < 10) {
      e.schedule = "Minimum interval is 10 minutes";
    }
    if (category === "scheduled" && customUnit === "hour" && Number(intervalValue) < 1) {
      e.schedule = "Minimum interval is 1 hour";
    }
    if (category === "developer" && authentication !== "none" && !credentialId) {
      e.credential = "The credential is required";
    }
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const config: TriggerRecord["config"] = {};
    if (category === "scheduled") {
      config.schedule = {
        frequency: "custom",
        timezone,
        customUnit,
        ...(customUnit === "cron" ? { cron: cron.trim() } : {}),
        ...(customUnit === "minute" || customUnit === "hour" ? { intervalValue: Number(intervalValue) } : {}),
        ...(["day", "week", "month", "year"].includes(customUnit) ? { timeOfDay } : {}),
        ...(customUnit === "week" ? { dayOfWeek } : {}),
        ...(customUnit === "month" || customUnit === "year" ? { dayOfMonth } : {}),
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
      config.external = { app, event, ...(showConditions && conditions.trim() ? { conditions: conditions.trim() } : {}) };
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Create new trigger" : "Edit trigger"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {category === "scheduled" && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Frequency</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FREQUENCY_UNIT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCustomUnit(opt.value);
                        if (opt.value === "minute" || opt.value === "hour") setIntervalValue("");
                      }}
                      className={`h-8 rounded-lg text-xs font-medium transition-base ${
                        customUnit === opt.value ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {customUnit === "minute" && (
                <div>
                  <input
                    type="number" min={10}
                    value={intervalValue}
                    onChange={e => {
                      const v = e.target.value;
                      setIntervalValue(v);
                      if (errors.schedule && Number(v) >= 10) setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    placeholder="Minutes (minimum 10)"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.schedule && <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>}
                </div>
              )}
              {customUnit === "hour" && (
                <div>
                  <input
                    type="number" min={1}
                    value={intervalValue}
                    onChange={e => {
                      const v = e.target.value;
                      setIntervalValue(v);
                      if (errors.schedule && Number(v) >= 1) setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    placeholder="Hours (minimum 1)"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.schedule && <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>}
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
                  <label className="text-xs font-medium mb-1.5 block">Day of week</label>
                  <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className="ds-input h-9">
                    {DAY_OF_WEEK_OPTIONS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {(customUnit === "month" || customUnit === "year") && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Day of month</label>
                  <input type="number" min={1} max={31} value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
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
                      if (errors.schedule && v.trim()) setErrors(er => ({ ...er, schedule: undefined }));
                    }}
                    placeholder="0 9 * * 1"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                      errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Standard cron format: minute hour day-of-month month day-of-week</p>
                  {errors.schedule && <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>}
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

          {category === "developer" && (
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

          {category === "external" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Application</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-0.5">
                  {EXTERNAL_APP_ORDER.map(value => {
                    const meta = EXTERNAL_APP_META[value];
                    const active = app === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setApp(value); setEvent(EXTERNAL_APP_EVENTS[value][0].value); }}
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
              <div>
                <label className="text-xs font-medium mb-1.5 block">Trigger when</label>
                <select value={event} onChange={e => setEvent(e.target.value)} className="ds-input h-9">
                  {EXTERNAL_APP_EVENTS[app].map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
              </div>
              {showConditions ? (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Optional conditions</label>
                  <input
                    value={conditions}
                    onChange={e => setConditions(e.target.value)}
                    placeholder="e.g. From a specific sender"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                  />
                </div>
              ) : (
                <button type="button" onClick={() => setShowConditions(true)} className="text-xs text-primary hover:underline">
                  + Add condition
                </button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Cancel
          </button>
          <button type="button" onClick={submit} className="btn-primary h-9 px-4">
            {mode === "create" ? "Create" : "Save"}
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
