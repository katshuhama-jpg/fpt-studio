import { useMemo, useState } from "react";
import { Search, Zap, CheckCircle2, ThumbsDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { externalAgentStore, type HistoryEntry } from "./externalAgentStore";

const PAGE_SIZE = 20;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EntryIcon({ summary }: { summary: string }) {
  if (summary.startsWith("Rejected by")) return <ThumbsDown size={15} className="text-destructive shrink-0" />;
  if (summary === "Published" || summary.startsWith("Approved by")) return <CheckCircle2 size={15} className="text-success shrink-0" />;
  return <Zap size={15} className="text-primary shrink-0" />;
}

export default function ExternalAgentActivityTab({ agentId }: { agentId: string }) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allEntries = externalAgentStore.activity(agentId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(e =>
      e.summary.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q) ||
      (e.detail ?? "").toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntries, query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;
  const hasAnyEntries = allEntries.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold">Activity</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Every connection lifecycle event — created, updated, submitted, approved, rejected, published, unpublished, paused, resumed.</p>
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
            {hasAnyEntries ? "No events match your search." : "No activity yet. Activity will appear here once this connection is created and used."}
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
              {visible.map((e: HistoryEntry) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(e.at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <EntryIcon summary={e.summary} />
                      <span className="font-medium">{e.summary}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{e.actor}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[320px]" title={e.detail}>{e.detail ?? "—"}</td>
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
  );
}
