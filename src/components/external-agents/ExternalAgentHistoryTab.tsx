import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, Copy, Check } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { TimeRangeFilter, type TimeFilter } from "@/components/history/TimeRangeFilter";
import { ChannelFilterDropdown } from "@/components/history/ChannelFilterDropdown";
import { CHANNEL_META } from "@/components/history/historyStore";
import ChannelLogo from "@/components/history/ChannelLogo";
import CollapsibleHistoryPanel from "@/components/history/CollapsibleHistoryPanel";
import {
  externalAgentConversationStore,
  type ExternalConversation, type ConversationMessage,
} from "./externalAgentConversationStore";

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAY = 86_400_000;

function TranscriptPanel({ conversation, hidden, onClose }: { conversation: ExternalConversation | null; hidden: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Land on the newest message when a conversation opens, instead of the top of a long thread.
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [conversation?.id]);

  const copyId = () => {
    if (!conversation) return;
    navigator.clipboard?.writeText(conversation.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <CollapsibleHistoryPanel hidden={hidden} width={460} emptyHint="Click a conversation in the list to view the full transcript.">
      {conversation && (
        <>
          <div className="px-4 py-3.5 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-foreground truncate">{conversation.username}</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                  <ChannelLogo channel={conversation.channel} size={16} />
                  <span className="font-medium text-foreground/80">{CHANNEL_META[conversation.channel].label}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{formatDateTime(conversation.endedAt)}</span>
                </div>
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
            <div className="flex items-center gap-1 mt-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground truncate">{conversation.id}</span>
              <button
                type="button"
                onClick={copyId}
                aria-label="Copy conversation ID"
                title="Copy conversation ID"
                className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
              >
                {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          <div ref={messagesRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {conversation.messages.map((m: ConversationMessage) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "agent" && (
                  <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-[10px] font-semibold text-primary mr-2 shrink-0 mt-0.5">
                    A
                  </div>
                )}
                <div className="max-w-[82%]">
                  <div
                    className={`text-xs leading-relaxed rounded-2xl px-3 py-2 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-surface-muted border border-border rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <div className={`mt-1 text-[10px] text-muted-foreground ${m.role === "user" ? "text-right" : "text-left"}`}>
                    {formatTime(m.at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </CollapsibleHistoryPanel>
  );
}

export default function ExternalAgentHistoryTab({ agentId }: { agentId: string }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("conversationId");
  const panelHidden = params.get("panel") === "hidden";
  const selectConversation = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("conversationId", id);
    next.delete("panel");
    setParams(next, { replace: true });
  };
  const closePanel = () => {
    const next = new URLSearchParams(params);
    next.set("panel", "hidden");
    setParams(next, { replace: true });
  };

  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const allConversations = useMemo(() => externalAgentConversationStore.list(agentId), [agentId]);

  const timeBounds = (filter: TimeFilter): { from: number; to: number } | null => {
    const now = Date.now();
    if (filter === "today") return { from: now - DAY, to: now };
    if (filter === "7d") return { from: now - 7 * DAY, to: now };
    if (filter === "30d") return { from: now - 30 * DAY, to: now };
    if (filter === "custom" && customRange?.from && customRange?.to) {
      return { from: startOfDay(customRange.from).getTime(), to: endOfDay(customRange.to).getTime() };
    }
    return null;
  };

  const filtered = useMemo(() => {
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

  // Land on the most recent conversation by default, and keep the URL linkable.
  useEffect(() => {
    if (!selectedId && filtered.length > 0) selectConversation(filtered[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, filtered]);

  const selectedConversation = filtered.find(c => c.id === selectedId) ?? null;
  const hasAnyConversations = allConversations.length > 0;
  const hasActiveSearch = query.trim().length > 0;

  const clearSearch = () => setQuery("");

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto p-8">
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
              onPreset={v => setTimeFilter(v)}
              onApplyCustom={range => { setCustomRange(range); setTimeFilter("custom"); }}
            />
          </div>
        </div>

        {!hasAnyConversations ? (
          <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No conversations yet. Once this agent is published and people start chatting, their conversations will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
            <p className="text-sm text-muted-foreground mb-2">No conversations match your search.</p>
            {hasActiveSearch && (
              <button type="button" onClick={clearSearch} className="text-sm font-semibold text-primary hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-x-auto">
            <div className="grid grid-cols-[165px,235px,155px,1fr,80px] gap-4 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[850px]">
              <div>Ended</div><div>Conversation ID</div><div>Channel</div><div>User</div><div className="text-right">Messages</div>
            </div>
            <div className="divide-y divide-border min-w-[850px]">
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`w-full grid grid-cols-[165px,235px,155px,1fr,80px] gap-4 px-4 py-3 items-center transition-base text-left ${
                    c.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted/50"
                  }`}
                >
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(c.endedAt)}</div>
                  <div className="text-xs font-mono truncate">{c.id}</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <ChannelLogo channel={c.channel} size={22} />
                    <span className="text-xs truncate">{CHANNEL_META[c.channel].label}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{c.username}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.email ?? "—"}</div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">{c.messages.length}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <TranscriptPanel
        conversation={selectedConversation}
        hidden={panelHidden}
        onClose={closePanel}
      />
    </div>
  );
}
