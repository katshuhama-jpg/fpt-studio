import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, ChevronRight as ChevronRightIcon, X, Copy, Check, MessageCircle,
  Globe, MessageSquare, Facebook, Slack, Users, Webhook, Building2, CheckCircle2, XCircle, CircleHelp,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  externalAgentConversationStore,
  type ExternalAgentChannel, type ExternalConversation, type ConversationMessage, type RunMeta,
} from "./externalAgentConversationStore";

const CHANNEL_META: Record<ExternalAgentChannel, { label: string; icon: any }> = {
  web: { label: "Web", icon: Globe },
  zalo: { label: "Zalo", icon: MessageSquare },
  messenger: { label: "Facebook Messenger", icon: Facebook },
  slack: { label: "Slack", icon: Slack },
  teams: { label: "Microsoft Teams", icon: Users },
  api: { label: "API", icon: Webhook },
  workspace: { label: "Workspace", icon: Building2 },
};

function ChannelIcon({ channel, size = 18 }: { channel: ExternalAgentChannel; size?: number }) {
  const Icon = CHANNEL_META[channel].icon;
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-white border border-border shrink-0 text-muted-foreground" style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.6)} />
    </span>
  );
}

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

type TimeFilter = "all" | "today" | "7d" | "30d";
const DAY = 86_400_000;

/** Collapsed-by-default row under an agent reply — the metadata a per-turn HTTP run carries
 * that a normal (non-external) agent's history doesn't need, since here one turn = one request. */
function RunMetaRow({ run }: { run: RunMeta }) {
  const [open, setOpen] = useState(false);
  const outcomeMeta = run.outcome === "success"
    ? { icon: CheckCircle2, cls: "text-success", label: "Completed" }
    : run.outcome === "error"
    ? { icon: XCircle, cls: "text-destructive", label: "Failed" }
    : { icon: CircleHelp, cls: "text-warning", label: "Interrupt" };
  const OutcomeIcon = outcomeMeta.icon;
  const hasDetail = run.toolCalls.length > 0 || !!run.errorMessage;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-[11px] ${outcomeMeta.cls} ${hasDetail ? "cursor-pointer hover:underline" : "cursor-default"}`}
      >
        {hasDetail && <ChevronRightIcon size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />}
        <OutcomeIcon size={11} />
        <span className="font-mono">Run {run.runId}</span>
        <span>·</span>
        <span>{(run.durationMs / 1000).toFixed(1)}s</span>
        <span>·</span>
        <span className="font-medium">{outcomeMeta.label}</span>
      </button>
      {open && hasDetail && (
        <div className="mt-1.5 ml-4 space-y-1.5 border-l-2 border-border pl-2.5">
          {run.toolCalls.map((tc, i) => (
            <div key={i} className="text-[11px]">
              <div className="font-mono font-medium text-foreground">{tc.name}()</div>
              <div className="text-muted-foreground font-mono break-all">args: {tc.args}</div>
              {tc.result && <div className="text-muted-foreground font-mono break-all">result: {tc.result}</div>}
            </div>
          ))}
          {run.errorMessage && (
            <div className="text-[11px] text-destructive leading-relaxed">{run.errorMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

function TranscriptPanel({ conversation, onClose }: { conversation: ExternalConversation | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (!conversation) return;
    navigator.clipboard?.writeText(conversation.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="w-[460px] border-l border-border bg-background flex flex-col shrink-0 overflow-hidden">
      {!conversation ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-3">
            <MessageCircle size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No conversation selected</p>
          <p className="text-xs text-muted-foreground max-w-[220px]">Click a conversation in the list to view the full transcript.</p>
        </div>
      ) : (
        <>
          <div className="px-4 py-3.5 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-foreground truncate">{conversation.username}</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                  <ChannelIcon channel={conversation.channel} size={16} />
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

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                  {m.role === "agent" && m.run && <RunMetaRow run={m.run} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

export default function ExternalAgentHistoryTab({ agentId }: { agentId: string }) {
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

  const allConversations = useMemo(() => externalAgentConversationStore.list(agentId), [agentId]);

  const timeBounds = (filter: TimeFilter): { from: number; to: number } | null => {
    const now = Date.now();
    if (filter === "today") return { from: now - DAY, to: now };
    if (filter === "7d") return { from: now - 7 * DAY, to: now };
    if (filter === "30d") return { from: now - 30 * DAY, to: now };
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
  }, [allConversations, query, channelFilter, timeFilter]);

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
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {(Object.keys(CHANNEL_META) as ExternalAgentChannel[]).map(id => (
                  <SelectItem key={id} value={id}>{CHANNEL_META[id].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={v => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="h-9 w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
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
                    <ChannelIcon channel={c.channel} size={22} />
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
        onClose={() => {
          const next = new URLSearchParams(params);
          next.delete("conversationId");
          setParams(next, { replace: true });
        }}
      />
    </div>
  );
}
