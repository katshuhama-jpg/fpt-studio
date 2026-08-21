import { useMemo, useState } from "react";
import { Clock, Webhook, RefreshCw } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { triggerStore } from "./triggerStore";
import { runsStore, type TriggerRun, type RunStatus } from "./runsStore";
import AppLogo from "./AppLogo";
import { toast } from "sonner";

const STATUS_META: Record<RunStatus, { label: string; className: string; animate?: boolean }> = {
  waiting:   { label: "Đang chờ",     className: "bg-surface-muted text-muted-foreground" },
  triggered: { label: "Đã kích hoạt", className: "chip-accent" },
  queued:    { label: "Trong hàng đợi", className: "chip-accent" },
  running:   { label: "Đang chạy",    className: "chip-accent", animate: true },
  completed: { label: "Hoàn tất",     className: "chip-success" },
  failed:    { label: "Thất bại",     className: "chip-danger" },
};

function StatusPill({ status }: { status: RunStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${meta.className}`}>
      {meta.animate && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {meta.label}
    </span>
  );
}

function RunIcon({ run }: { run: TriggerRun }) {
  if (run.triggerType === "external" && run.app) return <AppLogo app={run.app} size={18} />;
  const Icon = run.triggerType === "developer" ? Webhook : Clock;
  return (
    <span className="w-[18px] h-[18px] rounded flex items-center justify-center text-muted-foreground shrink-0">
      <Icon size={14} />
    </span>
  );
}

function formatTimestamp(ts: number, timezone: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} (${timezone})`;
}

function formatDuration(ms?: number): string {
  if (ms == null) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}

const DATE_RANGE_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: "7", label: "7 ngày qua", days: 7 },
  { value: "30", label: "30 ngày qua", days: 30 },
  { value: "all", label: "Toàn bộ thời gian", days: null },
];

export default function TriggerRunsTab({ agentId }: { agentId: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7");
  const [detailRun, setDetailRun] = useState<TriggerRun | null>(null);

  const triggers = triggerStore.list(agentId);
  const allRuns = useMemo(() => { void tick; return runsStore.list(agentId); }, [agentId, tick]);

  const runs = allRuns.filter(r => {
    if (triggerFilter !== "all" && r.triggerId !== triggerFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const range = DATE_RANGE_OPTIONS.find(o => o.value === dateRange);
    if (range?.days != null && r.startedAt < Date.now() - range.days * 86_400_000) return false;
    return true;
  });

  const retry = (run: TriggerRun) => {
    const clone = runsStore.retry(run.id);
    if (!clone) return;
    toast.success("Đang chạy lại trigger…");
    refresh();
    setDetailRun(clone);
    setTimeout(() => {
      runsStore.complete(clone.id, "completed", { outputSummary: "Chạy lại thành công." });
      refresh();
      setDetailRun(cur => (cur?.id === clone.id ? runsStore.get(clone.id) ?? null : cur));
    }, 1800);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)} className="ds-input h-9 w-auto">
          <option value="all">Tất cả trigger</option>
          {triggers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ds-input h-9 w-auto">
          <option value="all">Tất cả trạng thái</option>
          {(Object.keys(STATUS_META) as RunStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="ds-input h-9 w-auto">
          {DATE_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Chưa có lần chạy nào — khi trigger được kích hoạt, lịch sử sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thời gian</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trigger</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nguồn kích hoạt</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thời lượng</th>
                <th className="px-4 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(r.startedAt, r.timezone)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <RunIcon run={r} />
                      <span className="font-medium truncate">{r.triggerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[220px]">{r.source}</td>
                  <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDuration(r.durationMs)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailRun(r)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!detailRun} onOpenChange={v => !v && setDetailRun(null)}>
        <SheetContent className="sm:max-w-[440px] overflow-y-auto">
          {detailRun && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display flex items-center gap-2">
                  <RunIcon run={detailRun} /> {detailRun.triggerName}
                </SheetTitle>
                <SheetDescription>{formatTimestamp(detailRun.startedAt, detailRun.timezone)}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <StatusPill status={detailRun.status} />
                  {detailRun.durationMs != null && (
                    <span className="text-xs text-muted-foreground">{formatDuration(detailRun.durationMs)}</span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-1">Nguồn kích hoạt</h4>
                  <p className="text-xs text-muted-foreground">{detailRun.source}</p>
                </div>

                {detailRun.configSnapshot && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Cấu hình trigger</h4>
                    <pre className="text-[11px] font-mono bg-surface-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{detailRun.configSnapshot}</pre>
                  </div>
                )}

                {detailRun.payload && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Payload đầu vào</h4>
                    <pre className="text-[11px] font-mono bg-surface-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{detailRun.payload}</pre>
                  </div>
                )}

                {detailRun.outputSummary && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Kết quả</h4>
                    <p className="text-xs text-muted-foreground">{detailRun.outputSummary}</p>
                  </div>
                )}

                {detailRun.status === "failed" && (
                  <div className="rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] p-3">
                    <h4 className="text-xs font-semibold text-destructive mb-1">Lý do thất bại</h4>
                    <p className="text-xs text-destructive/90 mb-3">{detailRun.errorReason}</p>
                    <button
                      type="button"
                      onClick={() => retry(detailRun)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-base"
                    >
                      <RefreshCw size={12} /> Chạy lại
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
