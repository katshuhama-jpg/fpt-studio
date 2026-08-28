import { useEffect, useMemo, useState } from "react";
import { Search, X, Copy, Check, CheckCircle2, XCircle, Zap, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { externalAgentStore, type HistoryEntry } from "./externalAgentStore";

const PAGE_SIZE = 20;

type Filter = "all" | "runs" | "changes";

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

/** Right-side detail viewer — same aside chrome as the regular Agent's History conversation
 * panel (fixed width, bordered, own header/close/copy-id, own scroll region), adapted for a
 * timeline entry that's either a run (request/result) or a change (no request data). */
function DetailPanel({ entry, onClose }: { entry: HistoryEntry | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (!entry) return;
    navigator.clipboard?.writeText(entry.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="w-[420px] border-l border-border bg-background flex flex-col shrink-0 overflow-hidden">
      {!entry ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-3">
            <Zap size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No entry selected</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">Click an entry in the list to view its details.</p>
        </div>
      ) : (
        <>
          <div className="px-4 py-3.5 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <EntryIcon entry={entry} />
                <div className="text-sm font-semibold leading-tight text-foreground truncate">{entry.summary}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <User size={12} className="text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground/80">{entry.actor}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{formatTimestamp(entry.at)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground truncate">{entry.id}</span>
              <button
                type="button"
                onClick={copyId}
                aria-label="Copy entry ID"
                title="Copy entry ID"
                className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
              >
                {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {entry.kind === "run" ? (
              <>
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="text-foreground font-medium">{formatDuration(entry.durationMs) || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Result</span>
                    <span className={`font-medium ${entry.runOk ? "text-success" : "text-destructive"}`}>
                      {entry.runOk ? "Completed" : "Failed"}
                    </span>
                  </div>
                </div>
                {entry.detail && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">{entry.runOk ? "Result" : "What went wrong"}</h4>
                    <p className={`text-xs leading-relaxed ${entry.runOk ? "text-muted-foreground" : "text-destructive"}`}>
                      {entry.detail}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {entry.detail ?? "No further detail for this change."}
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

export default function ExternalAgentHistoryTab({ agentId }: { agentId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allEntries = externalAgentStore.history(agentId);

  const filtered = useMemo(() => {
    let list = allEntries;
    if (filter === "runs") list = list.filter(e => e.kind === "run");
    if (filter === "changes") list = list.filter(e => e.kind === "change");
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.summary.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        (e.detail ?? "").toLowerCase().includes(q)
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries, filter, query]);

  // Land on the most recent entry by default, matching the regular Agent's History tab.
  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, filtered]);

  const selectedEntry = filtered.find(e => e.id === selectedId) ?? null;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;
  const hasAnyEntries = allEntries.length > 0;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto p-8">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold">History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Every run and connection change, merged into one timeline.</p>
        </div>

        <div className="relative mb-2.5">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by event, actor, or detail"
            className="h-9 w-full pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Select value={filter} onValueChange={v => { setFilter(v as Filter); setVisibleCount(PAGE_SIZE); }}>
            <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="runs">Runs</SelectItem>
              <SelectItem value="changes">Changes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {hasAnyEntries
                ? "No entries match your search."
                : "No activity yet. Activity will appear here once this agent is approved and used."}
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
                </tr>
              </thead>
              <tbody>
                {visible.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`border-b border-border last:border-0 cursor-pointer transition-base ${
                      e.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted/50"
                    }`}
                  >
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
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{e.actor}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[240px]">{e.detail ?? "—"}</td>
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
              className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      <DetailPanel entry={selectedEntry} onClose={() => setSelectedId(null)} />
    </div>
  );
}
