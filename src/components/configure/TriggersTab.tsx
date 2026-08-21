import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Search, Zap, Clock, Webhook, Globe, Pause, Play, MoreHorizontal,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TriggerFormDialog from "./TriggerFormDialog";
import { triggerStore, EXTERNAL_APP_EVENTS, EXTERNAL_APP_META, type TriggerRecord, type TriggerType } from "./triggerStore";
import AppLogo from "./AppLogo";
import { toast } from "sonner";

const TYPE_META: Record<TriggerType, { label: string; icon: any; chip: string }> = {
  scheduled: { label: "Scheduled", icon: Clock,   chip: "chip-accent" },
  developer: { label: "Webhook",   icon: Webhook, chip: "chip-warning" },
  external:  { label: "External",  icon: Globe,   chip: "chip-success" },
};

const DAY_OF_WEEK_SHORT = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function summarizeConfig(t: TriggerRecord): string {
  if (t.type === "scheduled" && t.config.schedule) {
    const s = t.config.schedule;
    if (s.frequency === "daily") return `Every day at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "weekly") return `Every ${DAY_OF_WEEK_SHORT[s.dayOfWeek ?? 1]} at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "monthly") return `Day ${s.dayOfMonth} of every month at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "custom") {
      const unit = s.customUnit ?? "day";
      if (unit === "cron") return `Cron: ${s.cron}`;
      if (unit === "minute") return `Every ${s.intervalValue ?? "?"} minute${s.intervalValue === 1 ? "" : "s"}`;
      if (unit === "hour") return `Every ${s.intervalValue ?? "?"} hour${s.intervalValue === 1 ? "" : "s"}`;
      if (unit === "day") return `Every day at ${s.timeOfDay} · ${s.timezone}`;
      if (unit === "week") return `Every ${DAY_OF_WEEK_SHORT[s.dayOfWeek ?? 1]} at ${s.timeOfDay} · ${s.timezone}`;
      return `Day ${s.dayOfMonth} of every ${unit === "year" ? "year" : "month"} at ${s.timeOfDay} · ${s.timezone}`;
    }
  }
  if (t.type === "developer" && t.config.developer) {
    const d = t.config.developer;
    return d.authentication === "bearer" ? "Bearer Token" : d.authentication === "basic" ? "Basic Auth" : "No auth";
  }
  if (t.type === "external" && t.config.external) {
    const ext = t.config.external;
    if (ext.notifications?.length) {
      const label = ext.notifications.length === 1 ? "1 notification" : `${ext.notifications.length} notifications`;
      return `${EXTERNAL_APP_META[ext.app].label} · ${label}`;
    }
    const eventLabel = EXTERNAL_APP_EVENTS[ext.app].find(e => e.value === ext.event)?.label ?? ext.event;
    return `${EXTERNAL_APP_META[ext.app].label} · ${eventLabel}`;
  }
  return "";
}

export default function TriggersTab({ agentId }: { agentId: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TriggerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TriggerRecord | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const allTriggers = useMemo(() => {
    void tick;
    return triggerStore.list(agentId);
  }, [agentId, tick]);

  const triggers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTriggers;
    return allTriggers.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [allTriggers, query]);

  const isEmpty = triggers.length === 0 && !query;
  const pausableCount = allTriggers.filter(t => t.enabled).length;
  const allPaused = allTriggers.length > 0 && pausableCount === 0;

  const pauseAll = () => {
    const toPause = allTriggers.filter(t => t.enabled);
    if (toPause.length === 0) return;
    toPause.forEach(t => triggerStore.toggle(agentId, t.id));
    toast.success(`${toPause.length} trigger${toPause.length === 1 ? "" : "s"} paused`);
    refresh();
  };

  const resumeAll = () => {
    const toResume = allTriggers.filter(t => !t.enabled);
    if (toResume.length === 0) return;
    toResume.forEach(t => triggerStore.toggle(agentId, t.id));
    toast.success(`${toResume.length} trigger${toResume.length === 1 ? "" : "s"} resumed`);
    refresh();
  };

  const duplicateTrigger = (t: TriggerRecord) => {
    let name = `${t.name} (copy)`;
    let n = 2;
    while (triggerStore.isDuplicateName(agentId, name)) {
      name = `${t.name} (copy ${n})`;
      n++;
    }
    triggerStore.create(agentId, {
      name,
      type: t.type,
      enabled: t.enabled,
      description: t.description,
      config: t.config,
    });
    toast.success("Trigger duplicated");
    refresh();
  };

  const renameTrigger = (t: TriggerRecord, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === t.name) { setRenamingId(null); return; }
    if (triggerStore.isDuplicateName(agentId, trimmed, t.id)) {
      toast.error("A trigger with this name already exists");
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
            Triggers allow this agent to work on auto-pilot — Scheduled, Webhook, or External application triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search triggers…"
              className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
            />
          </div>
          {allPaused ? (
            <>
              <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[hsl(var(--warning-soft))] border border-warning/25 text-xs font-semibold text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" /> All triggers paused
              </span>
              <button
                onClick={resumeAll}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-muted transition-base"
              >
                <Play size={13} /> Resume all triggers
              </button>
            </>
          ) : (
            <button
              onClick={pauseAll}
              disabled={pausableCount === 0}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-muted transition-base disabled:opacity-40 disabled:pointer-events-none"
            >
              <Pause size={13} /> Pause all triggers
            </button>
          )}
          <button onClick={() => setCreateOpen(true)} className="btn-primary h-9">
            <Plus size={13} /> Add Trigger
          </button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : triggers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No triggers match "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {triggers.map(t => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            const isRenaming = renamingId === t.id;
            const clickable = !isRenaming;
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
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                          t.enabled ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted-foreground"
                        }`}>
                          {t.enabled ? "Active" : "Paused"}
                        </span>
                        <span className="text-muted-foreground truncate">· {meta.label}</span>
                      </div>
                    </div>
                    <RowMenu
                      enabled={t.enabled}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TriggerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        agentId={agentId}
        onSubmitted={refresh}
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
            <AlertDialogTitle>Delete trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  triggerStore.remove(agentId, deleteTarget.id);
                  toast.success("Trigger deleted");
                  setDeleteTarget(null);
                  refresh();
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
        <Zap size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">No triggers yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        This Agent does not have any automatic triggers configured.
      </p>
      <button onClick={onCreate} className="btn-primary h-9 mx-auto">
        <Plus size={13} /> Create your first trigger
      </button>
    </div>
  );
}

function RowMenu({ enabled, onToggle, onEdit, onRename, onDuplicate, onDelete }: {
  enabled: boolean;
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
          <button
            type="button"
            onClick={() => { onToggle(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
          >
            {enabled ? "Pause trigger" : "Resume trigger"}
          </button>
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
            Remove
          </button>
          <button
            type="button"
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
          >
            Duplicate
          </button>
        </div>
      )}
    </div>
  );
}
