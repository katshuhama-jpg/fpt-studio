import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  triggerStore, type TriggerRecord, type TriggerType, type ScheduleFrequency, type CustomScheduleUnit,
  type DeveloperMethod, type ExternalApp, TIMEZONE_OPTIONS, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META, EXTERNAL_APP_ORDER,
} from "./triggerStore";
import AppLogo from "./AppLogo";
import { toast } from "sonner";
import { Clock, Code2, Globe } from "lucide-react";

const NAME_MAX = 50;
const DESC_MAX = 200;

const CATEGORY_OPTIONS: { value: Exclude<TriggerType, "manual">; label: string; icon: any; desc: string }[] = [
  { value: "scheduled", label: "Scheduled", icon: Clock, desc: "Run this Agent automatically based on a recurring schedule." },
  { value: "developer", label: "Developer", icon: Code2, desc: "Trigger this Agent from another application or system." },
  { value: "external", label: "External application", icon: Globe, desc: "Trigger this Agent when something happens in another application." },
];

const FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

const CUSTOM_UNIT_OPTIONS: { value: CustomScheduleUnit; label: string }[] = [
  { value: "minute", label: "Every minute" },
  { value: "hour", label: "Every hour" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annually" },
  { value: "cron", label: "Advanced schedule" },
];

const DAY_OF_WEEK_OPTIONS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const METHOD_OPTIONS: { value: DeveloperMethod; label: string; desc: string }[] = [
  { value: "api", label: "API", desc: "Call this Agent directly from your backend via REST API." },
  { value: "webhook", label: "Webhook", desc: "Receive a signed URL that any external system can POST to." },
  { value: "sdk", label: "SDK", desc: "Invoke this Agent from your application using our SDK." },
];

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
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [customUnit, setCustomUnit] = useState<CustomScheduleUnit>("day");
  const [cron, setCron] = useState("0 9 * * 1");
  const [timezone, setTimezone] = useState("GMT+07:00");

  // Developer
  const [method, setMethod] = useState<DeveloperMethod>("webhook");

  // External
  const [app, setApp] = useState<ExternalApp>("gmail");
  const [event, setEvent] = useState("new_email");
  const [showConditions, setShowConditions] = useState(false);
  const [conditions, setConditions] = useState("");

  const [errors, setErrors] = useState<{ name?: string; description?: string; schedule?: string }>({});

  useEffect(() => {
    if (!open) return;
    const t = trigger;
    setName(t?.name ?? "");
    setDescription(t?.description ?? "");
    setErrors({});

    const cat = (t?.type === "developer" || t?.type === "external" ? t.type : "scheduled") as Exclude<TriggerType, "manual">;
    setCategory(cat);

    const sched = t?.config.schedule;
    setFrequency(sched?.frequency ?? "daily");
    setTimeOfDay(sched?.timeOfDay ?? "08:00");
    setDayOfWeek(sched?.dayOfWeek ?? 1);
    setDayOfMonth(sched?.dayOfMonth ?? 1);
    setCustomUnit(sched?.customUnit ?? "day");
    setCron(sched?.cron ?? "0 9 * * 1");
    setTimezone(sched?.timezone ?? "GMT+07:00");

    const dev = t?.config.developer;
    setMethod(dev?.method ?? "webhook");

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
    if (category === "scheduled" && frequency === "custom" && customUnit === "cron" && !cron.trim()) {
      e.schedule = "Cron expression is required";
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
        frequency,
        timezone,
        ...(frequency === "daily" && { timeOfDay }),
        ...(frequency === "weekly" && { timeOfDay, dayOfWeek }),
        ...(frequency === "monthly" && { timeOfDay, dayOfMonth }),
        ...(frequency === "custom" && {
          customUnit,
          ...(customUnit === "cron" ? { cron: cron.trim() } : {}),
          ...(["day", "week", "month", "year"].includes(customUnit) ? { timeOfDay } : {}),
          ...(customUnit === "week" ? { dayOfWeek } : {}),
          ...(customUnit === "month" || customUnit === "year" ? { dayOfMonth } : {}),
        }),
      };
    }
    if (category === "developer") {
      config.developer = {
        method,
        ...(method === "webhook" && {
          webhookUrl: trigger?.config.developer?.webhookUrl ?? `https://api.tova.ai/agents/${agentId}/triggers/${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
          secret: trigger?.config.developer?.secret ?? `whsec_${Math.random().toString(36).slice(2, 14)}`,
        }),
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
              onChange={e => setName(e.target.value)}
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
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this trigger do?"
              className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm outline-none resize-none transition-base ${
                errors.description ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {errors.description && <p className="mt-1 text-[11px] text-destructive">{errors.description}</p>}
          </div>

          {category === "scheduled" && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid grid-cols-4 gap-1.5">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={`h-8 rounded-lg text-xs font-medium transition-base ${
                      frequency === opt.value ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {frequency === "daily" && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Time</label>
                  <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                </div>
              )}

              {frequency === "weekly" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Day of week</label>
                    <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
                      className="ds-input h-9">
                      {DAY_OF_WEEK_OPTIONS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Time</label>
                    <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                  </div>
                </div>
              )}

              {frequency === "monthly" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Day of month</label>
                    <input type="number" min={1} max={31} value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Time</label>
                    <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
                  </div>
                </div>
              )}

              {frequency === "custom" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Choose how often this Agent should run</label>
                    <select value={customUnit} onChange={e => setCustomUnit(e.target.value as CustomScheduleUnit)}
                      className="ds-input h-9">
                      {CUSTOM_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
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
                        onChange={e => setCron(e.target.value)}
                        placeholder="0 9 * * 1"
                        className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                          errors.schedule ? "border-destructive" : "border-border focus:border-primary"
                        }`}
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">Standard cron format: minute hour day-of-month month day-of-week</p>
                      {errors.schedule && <p className="mt-1 text-[11px] text-destructive">{errors.schedule}</p>}
                    </div>
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

          {category === "developer" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHOD_OPTIONS.map(opt => {
                    const active = method === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMethod(opt.value)}
                        className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-base ${
                          active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                        }`}
                      >
                        <div className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{opt.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-snug">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {method === "webhook" ? (
                <div className="rounded-lg bg-surface-muted border border-border p-3 text-[11px] text-muted-foreground">
                  A signed webhook URL will be generated when you save. POST any JSON payload to invoke the agent.
                </div>
              ) : (
                <div className="rounded-lg bg-surface-muted border border-border p-3 text-[11px] text-muted-foreground">
                  Authentication: Configured by platform. {method === "api"
                    ? "Call this Agent's API endpoint to trigger a run."
                    : "Use the FPT AI Agents SDK to trigger this Agent from your application."}
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
