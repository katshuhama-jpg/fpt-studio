import { useEffect, useMemo, useState } from "react";
import { Clock, Webhook, RefreshCw, Search, X, Copy, Check } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { triggerStore, type TriggerType } from "./triggerStore";
import { connectedAccountStore } from "./connectedAccountStore";
import { EXTERNAL_APP_META } from "./triggerStore";
import { runsStore, type TriggerRun, type RunStatus, ORG_TIMEZONE } from "./runsStore";
import AppLogo from "./AppLogo";
import { toast } from "sonner";

const SEARCH_MAX = 200;

const TRIGGER_TYPE_LABEL: Record<TriggerType, string> = {
  scheduled: "Theo lịch",
  developer: "Webhook",
  external: "Ứng dụng bên ngoài",
};

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

/** Deterministic mock Automation ID — this prototype has no real backend, so derive a
 * stable id from the agentId the same way other mock identifiers are derived in this app. */
function mockAutomationId(agentId: string): string {
  let h = 0;
  for (const c of agentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `auto_${h.toString(16).padStart(8, "0")}`;
}

const DATE_RANGE_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: "7", label: "7 ngày qua", days: 7 },
  { value: "30", label: "30 ngày qua", days: 30 },
  { value: "all", label: "Toàn bộ thời gian", days: null },
];

const DEFAULT_TRIGGER_FILTER = "all";
const DEFAULT_TYPE_FILTER = "all" as const;
const DEFAULT_STATUS_FILTER = "all";
const DEFAULT_DATE_RANGE = "7";

function copyValue(value: string) {
  navigator.clipboard?.writeText(value).catch(() => {});
  toast.success("Đã sao chép.");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { copyValue(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground transition-base"
      aria-label="Sao chép"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

function ScopeRow({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="group flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs text-foreground truncate ${mono ? "font-mono" : ""}`} title={value}>{value}</span>
        {copyable && <CopyButton value={value} />}
      </span>
    </div>
  );
}

export default function TriggerRunsTab({ agentId }: { agentId: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [triggerFilter, setTriggerFilter] = useState(DEFAULT_TRIGGER_FILTER);
  const [typeFilter, setTypeFilter] = useState<"all" | TriggerType>(DEFAULT_TYPE_FILTER);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailRun, setDetailRun] = useState<TriggerRun | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const triggers = triggerStore.list(agentId);
  const allRuns = useMemo(() => { void tick; return runsStore.list(agentId); }, [agentId, tick]);

  const sharedAccountId = triggers.find(t => t.type === "external" && t.config.external?.accountId)?.config.external?.accountId;
  const sharedAccount = sharedAccountId ? connectedAccountStore.get(sharedAccountId) : undefined;
  const sharedConnectionLabel = sharedAccount ? `${EXTERNAL_APP_META[sharedAccount.app].label} — ${sharedAccount.email}` : "Không có";
  const automationId = mockAutomationId(agentId);

  const runs = allRuns.filter(r => {
    if (triggerFilter !== "all" && r.triggerId !== triggerFilter) return false;
    if (typeFilter !== "all" && r.triggerType !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const range = DATE_RANGE_OPTIONS.find(o => o.value === dateRange);
    if (range?.days != null && r.startedAt < Date.now() - range.days * 86_400_000) return false;
    if (searchQuery && !r.triggerName.toLowerCase().includes(searchQuery)) return false;
    return true;
  });

  const clearFilters = () => {
    setTriggerFilter(DEFAULT_TRIGGER_FILTER);
    setTypeFilter(DEFAULT_TYPE_FILTER);
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setDateRange(DEFAULT_DATE_RANGE);
    setSearchInput("");
    setSearchQuery("");
  };

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

  const hasNoHistoryAtAll = allRuns.length === 0;
  const hasNoFilteredResults = !hasNoHistoryAtAll && runs.length === 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative w-full lg:w-80 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value.slice(0, SEARCH_MAX))}
            maxLength={SEARCH_MAX}
            placeholder="Tìm theo tên trigger"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Xoá tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-base"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)} className="ds-input h-9 w-auto">
          <option value="all">Tất cả trigger</option>
          {triggers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | TriggerType)} className="ds-input h-9 w-auto">
          <option value="all">Tất cả loại</option>
          {(Object.keys(TRIGGER_TYPE_LABEL) as TriggerType[]).map(t => <option key={t} value={t}>{TRIGGER_TYPE_LABEL[t]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ds-input h-9 w-auto">
          <option value="all">Tất cả trạng thái</option>
          {(Object.keys(STATUS_META) as RunStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="ds-input h-9 w-auto">
          {DATE_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {!hasNoHistoryAtAll && (
        <p className="text-xs text-muted-foreground mb-3">
          Hiển thị {runs.length} / {allRuns.length} lần chạy
        </p>
      )}

      {hasNoHistoryAtAll ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Chưa có lần chạy nào — khi trigger được kích hoạt, lịch sử sẽ hiển thị tại đây.
          </p>
        </div>
      ) : hasNoFilteredResults ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center mb-3">
            <Search size={18} />
          </div>
          <h3 className="font-display text-base font-semibold mb-1">Không có lần chạy nào khớp bộ lọc</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Thử đổi loại trigger, trạng thái, khoảng thời gian, hoặc xoá từ khoá tìm kiếm.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Xoá bộ lọc
          </button>
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

                <div className="rounded-lg border border-border p-3">
                  <h4 className="text-xs font-semibold text-foreground mb-1.5">Phạm vi chạy</h4>
                  <div className="divide-y divide-border/60">
                    <ScopeRow label="Tổ chức" value="FPT Smart Cloud" />
                    <ScopeRow label="Automation ID" value={automationId} mono copyable />
                    <ScopeRow label="Múi giờ" value={ORG_TIMEZONE} />
                    <ScopeRow label="Kết nối dùng" value={sharedConnectionLabel} />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-1">Nguồn kích hoạt</h4>
                  <p className="text-xs text-muted-foreground">{detailRun.source}</p>
                </div>

                {detailRun.configSnapshot && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Cấu hình trigger</h4>
                    <pre className="text-[11px] font-mono bg-surface-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{detailRun.configSnapshot}</pre>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Đây là cấu hình của Automation Agent, dùng chung cho cả tổ chức.
                    </p>
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
