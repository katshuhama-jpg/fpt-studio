import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Check, Pencil, Trash2, Zap, Clock, Code2, Globe } from "lucide-react";
import {
  type TriggerRecord, type TriggerType, type CustomScheduleUnit, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META,
} from "./triggerStore";
import AppLogo from "./AppLogo";

const TYPE_META: Record<TriggerType, { label: string; icon: any; chip: string }> = {
  manual: { label: "Manual", icon: Zap, chip: "chip-primary" },
  scheduled: { label: "Scheduled", icon: Clock, chip: "chip-accent" },
  developer: { label: "Developer", icon: Code2, chip: "chip-warning" },
  external: { label: "External", icon: Globe, chip: "chip-success" },
};

const CUSTOM_UNIT_LABEL: Record<CustomScheduleUnit, string> = {
  minute: "Every minute", hour: "Every hour", day: "Daily", week: "Weekly", month: "Monthly", year: "Annually", cron: "Advanced schedule (Cron)",
};
const DAY_OF_WEEK_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function relativeTime(ts: number | null) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right min-w-0">{children}</span>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <code className="text-[11px] font-mono text-foreground truncate max-w-[220px]" title={value}>{value}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy"
        className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
      >
        {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger: TriggerRecord | null;
  onEdit: (t: TriggerRecord) => void;
  onDelete: (t: TriggerRecord) => void;
}

export default function TriggerDetailDialog({ open, onOpenChange, trigger, onEdit, onDelete }: Props) {
  if (!trigger) return null;
  const meta = TYPE_META[trigger.type];
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="font-display truncate" title={trigger.name}>{trigger.name}</DialogTitle>
              <div className="flex items-center gap-1.5 mt-1">
                {trigger.isDefault && <span className="chip text-[9px] chip-accent">Default</span>}
                <span className={`chip text-[9px] ${meta.chip}`}>{meta.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {trigger.enabled ? <span className="text-success font-medium">● Active</span> : <span>○ Disabled</span>}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{trigger.description}</p>

          <div className="rounded-lg border border-border p-3 divide-y divide-border">
            {trigger.type === "scheduled" && trigger.config.schedule && (() => {
              const s = trigger.config.schedule;
              return (
                <>
                  {s.frequency !== "custom" ? (
                    <DetailRow label="Frequency">{s.frequency.charAt(0).toUpperCase() + s.frequency.slice(1)}</DetailRow>
                  ) : (
                    <DetailRow label="Frequency">Custom — {CUSTOM_UNIT_LABEL[s.customUnit ?? "day"]}</DetailRow>
                  )}
                  {s.frequency === "weekly" && s.dayOfWeek !== undefined && (
                    <DetailRow label="Day of week">{DAY_OF_WEEK_LABEL[s.dayOfWeek]}</DetailRow>
                  )}
                  {(s.frequency === "monthly" || (s.frequency === "custom" && (s.customUnit === "month" || s.customUnit === "year"))) && s.dayOfMonth && (
                    <DetailRow label="Day of month">{s.dayOfMonth}</DetailRow>
                  )}
                  {s.frequency === "custom" && s.customUnit === "week" && s.dayOfWeek !== undefined && (
                    <DetailRow label="Day of week">{DAY_OF_WEEK_LABEL[s.dayOfWeek]}</DetailRow>
                  )}
                  {s.frequency === "custom" && s.customUnit === "cron" ? (
                    <DetailRow label="Cron expression"><span className="font-mono">{s.cron}</span></DetailRow>
                  ) : s.timeOfDay ? (
                    <DetailRow label="Time">{s.timeOfDay}</DetailRow>
                  ) : null}
                  <DetailRow label="Time zone">{s.timezone}</DetailRow>
                </>
              );
            })()}

            {trigger.type === "developer" && trigger.config.developer && (() => {
              const d = trigger.config.developer;
              return (
                <>
                  <DetailRow label="Method">{d.method.toUpperCase()}</DetailRow>
                  {d.method === "webhook" && d.webhookUrl && (
                    <DetailRow label="Webhook URL"><CopyField value={d.webhookUrl} /></DetailRow>
                  )}
                  {d.method === "webhook" && d.secret && (
                    <DetailRow label="Secret"><span className="font-mono">{d.secret}</span></DetailRow>
                  )}
                </>
              );
            })()}

            {trigger.type === "external" && trigger.config.external && (() => {
              const ext = trigger.config.external;
              const eventLabel = EXTERNAL_APP_EVENTS[ext.app].find(e => e.value === ext.event)?.label ?? ext.event;
              return (
                <>
                  <DetailRow label="Application">
                    <span className="inline-flex items-center gap-1.5">
                      <AppLogo app={ext.app} size={16} /> {EXTERNAL_APP_META[ext.app].label}
                    </span>
                  </DetailRow>
                  <DetailRow label="Trigger when">{eventLabel}</DetailRow>
                  {ext.conditions && <DetailRow label="Conditions">{ext.conditions}</DetailRow>}
                </>
              );
            })()}

            {trigger.type === "manual" && (
              <DetailRow label="Invocation">Chat UI or API</DetailRow>
            )}

            <DetailRow label="Last fired">{relativeTime(trigger.lastFiredAt)}</DetailRow>
            <DetailRow label="Created">{formatDate(trigger.createdAt)}</DetailRow>
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center sm:justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Close
          </button>
          {!trigger.isDefault && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDelete(trigger)}
                className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-destructive-soft hover:border-destructive/30 hover:text-destructive text-sm font-medium transition-base flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Delete
              </button>
              <button
                type="button"
                onClick={() => onEdit(trigger)}
                className="btn-primary h-9 px-4 flex items-center gap-1.5"
              >
                <Pencil size={13} /> Edit
              </button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
