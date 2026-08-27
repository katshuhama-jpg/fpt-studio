import { useEffect, useMemo, useState } from "react";
import { Clock, Webhook, RefreshCw, Search, X, Copy, Check } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { triggerStore, type TriggerType } from "./triggerStore";
import { connectedAccountStore } from "./connectedAccountStore";
import { EXTERNAL_APP_META } from "./triggerStore";
import { runsStore, type TriggerRun, type RunStatus, ORG_TIMEZONE } from "./runsStore";
import { agentPublishStore } from "./agentPublishStore";
import AppLogo from "./AppLogo";
import { toast } from "sonner";

const SEARCH_MAX = 200;
const CHANNEL_NAME: Record<string, string> = {
  web: "Web widget", zalo: "Zalo", slack: "Slack", fb: "Facebook",
};

const TRIGGER_TYPE_LABEL: Record<TriggerType, string> = {
  scheduled: "Lịch",
  developer: "Webhook",
  external: "Ứng dụng bên ngoài",
};

const STATUS_META: Record<RunStatus, { label: string; className: string; animate?: boolean }> = {
  running:   { label: "Đang chạy",    className: "chip-accent", animate: true },
  completed: { label: "Hoàn tất",  className: "chip-success" },
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
  { value: "1", label: "24 giờ qua", days: 1 },
  { value: "7", label: "7 ngày qua", days: 7 },
  { value: "30", label: "30 ngày qua", days: 30 },
  { value: "custom", label: "Tuỳ chọn", days: null },
];

const DEFAULT_TRIGGER_FILTER = "all";
const DEFAULT_TYPE_FILTER = "all" as const;
const DEFAULT_STATUS_FILTER = "all";
const DEFAULT_DATE_RANGE = "7";

function copyValue(value: string, message: string) {
  navigator.clipboard?.writeText(value).catch(() => {});
  toast.success(message);
}

function CopyButton({ value, toastMessage = "Đã sao chép." }: { value: string; toastMessage?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { copyValue(value, toastMessage); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shrink-0 text-muted-foreground hover:text-foreground transition-base outline-none rounded focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copy"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

function ScopeRow({ label, value, mono, copyable, copyToastMessage, badge }: {
  label: string; value: string; mono?: boolean; copyable?: boolean; copyToastMessage?: string; badge?: string;
}) {
  return (
    <div className="group grid grid-cols-[110px,1fr] items-start gap-2 py-1">
      <span className="text-xs text-muted-foreground pt-px whitespace-nowrap">{label}</span>
      {/* No truncate/ellipsis — a narrow, fixed label column leaves the value the rest of the
          row's width, and break-words wraps it onto a second line (right-aligned) if it's
          still too long, rather than clipping it. */}
      <span className="flex flex-wrap items-center justify-end gap-1.5 text-right">
        <span className={`text-xs text-foreground break-words ${mono ? "font-mono" : ""}`}>{value}</span>
        {badge && (
          <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-surface-muted text-muted-foreground shrink-0 whitespace-nowrap">{badge}</span>
        )}
        {copyable && <CopyButton value={value} toastMessage={copyToastMessage} />}
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
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
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
  const sharedConnectionLabel = sharedAccount
    ? `${EXTERNAL_APP_META[sharedAccount.app].label} — ${sharedAccount.email}`
    : "Chưa có";
  const automationId = mockAutomationId(agentId);
  const isDraft = !agentPublishStore.isPublished(agentId);
  const outboundChannels = agentPublishStore.get(agentId).channels;
  const outboundChannelsLabel = outboundChannels.length > 0
    ? outboundChannels.map(id => CHANNEL_NAME[id] ?? id).join(" · ")
    : "Chưa có";

  // Runs may reference a trigger that's since been deleted — still offer it in the filter
  // dropdown (suffixed) so its history stays reachable, without it appearing in TriggersTab.
  const knownTriggerIds = new Set(triggers.map(t => t.id));
  const deletedTriggerOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const r of allRuns) {
      if (!knownTriggerIds.has(r.triggerId) && !seen.has(r.triggerId)) {
        seen.add(r.triggerId);
        result.push({ id: r.triggerId, name: r.triggerName });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRuns, agentId]);

  const runs = allRuns.filter(r => {
    if (triggerFilter !== "all" && r.triggerId !== triggerFilter) return false;
    if (typeFilter !== "all" && r.triggerType !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateRange === "custom") {
      if (customFrom && r.startedAt < new Date(`${customFrom}T00:00:00`).getTime()) return false;
      if (customTo && r.startedAt > new Date(`${customTo}T23:59:59.999`).getTime()) return false;
    } else {
      const range = DATE_RANGE_OPTIONS.find(o => o.value === dateRange);
      if (range?.days != null && r.startedAt < Date.now() - range.days * 86_400_000) return false;
    }
    if (searchQuery && !r.triggerName.toLowerCase().includes(searchQuery)) return false;
    return true;
  });

  const clearFilters = () => {
    setTriggerFilter(DEFAULT_TRIGGER_FILTER);
    setTypeFilter(DEFAULT_TYPE_FILTER);
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setDateRange(DEFAULT_DATE_RANGE);
    setCustomFrom("");
    setCustomTo("");
    setSearchInput("");
    setSearchQuery("");
  };

  const retry = (run: TriggerRun) => {
    const clone = runsStore.retry(run.id);
    if (!clone) return;
    toast.success("Đã tạo lần chạy mới.");
    refresh();
    setDetailRun(clone);
    setTimeout(() => {
      runsStore.complete(clone.id, "completed", { outputSummary: "Thử lại thành công." });
      refresh();
      setDetailRun(cur => (cur?.id === clone.id ? runsStore.get(clone.id) ?? null : cur));
    }, 1800);
  };

  const detailTrigger = detailRun ? triggerStore.get(agentId, detailRun.triggerId) : undefined;
  const detailTriggerInactive = !!detailRun && (!detailTrigger || !detailTrigger.enabled);

  const hasNoHistoryAtAll = allRuns.length === 0;
  const hasNoFilteredResults = !hasNoHistoryAtAll && runs.length === 0;

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold">Lịch sử chạy</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Mỗi lần trigger chạy agent này, và kết quả.</p>
      </div>

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
        <Select value={triggerFilter} onValueChange={setTriggerFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trigger</SelectItem>
            {triggers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            {deletedTriggerOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.name} (đã xoá)</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as "all" | TriggerType)}>
          <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {(Object.keys(TRIGGER_TYPE_LABEL) as TriggerType[]).map(t => <SelectItem key={t} value={t}>{TRIGGER_TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {(Object.keys(STATUS_META) as RunStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {dateRange === "custom" && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-border bg-surface text-xs outline-none focus:border-primary transition-base"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-border bg-surface text-xs outline-none focus:border-primary transition-base"
            />
          </div>
        )}
      </div>

      {!hasNoHistoryAtAll && (
        <p className="text-xs text-muted-foreground mb-3">
          Hiển thị {runs.length}/{allRuns.length} lần chạy
        </p>
      )}

      {hasNoHistoryAtAll ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isDraft
              ? "Chưa có lần chạy nào."
              : "Chưa có lần chạy nào — agent sẽ xuất hiện ở đây khi trigger chạy lần đầu."}
          </p>
          {isDraft && (
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Trigger sẽ bắt đầu chạy sau khi bạn publish agent này.
            </p>
          )}
        </div>
      ) : hasNoFilteredResults ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center mb-3">
            <Search size={18} />
          </div>
          <h3 className="font-display text-base font-semibold mb-1">Chưa có lần chạy nào trong khoảng thời gian này.</h3>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-primary hover:underline mt-2"
          >
            Đổi bộ lọc
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thời gian</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trigger</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nguồn</th>
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
                      <span className="font-semibold truncate">{r.triggerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.source}</td>
                  <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDuration(r.durationMs)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailRun(r)}
                      className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                    >
                      Chi tiết
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
                  <h4 className="text-xs font-semibold text-foreground mb-1.5">Phạm vi lần chạy</h4>
                  <div className="divide-y divide-border/60">
                    <ScopeRow label="Tổ chức" value="FPT Smart Cloud" />
                    <ScopeRow label="Automation ID" value={automationId} mono copyable />
                    <ScopeRow label="Run ID" value={detailRun.id} mono copyable copyToastMessage="Đã sao chép Run ID." />
                    <ScopeRow label="Múi giờ" value={ORG_TIMEZONE} />
                    <ScopeRow label="Kết nối sử dụng" value={sharedConnectionLabel} badge={sharedAccount ? "Tài khoản tổ chức" : undefined} />
                    <ScopeRow label="Gửi kết quả tới" value={outboundChannelsLabel} />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-1">Nguồn</h4>
                  <p className="text-xs text-muted-foreground">{detailRun.source}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-1">Payload đầu vào</h4>
                  {detailRun.triggerType === "scheduled" ? (
                    <p className="text-xs text-muted-foreground">Trigger loại Lịch không có payload đầu vào.</p>
                  ) : (
                    <pre className="text-[11px] font-mono bg-surface-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{detailRun.payload ?? "—"}</pre>
                  )}
                </div>

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
                    {detailTriggerInactive ? (
                      <>
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold opacity-45 cursor-not-allowed"
                        >
                          <RefreshCw size={12} /> Thử lại
                        </button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Trigger này không còn hoạt động nên không chạy lại được.
                        </p>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => retry(detailRun)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-base"
                      >
                        <RefreshCw size={12} /> Thử lại
                      </button>
                    )}
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
