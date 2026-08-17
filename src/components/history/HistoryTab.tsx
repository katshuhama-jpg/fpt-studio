import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { historyStore, CHANNEL_META, type ConversationChannel, type ConversationRecord } from "./historyStore";

const CHANNEL_CHIP: Record<ConversationChannel, string> = {
  web: "chip-primary",
  zalo: "chip-accent",
  api: "chip-warning",
};

type TimeFilter = "all" | "today" | "7d" | "30d";
const TIME_OPTIONS: { id: TimeFilter; name: string }[] = [
  { id: "all", name: "All time" },
  { id: "today", name: "Today" },
  { id: "7d", name: "Last 7 days" },
  { id: "30d", name: "Last 30 days" },
];

/* ─── Small local filter dropdown — matches Members.tsx's FilterChip pattern ─── */
function FilterDropdown({
  value, allLabel, options, onChange,
}: {
  value: string;
  allLabel: string;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
      >
        {selected ? selected.name : allLabel}
        <ChevronDown size={12} className={`text-muted-foreground transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-48 max-h-72 overflow-y-auto bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
          <button
            type="button"
            onClick={() => { onChange("all"); setOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === "all" ? "text-primary font-medium" : "text-foreground"}`}
          >
            {allLabel}
          </button>
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === o.id ? "text-primary font-medium" : "text-foreground"}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryTab({ agentId }: { agentId: string }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("conversationId");
  const selectConversation = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("conversationId", id);
    setParams(next, { replace: true });
  };

  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const allConversations = useMemo(() => historyStore.list(agentId), [agentId]);
  const channelOptions = (Object.keys(CHANNEL_META) as ConversationChannel[]).map(id => ({ id, name: CHANNEL_META[id].label }));

  useEffect(() => { setPage(1); }, [query, channelFilter, timeFilter]);

  // Land on the most recent conversation by default, instead of an empty "no conversation selected" state.
  useEffect(() => {
    if (!selectedId && allConversations.length > 0) selectConversation(allConversations[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, allConversations]);

  const timeCutoff = (filter: TimeFilter): number | null => {
    const now = Date.now();
    if (filter === "today") return startOfDay(new Date()).getTime();
    if (filter === "7d") return now - 7 * 86_400_000;
    if (filter === "30d") return now - 30 * 86_400_000;
    return null;
  };

  const visibleConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = timeCutoff(timeFilter);
    return allConversations
      .filter(c => channelFilter === "all" || c.channel === channelFilter)
      .filter(c => cutoff === null || c.endedAt >= cutoff)
      .filter(c => {
        if (!q) return true;
        if (c.id.toLowerCase().includes(q)) return true;
        if (c.username.toLowerCase().includes(q)) return true;
        return c.messages.some(m => m.content.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      });
  }, [allConversations, query, channelFilter, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleConversations.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shownConversations = visibleConversations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasAnyConversations = allConversations.length > 0;

  return (
    <div className="p-8 w-full animate-fade-up">
      <div className="mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">See past conversations between this agent and its users.</p>
        </div>
        <div className="relative mt-4">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by content, sender name, conversation ID, or message ID"
            className="h-9 w-full pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
          />
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <FilterDropdown value={channelFilter} allLabel="All channels" options={channelOptions} onChange={setChannelFilter} />
          <FilterDropdown value={timeFilter} allLabel="All time" options={TIME_OPTIONS.filter(o => o.id !== "all")} onChange={v => setTimeFilter(v as TimeFilter)} />
        </div>
      </div>

      {!hasAnyConversations ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-lg font-semibold mb-1.5">No conversations yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Once people start chatting with this agent, their conversations will show up here.
          </p>
        </div>
      ) : visibleConversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No conversations match your filters. Try a different channel, time range, or search term.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[160px,150px,110px,1fr,70px] gap-3 px-6 py-2.5 bg-surface-muted section-eyebrow">
              <div>Ended</div><div>Conversation ID</div><div>Channel</div><div>User</div><div>Messages</div>
            </div>
            <div className="divide-y divide-border">
              {shownConversations.map((c: ConversationRecord) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`w-full grid grid-cols-[160px,150px,110px,1fr,70px] gap-3 px-6 py-3 items-center transition-base text-left ${
                    c.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted/50"
                  }`}
                >
                  <div className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(c.endedAt), "dd/MM/yyyy - HH:mm")}</div>
                  <div className="text-sm font-mono truncate">{c.id}</div>
                  <div>
                    <span className={`chip ${CHANNEL_CHIP[c.channel]} text-xs whitespace-nowrap`}>
                      {CHANNEL_META[c.channel].emoji} {CHANNEL_META[c.channel].label}
                    </span>
                  </div>
                  <div className="text-sm truncate">{c.username}</div>
                  <div className="text-sm text-muted-foreground">{c.messages.length}</div>
                </button>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">Page {currentPage}/{totalPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
