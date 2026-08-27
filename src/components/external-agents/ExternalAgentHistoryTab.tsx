import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, RefreshCw, User, Zap } from "lucide-react";
import { externalAgentStore, type HistoryEntry } from "./externalAgentStore";

const PAGE_SIZE = 20;

type Filter = "all" | "runs" | "changes";

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms?: number): string {
  if (ms == null) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}

function EntryIcon({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === "run") {
    return entry.runOk
      ? <CheckCircle2 size={16} className="text-success shrink-0" />
      : <XCircle size={16} className="text-destructive shrink-0" />;
  }
  return <Zap size={16} className="text-primary shrink-0" />;
}

export default function ExternalAgentHistoryTab({ agentId }: { agentId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailEntry, setDetailEntry] = useState<HistoryEntry | null>(null);

  const allEntries = externalAgentStore.history(agentId);
  const filtered = useMemo(() => {
    if (filter === "runs") return allEntries.filter(e => e.kind === "run");
    if (filter === "changes") return allEntries.filter(e => e.kind === "change");
    return allEntries;
  }, [allEntries, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {([
            { key: "all", label: "All" },
            { key: "runs", label: "Runs" },
            { key: "changes", label: "Changes" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setFilter(t.key); setVisibleCount(PAGE_SIZE); }}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-base ${
                filter === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-8 w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No activity yet. Activity will appear here once this agent is approved and used.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Event</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">By</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Details</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {visible.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(e.at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <EntryIcon entry={e} />
                      <span className="font-medium">{e.summary}</span>
                      {e.kind === "run" && e.durationMs != null && (
                        <span className="text-xs text-muted-foreground">· {formatDuration(e.durationMs)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><User size={11} /> {e.actor}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[280px]">{e.detail ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {e.kind === "run" && (
                      <button
                        type="button"
                        onClick={() => setDetailEntry(e)}
                        className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> Load more
          </button>
        </div>
      )}

      <Sheet open={!!detailEntry} onOpenChange={v => !v && setDetailEntry(null)}>
        <SheetContent className="sm:max-w-[440px] overflow-y-auto">
          {detailEntry && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display flex items-center gap-2">
                  <EntryIcon entry={detailEntry} /> {detailEntry.summary}
                </SheetTitle>
                <SheetDescription>{formatTimestamp(detailEntry.at)}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Triggered by</span>
                    <span className="text-foreground font-medium">{detailEntry.actor}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="text-foreground font-medium">{formatDuration(detailEntry.durationMs) || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Result</span>
                    <span className={`font-medium ${detailEntry.runOk ? "text-success" : "text-destructive"}`}>
                      {detailEntry.runOk ? "Completed" : "Failed"}
                    </span>
                  </div>
                </div>
                {detailEntry.detail && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">{detailEntry.runOk ? "Result" : "What went wrong"}</h4>
                    <p className={`text-xs leading-relaxed ${detailEntry.runOk ? "text-muted-foreground" : "text-destructive"}`}>
                      {detailEntry.detail}
                    </p>
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
