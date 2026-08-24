import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Zap, Clock, Webhook, Globe, Pause, Play, MoreHorizontal, AlertTriangle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TriggerFormDialog from "./TriggerFormDialog";
import {
  triggerStore, triggerNeedsSetup, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META, type TriggerRecord, type TriggerType,
} from "./triggerStore";
import { agentConnectorStore } from "./agentConnectorStore";
import { TRIGGER_PERSONAL_CONNECTOR_PAUSE_WARNING } from "./agentPublishStore";
import { CATALOG as CONNECTOR_CATALOG } from "./ConnectionsTab";
import AppLogo from "./AppLogo";
import { toast } from "sonner";

const TRIGGER_LIMIT = 10;

/** Deterministic mock count of Workspace users with a trigger enabled — this prototype has
 * no real multi-user install data, so derive a stable small number from the trigger id. */
function mockAffectedUserCount(t: TriggerRecord): number {
  if (!t.enabled) return 0;
  let h = 0;
  for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5;
}

export const TYPE_META: Record<TriggerType, { label: string; icon: any; chip: string }> = {
  scheduled: { label: "Schedule", icon: Clock,   chip: "chip-accent" },
  developer: { label: "Webhook",   icon: Webhook, chip: "chip-warning" },
  external:  { label: "External app",  icon: Globe,   chip: "chip-success" },
};

const DAY_OF_WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function describeWeekDays(weekDays?: number[]): string {
  const days = weekDays?.length ? weekDays : [1];
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_OF_WEEK_SHORT[d]).join(", ");
}

export function summarizeConfig(t: TriggerRecord): string {
  if (t.type === "scheduled" && t.config.schedule) {
    const s = t.config.schedule;
    if (s.frequency === "daily") return `Daily at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "weekly") return `Weekly on ${describeWeekDays(s.weekDays)} at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "monthly") return `Day ${s.dayOfMonth} of every month at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "custom") {
      const unit = s.customUnit ?? "day";
      if (unit === "cron") return `Cron: ${s.cron}`;
      if (unit === "minute") return `Every ${s.intervalValue ?? "?"} minutes from ${s.startTime ?? "?"}`;
      if (unit === "hour") return `Every ${s.intervalValue ?? "?"} hours from ${s.startTime ?? "?"}`;
      if (unit === "day") return `Daily at ${s.timeOfDay} · ${s.timezone}`;
      if (unit === "week") return `Weekly on ${describeWeekDays(s.weekDays)} at ${s.timeOfDay} · ${s.timezone}`;
      if (unit === "year") return `${MONTH_SHORT[s.month ?? 0]} ${s.dayOfMonth} every year at ${s.timeOfDay} · ${s.timezone}`;
      return `Day ${s.dayOfMonth} of every month at ${s.timeOfDay} · ${s.timezone}`;
    }
  }
  if (t.type === "developer" && t.config.developer) {
    const d = t.config.developer;
    return d.authentication === "bearer" ? "Bearer Token" : "Basic Auth";
  }
  if (t.type === "external" && t.config.external) {
    const ext = t.config.external;
    const eventLabel = EXTERNAL_APP_EVENTS[ext.app].find(e => e.value === ext.event)?.label ?? ext.event;
    return `${EXTERNAL_APP_META[ext.app].label} · ${eventLabel}`;
  }
  return "";
}

export default function TriggersTab({ agentId, onViewConnections, onChange }: {
  agentId: string; onViewConnections?: () => void; onChange?: () => void;
}) {
  const [tick, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChange?.(); };
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TriggerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TriggerRecord | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<"pause" | "resume" | null>(null);
  const [showPersonalWarning, setShowPersonalWarning] = useState(false);
  const [pendingPauseOnCreate, setPendingPauseOnCreate] = useState(false);

  const allTriggers = useMemo(() => {
    void tick;
    return triggerStore.list(agentId);
  }, [agentId, tick]);

  const triggers = allTriggers;
  const isEmpty = triggers.length === 0;
  const nonSetupTriggers = allTriggers.filter(t => !triggerNeedsSetup(t));
  const pausableCount = nonSetupTriggers.filter(t => t.enabled).length;
  const pausedCount = nonSetupTriggers.filter(t => !t.enabled).length;
  const resumableTriggers = allTriggers.filter(t => !t.enabled && !triggerNeedsSetup(t));
  const allPaused = pausableCount === 0 && pausedCount > 0;

  const pauseAll = () => {
    const toPause = allTriggers.filter(t => t.enabled);
    const pausable = toPause.filter(t => !triggerNeedsSetup(t));
    const skipped = toPause.length - pausable.length;
    if (pausable.length === 0 && skipped === 0) return;
    pausable.forEach(t => triggerStore.toggle(agentId, t.id));
    const msg = skipped > 0
      ? `Paused ${pausable.length} triggers. ${skipped} triggers are still incomplete.`
      : `Paused ${pausable.length} triggers.`;
    toast.success(msg);
    refresh();
  };

  const resumeAll = () => {
    const toResume = allTriggers.filter(t => !t.enabled);
    const resumable = toResume.filter(t => !triggerNeedsSetup(t));
    const blocked = toResume.length - resumable.length;
    if (resumable.length === 0 && blocked === 0) return;
    resumable.forEach(t => triggerStore.toggle(agentId, t.id));
    const msg = blocked > 0
      ? `Resumed ${resumable.length} triggers. ${blocked} triggers still need to be fully configured.`
      : `Resumed ${resumable.length} triggers.`;
    toast.success(msg);
    refresh();
  };

  const personalConnector = agentConnectorStore.list(agentId).find(c => c.scope === "personal");
  const personalConnectorBlocked = !!personalConnector;
  const personalConnectorName = personalConnector
    ? (CONNECTOR_CATALOG.find(c => c.id === personalConnector.connectorId)?.name ?? personalConnector.connectorId)
    : "";
  const limitReached = allTriggers.length >= TRIGGER_LIMIT;

  const openCreate = () => {
    if (limitReached) return;
    if (personalConnectorBlocked) { setShowPersonalWarning(true); return; }
    setCreateOpen(true);
  };

  const confirmPersonalWarning = () => {
    setShowPersonalWarning(false);
    setPendingPauseOnCreate(true);
    setCreateOpen(true);
  };

  const onCreated = (rec: TriggerRecord) => {
    if (pendingPauseOnCreate) {
      if (rec.enabled) triggerStore.toggle(agentId, rec.id);
      setPendingPauseOnCreate(false);
    }
    refresh();
  };

  const duplicateTrigger = (t: TriggerRecord) => {
    if (limitReached) return;
    let name = `${t.name} (copy)`;
    let n = 2;
    while (triggerStore.isDuplicateName(agentId, name)) {
      name = `${t.name} (copy ${n})`;
      n++;
    }
    triggerStore.create(agentId, {
      name,
      type: t.type,
      enabled: personalConnectorBlocked ? false : t.enabled,
      description: t.description,
      config: t.config,
    });
    toast.success(`Created trigger "${name}".`);
    refresh();
  };

  const renameTrigger = (t: TriggerRecord, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === t.name) { setRenamingId(null); return; }
    if (triggerStore.isDuplicateName(agentId, trimmed, t.id)) {
      toast.error("A trigger with this name already exists on this agent. Please choose another name.");
      return;
    }
    triggerStore.update(agentId, t.id, { name: trimmed });
    setRenamingId(null);
    refresh();
  };

  return (
    <div className="p-8 w-full animate-fade-up">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Triggers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Triggers make the agent run automatically — on a schedule, via a webhook, or on events from an external app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allPaused ? (
            <>
              <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[hsl(var(--warning-soft))] border border-warning/25 text-xs font-semibold text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" /> All triggers paused
              </span>
              <button
                onClick={() => setConfirmBulk("resume")}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-muted transition-base"
              >
                <Play size={13} /> Resume all
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmBulk("pause")}
              disabled={pausableCount === 0}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-muted transition-base disabled:opacity-40 disabled:pointer-events-none"
            >
              <Pause size={13} /> Pause all
            </button>
          )}
          <button onClick={openCreate} disabled={limitReached} className="btn-primary h-9 disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={13} /> Add trigger
          </button>
        </div>
      </div>

      {personalConnectorBlocked ? (
        <div className="flex items-start gap-2 text-xs text-warning bg-[hsl(var(--warning-soft))] border border-warning/25 rounded-lg px-3 py-2.5 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>
            {TRIGGER_PERSONAL_CONNECTOR_PAUSE_WARNING(personalConnectorName)}{" "}
            {onViewConnections && (
              <button type="button" onClick={onViewConnections} className="font-semibold hover:underline">
                View connections
              </button>
            )}
          </p>
        </div>
      ) : limitReached && (
        <div className="flex items-start gap-2 text-xs text-warning bg-[hsl(var(--warning-soft))] border border-warning/25 rounded-lg px-3 py-2.5 mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>This agent has reached the limit of 10 triggers.</p>
        </div>
      )}

      {isEmpty ? (
        <EmptyState onCreate={openCreate} disabled={limitReached} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {triggers.map(t => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            const isRenaming = renamingId === t.id;
            const clickable = !isRenaming;
            const needsSetup = triggerNeedsSetup(t);
            return (
              <div
                key={t.id}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => setEditTarget(t) : undefined}
                onKeyDown={clickable ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditTarget(t); } }) : undefined}
                className={`group rounded-xl border border-border bg-surface transition-base ${
                  clickable ? "hover:border-primary/30 hover:shadow-elev cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1" : ""
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0 overflow-hidden">
                      {t.type === "external" && t.config.external
                        ? <AppLogo app={t.config.external.app} size={44} />
                        : <Icon size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input
                          autoFocus
                          defaultValue={t.name}
                          onClick={e => e.stopPropagation()}
                          onBlur={e => renameTrigger(t, e.target.value)}
                          onKeyDown={e => {
                            e.stopPropagation();
                            if (e.key === "Enter") { e.preventDefault(); renameTrigger(t, (e.target as HTMLInputElement).value); }
                            if (e.key === "Escape") { e.preventDefault(); setRenamingId(null); }
                          }}
                          className="w-full font-semibold text-sm mb-0.5 bg-surface border border-primary rounded-md px-1.5 py-0.5 outline-none"
                        />
                      ) : (
                        <h3 className="font-semibold text-sm truncate mb-0.5" title={t.name}>{t.name}</h3>
                      )}
                      <div className="flex items-center gap-1.5 text-xs flex-nowrap">
                        {needsSetup ? (
                          <span className="font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap chip-warning">
                            Needs setup
                          </span>
                        ) : (
                          <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                            t.enabled ? "chip-success" : "chip-warning"
                          }`}>
                            {t.enabled ? "Active" : "Paused"}
                          </span>
                        )}
                        <span className="text-muted-foreground truncate min-w-0">· {meta.label}</span>
                      </div>
                    </div>
                    <RowMenu
                      enabled={t.enabled}
                      needsSetup={needsSetup}
                      duplicateBlocked={limitReached}
                      onToggle={() => { triggerStore.toggle(agentId, t.id); refresh(); }}
                      onEdit={() => setEditTarget(t)}
                      onRename={() => setRenamingId(t.id)}
                      onDuplicate={() => duplicateTrigger(t)}
                      onDelete={() => setDeleteTarget(t)}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[32px]">
                    {t.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1.5 truncate">
                    {summarizeConfig(t)}
                  </p>
                  {needsSetup && (
                    <p className="text-[11px] text-warning font-medium mt-1.5">
                      Finish configuring this trigger before turning it on.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TriggerFormDialog
        open={createOpen}
        onOpenChange={v => { setCreateOpen(v); if (!v) setPendingPauseOnCreate(false); }}
        mode="create"
        agentId={agentId}
        onSubmitted={onCreated}
      />
      <TriggerFormDialog
        open={!!editTarget}
        onOpenChange={v => !v && setEditTarget(null)}
        mode="edit"
        agentId={agentId}
        trigger={editTarget ?? undefined}
        onSubmitted={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (() => {
                const n = mockAffectedUserCount(deleteTarget);
                return n > 0
                  ? `The trigger "${deleteTarget.name}" will be permanently deleted. ${n} users who have it enabled in Workspace will stop receiving automatic results. Runs already in progress will still finish.`
                  : `The trigger "${deleteTarget.name}" will be permanently deleted. No users currently have this trigger enabled in Workspace.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  const delName = deleteTarget.name;
                  triggerStore.remove(agentId, deleteTarget.id);
                  toast.success(`Deleted trigger "${delName}".`);
                  setDeleteTarget(null);
                  refresh();
                }
              }}
            >
              Delete trigger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmBulk} onOpenChange={v => !v && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulk === "pause" ? "Pause all triggers?" : "Resume all triggers?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulk === "pause"
                ? `${pausableCount} triggers will stop running the agent until you turn them back on.`
                : `${resumableTriggers.length} triggers will be re-enabled and start running the agent automatically.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmBulk === "pause") pauseAll();
                else resumeAll();
                setConfirmBulk(null);
              }}
            >
              {confirmBulk === "pause" ? "Pause all" : "Resume all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPersonalWarning} onOpenChange={v => !v && setShowPersonalWarning(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This trigger will be created paused</AlertDialogTitle>
            <AlertDialogDescription>
              {TRIGGER_PERSONAL_CONNECTOR_PAUSE_WARNING(personalConnectorName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPersonalWarning}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onCreate, disabled }: { onCreate: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
        <Zap size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">No triggers yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Add a trigger to run the agent automatically on a schedule, via a webhook, or on events from an external app.
      </p>
      <button onClick={onCreate} disabled={disabled} className="btn-primary h-9 mx-auto disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={13} /> Add trigger
      </button>
    </div>
  );
}

function RowMenu({ enabled, needsSetup, duplicateBlocked, onToggle, onEdit, onRename, onDuplicate, onDelete }: {
  enabled: boolean; needsSetup: boolean; duplicateBlocked?: boolean;
  onToggle: () => void; onEdit: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
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

  return (
    <div ref={containerRef} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base shrink-0 ${
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        aria-label="Trigger actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-white shadow-elev py-1">
          {!enabled && needsSetup ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="block w-full text-left px-3 py-1.5 text-xs text-muted-foreground/60 cursor-not-allowed outline-none"
                >
                  Enable trigger
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8} align="center">Finish configuring this trigger before enabling it.</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => { onToggle(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
            >
              {enabled ? "Pause trigger" : "Enable trigger"}
            </button>
          )}
          <button
            type="button"
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
          >
            Edit trigger
          </button>
          <button
            type="button"
            onClick={() => { onRename(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base"
          >
            Delete trigger
          </button>
          <button
            type="button"
            disabled={duplicateBlocked}
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base disabled:text-muted-foreground/50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Duplicate
          </button>
        </div>
      )}
    </div>
  );
}
