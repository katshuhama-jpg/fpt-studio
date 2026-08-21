import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Zap, Clock, Webhook, Globe, Pause, Play, MoreHorizontal,
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
import TriggerRunsTab from "./TriggerRunsTab";
import AppLogo from "./AppLogo";
import { toast } from "sonner";

/** Deterministic mock count of Workspace users with a trigger enabled — this prototype has
 * no real multi-user install data, so derive a stable small number from the trigger id. */
function mockAffectedUserCount(t: TriggerRecord): number {
  if (!t.enabled) return 0;
  let h = 0;
  for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5;
}

export const TYPE_META: Record<TriggerType, { label: string; icon: any; chip: string }> = {
  scheduled: { label: "Scheduled", icon: Clock,   chip: "chip-accent" },
  developer: { label: "Webhook",   icon: Webhook, chip: "chip-warning" },
  external:  { label: "External",  icon: Globe,   chip: "chip-success" },
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
    if (s.frequency === "daily") return `Every day at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "weekly") return `Every ${describeWeekDays(s.weekDays)} at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "monthly") return `Day ${s.dayOfMonth} of every month at ${s.timeOfDay} · ${s.timezone}`;
    if (s.frequency === "custom") {
      const unit = s.customUnit ?? "day";
      if (unit === "cron") return `Cron: ${s.cron}`;
      if (unit === "minute") return `Every ${s.intervalValue ?? "?"} minute${s.intervalValue === 1 ? "" : "s"} from ${s.startTime ?? "?"}`;
      if (unit === "hour") return `Every ${s.intervalValue ?? "?"} hour${s.intervalValue === 1 ? "" : "s"} from ${s.startTime ?? "?"}`;
      if (unit === "day") return `Every day at ${s.timeOfDay} · ${s.timezone}`;
      if (unit === "week") return `Every ${describeWeekDays(s.weekDays)} at ${s.timeOfDay} · ${s.timezone}`;
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

export default function TriggersTab({ agentId }: { agentId: string }) {
  const [tab, setTab] = useState<"trigger" | "runs">("trigger");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TriggerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TriggerRecord | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<"pause" | "resume" | null>(null);

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
      ? `Đã tạm dừng ${pausable.length} trigger. ${skipped} trigger chưa được cấu hình xong.`
      : `Đã tạm dừng ${pausable.length} trigger.`;
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
      ? `Đã kích hoạt lại ${resumable.length} trigger. ${blocked} trigger cần hoàn tất cấu hình trước.`
      : `Đã kích hoạt lại ${resumable.length} trigger.`;
    toast.success(msg);
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
    toast.success(`Đã tạo trigger "${name}".`);
    refresh();
  };

  const renameTrigger = (t: TriggerRecord, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === t.name) { setRenamingId(null); return; }
    if (triggerStore.isDuplicateName(agentId, trimmed, t.id)) {
      toast.error("Tên trigger này đã tồn tại trong agent. Vui lòng chọn tên khác.");
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
        {tab === "trigger" && (
          <div className="flex items-center gap-2">
            {allPaused ? (
              <>
                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[hsl(var(--warning-soft))] border border-warning/25 text-xs font-semibold text-warning">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" /> Tất cả trigger đã tạm dừng
                </span>
                <button
                  onClick={() => setConfirmBulk("resume")}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-muted transition-base"
                >
                  <Play size={13} /> Resume all triggers
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmBulk("pause")}
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
        )}
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-muted mb-5">
        <button
          onClick={() => setTab("trigger")}
          className={`h-8 px-3 rounded-md text-xs font-medium transition-base ${
            tab === "trigger" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Trigger
        </button>
        <button
          onClick={() => setTab("runs")}
          className={`h-8 px-3 rounded-md text-xs font-medium transition-base ${
            tab === "runs" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Lịch sử chạy
        </button>
      </div>

      {tab === "runs" ? (
        <TriggerRunsTab agentId={agentId} />
      ) : isEmpty ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            Cần cấu hình
                          </span>
                        ) : (
                          <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                            t.enabled ? "chip-success" : "chip-warning"
                          }`}>
                            {t.enabled ? "Đang hoạt động" : "Tạm dừng"}
                          </span>
                        )}
                        <span className="text-muted-foreground truncate">· {meta.label}</span>
                      </div>
                    </div>
                    <RowMenu
                      enabled={t.enabled}
                      needsSetup={needsSetup}
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
                      Cần hoàn tất cấu hình trước khi kích hoạt.
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
            <AlertDialogTitle>Xoá trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (() => {
                const n = mockAffectedUserCount(deleteTarget);
                return n > 0
                  ? `Trigger "${deleteTarget.name}" sẽ bị xoá vĩnh viễn. ${n} người dùng đang bật trigger này trong Workspace sẽ ngừng nhận kết quả tự động. Các phiên đang chạy vẫn được hoàn tất.`
                  : `Trigger "${deleteTarget.name}" sẽ bị xoá vĩnh viễn. Hiện chưa có người dùng nào bật trigger này trong Workspace.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  const delName = deleteTarget.name;
                  triggerStore.remove(agentId, deleteTarget.id);
                  toast.success(`Đã xoá trigger "${delName}".`);
                  setDeleteTarget(null);
                  refresh();
                }
              }}
            >
              Xoá trigger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmBulk} onOpenChange={v => !v && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulk === "pause" ? "Tạm dừng tất cả trigger?" : "Kích hoạt lại tất cả trigger?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulk === "pause"
                ? `${pausableCount} trigger sẽ ngừng kích hoạt agent cho đến khi bạn bật lại.`
                : `${resumableTriggers.length} trigger sẽ được kích hoạt lại và bắt đầu chạy agent tự động.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmBulk === "pause") pauseAll();
                else resumeAll();
                setConfirmBulk(null);
              }}
            >
              {confirmBulk === "pause" ? "Tạm dừng tất cả" : "Kích hoạt lại tất cả"}
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
      <h3 className="font-display text-lg font-semibold mb-1.5">Chưa có trigger nào</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Thêm trigger để agent tự động chạy theo lịch, theo webhook, hoặc theo sự kiện từ ứng dụng bên ngoài.
      </p>
      <button onClick={onCreate} className="btn-primary h-9 mx-auto">
        <Plus size={13} /> Add Trigger
      </button>
    </div>
  );
}

function RowMenu({ enabled, needsSetup, onToggle, onEdit, onRename, onDuplicate, onDelete }: {
  enabled: boolean; needsSetup: boolean;
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
                  Resume trigger
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">Hoàn tất cấu hình trước khi kích hoạt trigger.</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => { onToggle(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
            >
              {enabled ? "Pause trigger" : "Resume trigger"}
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
            Xoá trigger
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
