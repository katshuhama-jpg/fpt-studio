import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Waypoints, Clock, Zap } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { historyStore, CHANNEL_META, type ConversationRecord } from "./historyStore";
import { buildTrace } from "./traceStore";
import ChannelLogo from "./ChannelLogo";
import { TimeRangeFilter, type TimeFilter } from "./TimeRangeFilter";
import { ChannelFilterDropdown } from "./ChannelFilterDropdown";

// Above these, Latency / First Token are called out red — same red/green treatment LangSmith's
// own Latency and First Token badges get on its Traces list — purely a display threshold for
// the prototype, not tied to any real SLA.
const SLOW_LATENCY_MS = 3000;
const SLOW_FIRST_TOKEN_MS = 1500;

function fmtCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
}

/** One row's worth of derived stats — turns, Latency, First Token, token/cost totals, and the
 * First Input / Last Output previews — computed from the same deterministic buildTrace() the
 * Trace page uses, so the numbers agree everywhere a given conversation shows up. Field set and
 * naming follow LangSmith's own Threads/Traces columns (Turns, First Input, Last Output,
 * Latency, First Token, Tokens, Cost, Last Error, Feedback) rather than inventing new ones. */
function rowStats(c: ConversationRecord) {
  const trace = buildTrace(c);
  const tokens = trace.totals.tokensIn + trace.totals.tokensCacheRead + trace.totals.tokensOut + trace.totals.tokensReasoning;
  const cost = trace.totals.costIn + trace.totals.costCacheRead + trace.totals.costOut + trace.totals.costReasoning;
  const firstInput = c.messages.find(m => m.role === "customer")?.content ?? c.messages[0]?.content ?? "";
  const lastOutput = [...c.messages].reverse().find(m => m.role === "agent")?.content ?? c.messages[c.messages.length - 1]?.content ?? "";
  const feedbackUp = c.messages.filter(m => m.feedback === "up").length;
  const feedbackDown = c.messages.filter(m => m.feedback === "down").length;
  return {
    turns: trace.turns.length,
    latencyMs: trace.totals.p50LatencyMs,
    firstTokenMs: trace.totals.firstTokenMs,
    tokens, cost, firstInput, lastOutput, feedbackUp, feedbackDown,
  };
}

export default function HistoryTab({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("conversationId");
  const selectConversation = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("conversationId", id);
    next.delete("panel");
    setParams(next, { replace: true });
  };

  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const allConversations = useMemo(() => historyStore.list(agentId), [agentId]);

  useEffect(() => { setPage(1); }, [query, channelFilter, timeFilter, customRange]);

  // Land on the most recent conversation by default, instead of an empty "no conversation selected" state.
  useEffect(() => {
    if (!selectedId && allConversations.length > 0) selectConversation(allConversations[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, allConversations]);

  const timeBounds = (filter: TimeFilter): { from: number; to: number } | null => {
    const now = Date.now();
    if (filter === "today") return { from: startOfDay(new Date()).getTime(), to: now };
    if (filter === "7d") return { from: now - 7 * 86_400_000, to: now };
    if (filter === "30d") return { from: now - 30 * 86_400_000, to: now };
    if (filter === "custom" && customRange?.from && customRange?.to) {
      return { from: startOfDay(customRange.from).getTime(), to: endOfDay(customRange.to).getTime() };
    }
    return null;
  };

  const visibleConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bounds = timeBounds(timeFilter);
    return allConversations
      .filter(c => channelFilter === "all" || c.channel === channelFilter)
      .filter(c => bounds === null || (c.endedAt >= bounds.from && c.endedAt <= bounds.to))
      .filter(c => {
        if (!q) return true;
        if (c.id.toLowerCase().includes(q)) return true;
        if (c.username.toLowerCase().includes(q)) return true;
        return c.messages.some(m => m.content.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConversations, query, channelFilter, timeFilter, customRange]);

  const totalPages = Math.max(1, Math.ceil(visibleConversations.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shownConversations = visibleConversations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasAnyConversations = allConversations.length > 0;

  return (
    <div className="p-8 w-full animate-fade-up">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold">History</h2>
        <p className="text-xs text-muted-foreground mt-0.5">See past conversations between this agent and its users.</p>
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
          <ChannelFilterDropdown value={channelFilter} onChange={setChannelFilter} />
          <TimeRangeFilter
            value={timeFilter}
            customRange={customRange}
            onPreset={v => { setTimeFilter(v); }}
            onApplyCustom={range => { setCustomRange(range); setTimeFilter("custom"); }}
          />
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
          <div className="rounded-xl border border-border overflow-x-auto">
            <div className="grid grid-cols-[60px,130px,130px,170px,1fr,1fr,140px,90px,90px,70px,70px,160px,80px,50px] gap-5 px-6 py-2.5 bg-surface-muted section-eyebrow min-w-[1900px]">
              <div>Turns</div><div>First Start Time</div><div>End time</div><div>Conversation ID</div>
              <div>First Input</div><div>Last Output</div><div>Channel</div>
              <div>Latency</div><div>First Token</div><div>Tokens</div><div>Cost</div><div>Last Error</div><div>Feedback</div>
              <div className="text-center">Trace</div>
            </div>
            <div className="divide-y divide-border min-w-[1900px]">
              {shownConversations.map((c: ConversationRecord) => {
                const stats = rowStats(c);
                const slowLatency = stats.latencyMs > SLOW_LATENCY_MS;
                const slowFirstToken = stats.firstTokenMs > SLOW_FIRST_TOKEN_MS;
                return (
                <div
                  key={c.id}
                  className={`relative w-full grid grid-cols-[60px,130px,130px,170px,1fr,1fr,140px,90px,90px,70px,70px,160px,80px,50px] gap-5 px-6 py-3 items-center transition-base ${
                    c.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    aria-label={`View conversation ${c.id}`}
                    className="absolute inset-0 text-left"
                  />
                  <div className="relative text-sm tabular-nums pointer-events-none">{stats.turns}</div>
                  <div className="relative text-sm text-muted-foreground whitespace-nowrap pointer-events-none">{format(new Date(c.startedAt), "dd/MM/yyyy - HH:mm")}</div>
                  <div className="relative text-sm text-muted-foreground whitespace-nowrap pointer-events-none">{format(new Date(c.endedAt), "dd/MM/yyyy - HH:mm")}</div>
                  <div className="relative text-sm truncate pointer-events-none">{c.id}</div>
                  <div className="relative text-sm text-muted-foreground truncate pointer-events-none" title={stats.firstInput}>{stats.firstInput}</div>
                  <div className="relative text-sm text-muted-foreground truncate pointer-events-none" title={stats.lastOutput}>{stats.lastOutput}</div>
                  <div className="relative flex items-center gap-2 min-w-0 pointer-events-none">
                    <ChannelLogo channel={c.channel} size={26} />
                    <span className="text-sm truncate">{CHANNEL_META[c.channel].label}</span>
                  </div>
                  <div className={`relative flex items-center gap-1 text-sm tabular-nums pointer-events-none ${slowLatency ? "text-red-600" : "text-emerald-600"}`}>
                    <Clock size={11} />{(stats.latencyMs / 1000).toFixed(1)}s
                  </div>
                  <div className={`relative flex items-center gap-1 text-sm tabular-nums pointer-events-none ${slowFirstToken ? "text-red-600" : "text-emerald-600"}`}>
                    <Zap size={11} />{(stats.firstTokenMs / 1000).toFixed(1)}s
                  </div>
                  <div className="relative text-sm text-muted-foreground tabular-nums pointer-events-none">{fmtCount(stats.tokens)}</div>
                  <div className="relative text-sm text-muted-foreground tabular-nums pointer-events-none">${stats.cost.toFixed(4)}</div>
                  <div className="relative text-sm truncate pointer-events-none" title={c.error}>
                    {c.error ? <span className="text-red-600">{c.error}</span> : <span className="text-muted-foreground">—</span>}
                  </div>
                  <div className="relative text-sm whitespace-nowrap pointer-events-none">
                    {stats.feedbackUp || stats.feedbackDown ? (
                      <span className="text-muted-foreground">
                        {stats.feedbackUp > 0 && <>👍 {stats.feedbackUp}</>}
                        {stats.feedbackUp > 0 && stats.feedbackDown > 0 && " "}
                        {stats.feedbackDown > 0 && <>👎 {stats.feedbackDown}</>}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <div className="relative flex items-center justify-center">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); navigate(`/agents/${agentId}/trace/${c.id}`); }}
                      title="View trace"
                      aria-label={`View trace for conversation ${c.id}`}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-primary transition-base"
                    >
                      <Waypoints size={15} />
                    </button>
                  </div>
                </div>
                );
              })}
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
