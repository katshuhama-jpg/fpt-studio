import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { triggerStore, type TriggerRecord, type TriggerType } from "./triggerStore";
import { toast } from "sonner";
import { Zap, Clock, Webhook, MessageSquare, Mail } from "lucide-react";

const NAME_MAX = 50;
const DESC_MAX = 200;

const TYPE_OPTIONS: { value: TriggerType; label: string; icon: any; desc: string }[] = [
  { value: "manual", label: "Manual", icon: Zap, desc: "User invokes the agent on demand." },
  { value: "schedule", label: "Schedule", icon: Clock, desc: "Run on a recurring time schedule." },
  { value: "webhook", label: "Webhook", icon: Webhook, desc: "External system pushes an event." },
  { value: "event", label: "Event / Keyword", icon: MessageSquare, desc: "Match a keyword or intent." },
  { value: "email", label: "Email inbound", icon: Mail, desc: "Trigger from an inbound email." },
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
  const [type, setType] = useState<TriggerType>("schedule");
  const [description, setDescription] = useState("");
  const [cron, setCron] = useState("0 9 * * 1");
  const [keywords, setKeywords] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(trigger?.name ?? "");
    setType(trigger?.type ?? "schedule");
    setDescription(trigger?.description ?? "");
    setCron(trigger?.config.cron ?? "0 9 * * 1");
    setKeywords(trigger?.config.keywords?.join(", ") ?? "");
    setEmailAddress(trigger?.config.emailAddress ?? "");
    setErrors({});
  }, [open, trigger]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    else if (name.trim().length > NAME_MAX) e.name = `Name must be ≤ ${NAME_MAX} characters`;
    else if (triggerStore.isDuplicateName(agentId, name, trigger?.id)) e.name = "Name already exists";
    if (!description.trim()) e.description = "Description is required";
    else if (description.length > DESC_MAX) e.description = `Description must be ≤ ${DESC_MAX} characters`;
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const config: TriggerRecord["config"] = {};
    if (type === "schedule") config.cron = cron.trim();
    if (type === "event") config.keywords = keywords.split(",").map(k => k.trim()).filter(Boolean);
    if (type === "email") config.emailAddress = emailAddress.trim();
    if (type === "webhook") {
      config.webhookUrl = trigger?.config.webhookUrl ?? `https://api.tova.ai/agents/${agentId}/triggers/${name.trim().toLowerCase().replace(/\s+/g, "-")}`;
      config.secret = trigger?.config.secret ?? `whsec_${Math.random().toString(36).slice(2, 14)}`;
    }

    if (mode === "create") {
      const rec = triggerStore.create(agentId, {
        name: name.trim(),
        type,
        enabled: true,
        description: description.trim(),
        config,
      });
      toast.success("Trigger created");
      onSubmitted?.(rec);
    } else if (trigger) {
      triggerStore.update(agentId, trigger.id, {
        name: name.trim(),
        type,
        description: description.trim(),
        config,
      });
      toast.success("Trigger updated");
      onSubmitted?.({ ...trigger, name: name.trim(), type, description: description.trim(), config });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
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
              placeholder="e.g. Weekly summary"
              className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                errors.name ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-base ${
                      active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <Icon size={14} className={active ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"} />
                    <div className="min-w-0">
                      <div className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    </div>
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

          {type === "schedule" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Cron expression</label>
              <input
                value={cron}
                onChange={e => setCron(e.target.value)}
                placeholder="0 9 * * 1"
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm font-mono outline-none focus:border-primary transition-base"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Standard cron format: minute hour day-of-month month day-of-week</p>
            </div>
          )}

          {type === "event" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Keywords (comma-separated)</label>
              <input
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="lock card, freeze account, lost card"
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
              />
            </div>
          )}

          {type === "email" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Inbound email</label>
              <input
                value={emailAddress}
                onChange={e => setEmailAddress(e.target.value)}
                placeholder="agent@inbound.tova.ai"
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm font-mono outline-none focus:border-primary transition-base"
              />
            </div>
          )}

          {type === "webhook" && (
            <div className="rounded-lg bg-surface-muted border border-border p-3 text-[11px] text-muted-foreground">
              A signed webhook URL will be generated when you save. POST any JSON payload to invoke the agent.
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
