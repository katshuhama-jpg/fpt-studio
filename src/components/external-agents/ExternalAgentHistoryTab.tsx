import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon, Copy01Icon, Tick02Icon, Download01Icon, ChevronLeftIcon, ChevronRightIcon } from "@hugeicons/core-free-icons";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { TimeRangeFilter, type TimeFilter } from "@/components/history/TimeRangeFilter";
import { ChannelFilterDropdown } from "@/components/history/ChannelFilterDropdown";
import { CHANNEL_META, type ConversationRecord } from "@/components/history/historyStore";
import { TIME_PRESETS } from "@/components/history/TimeRangeFilter";
import { FeedbackFilterDropdown, FEEDBACK_FILTERS, matchesFeedback, type FeedbackFilter } from "@/components/history/FeedbackFilterDropdown";
import { ExportHistoryDialog } from "@/components/history/ExportHistoryDialog";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { externalAgentStore } from "./externalAgentStore";
import { format } from "date-fns";
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

/** The shared Export dialog reads the internal ConversationRecord shape. */
function toRecord(c: ExternalConversation): ConversationRecord {
  return {
    id: c.id, agentId: c.agentId, channel: c.channel as ConversationRecord["channel"],
    username: c.username, email: c.email, startedAt: c.startedAt, endedAt: c.endedAt,
    messages: c.messages.map(m => ({
      id: m.id, role: m.role === "user" ? "customer" : "agent", content: m.content, at: m.at,
      feedback: m.feedback, feedbackComment: m.feedbackComment,
    })),
  };
}

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
    <CollapsibleHistoryPanel hidden={hidden} width={460} emptyHint="Chọn một cuộc trò chuyện trong danh sách để xem toàn bộ nội dung.">
      {conversation && (
        <>
          <div className="px-4 py-3.5 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-foreground truncate">{conversation.username}</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-sm">
                  <ChannelLogo channel={conversation.channel} size={16} />
                  <span className="font-medium text-foreground/80">{CHANNEL_META[conversation.channel].label}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{formatDateTime(conversation.endedAt)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground truncate">{conversation.id}</span>
              <button
                type="button"
                onClick={copyId}
                aria-label="Sao chép ID cuộc trò chuyện"
                title="Sao chép ID cuộc trò chuyện"
                className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
              >
                {copied ? <HugeiconsIcon icon={Tick02Icon} size={11} className="text-success" /> : <HugeiconsIcon icon={Copy01Icon} size={11} />}
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
                    className={`text-sm leading-relaxed rounded-2xl px-3 py-2 ${
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
                  {m.role === "agent" && m.feedback && (
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-medium ${m.feedback === "up" ? "bg-success-soft text-[hsl(var(--success-strong))]" : "bg-destructive/10 text-destructive"}`}>
                        {m.feedback === "up" ? <ThumbsUp size={11} aria-hidden /> : <ThumbsDown size={11} aria-hidden />}
                        {m.feedback === "up" ? "Người dùng đã like" : "Người dùng đã dislike"}
                      </span>
                      {m.feedbackComment && (
                        <p className="mt-1 pl-2 border-l-2 border-border text-xs text-muted-foreground italic">
                          <span className="sr-only">Comment của người dùng: </span>“{m.feedbackComment}”
                        </p>
                      )}
                    </div>
                  )}
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
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  // Space Admin only, same rule as Agent → History. Hidden for everyone else.
  const { can } = useMyPermissions();
  const canExport = can("agents.export");
  const PAGE_SIZE = 8;

  const allConversations = useMemo(() => externalAgentConversationStore.list(agentId), [agentId]);

  const timeBounds = (filter: TimeFilter): { from: number; to: number } | null => {
    const now = Date.now();
    if (filter === "today") return { from: startOfDay(new Date()).getTime(), to: now };
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
      .filter(c => matchesFeedback(c, feedbackFilter))
      .filter(c => {
        if (!q) return true;
        if (c.id.toLowerCase().includes(q)) return true;
        if (c.username.toLowerCase().includes(q)) return true;
        return c.messages.some(m => m.content.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConversations, query, channelFilter, timeFilter, customRange, feedbackFilter]);

  // Land on the most recent conversation by default, and keep the URL linkable.
  useEffect(() => {
    if (!selectedId && filtered.length > 0) selectConversation(filtered[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, filtered]);

  // Back to page 1 whenever the search or filters change what's in the result set.
  useEffect(() => { setPage(1); }, [query, channelFilter, timeFilter, customRange, feedbackFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shownConversations = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedConversation = filtered.find(c => c.id === selectedId) ?? null;
  const hasAnyConversations = allConversations.length > 0;

  const clearSearch = () => { setQuery(""); setChannelFilter("all"); setTimeFilter("all"); setCustomRange(undefined); setFeedbackFilter("all"); };

  const filterChips = [
    query.trim() ? `Từ khoá: "${query.trim()}"` : null,
    channelFilter !== "all" ? `Kênh: ${CHANNEL_META[channelFilter as keyof typeof CHANNEL_META]?.label ?? channelFilter}` : null,
    timeFilter === "custom" && customRange?.from && customRange?.to
      ? `${format(customRange.from, "dd/MM/yyyy")} → ${format(customRange.to, "dd/MM/yyyy")}`
      : timeFilter !== "all" ? TIME_PRESETS.find(t => t.id === timeFilter)?.name ?? null : null,
    feedbackFilter !== "all" ? FEEDBACK_FILTERS.find(x => x.id === feedbackFilter)?.label ?? null : null,
  ].filter((x): x is string => !!x);
  const exportRecords = useMemo(() => filtered.map(toRecord), [filtered]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto p-8">
        {/* Same layout as Agent → History: title + Export, then search, then filters. */}
        <div className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold">Lịch sử hội thoại</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Xem lại các cuộc trò chuyện giữa Agent này và người dùng.</p>
            </div>
            {canExport && (
              <span title={filtered.length === 0 ? "Không có cuộc trò chuyện nào để xuất" : undefined}>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  disabled={filtered.length === 0}
                  className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0 focus-ring"
                >
                  <HugeiconsIcon icon={Download01Icon} size={14} />
                  Xuất dữ liệu
                </button>
              </span>
            )}
          </div>
          <div className="relative mt-4">
            <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm theo nội dung, tên người gửi, ID cuộc trò chuyện hoặc ID tin nhắn"
              className="h-9 w-full pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
            />
          </div>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <ChannelFilterDropdown value={channelFilter} onChange={setChannelFilter} />
            <TimeRangeFilter
              value={timeFilter}
              customRange={customRange}
              onPreset={v => setTimeFilter(v)}
              onApplyCustom={range => { setCustomRange(range); setTimeFilter("custom"); }}
            />
            <FeedbackFilterDropdown value={feedbackFilter} onChange={setFeedbackFilter} />
          </div>
        </div>

        <ExportHistoryDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          agentId={agentId}
          agentName={externalAgentStore.get(agentId)?.name ?? "External Agent"}
          source="external"
          conversations={exportRecords}
          filterChips={filterChips}
          range={timeBounds(timeFilter)}
          defaultDislikesOnly={feedbackFilter === "down"}
        />

        {!hasAnyConversations ? (
          <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Chưa có cuộc trò chuyện nào. Khi Agent được publish và người dùng bắt đầu trò chuyện, các cuộc trò chuyện sẽ hiện ở đây.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
            <p className="text-sm text-muted-foreground mb-2">Không có cuộc trò chuyện nào khớp bộ lọc.</p>
            <button type="button" onClick={clearSearch} className="text-sm font-semibold text-primary hover:underline">
              Xoá bộ lọc
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-x-auto">
            <div className="grid grid-cols-[165px,100px,235px,155px,1fr,80px] gap-4 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[950px]">
              <div>Kết thúc</div><div>Phản hồi</div><div>ID cuộc trò chuyện</div><div>Kênh</div><div>Người dùng</div><div className="text-right">Tin nhắn</div>
            </div>
            <div className="divide-y divide-border min-w-[950px]">
              {shownConversations.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`w-full grid grid-cols-[165px,100px,235px,155px,1fr,80px] gap-4 px-4 py-3 items-center transition-base text-left ${
                    c.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted/50"
                  }`}
                >
                  <div className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(c.endedAt)}</div>
                  {(() => {
                    const up = c.messages.filter(m => m.feedback === "up").length;
                    const down = c.messages.filter(m => m.feedback === "down").length;
                    return (
                      <div className="flex items-center gap-2.5 text-sm tabular-nums" aria-label={`${up} like, ${down} dislike`}>
                        {up + down === 0 ? <span className="text-muted-foreground">-</span> : (
                          <>
                            <span className={`inline-flex items-center gap-1 ${up ? "text-[hsl(var(--success-strong))]" : "text-muted-foreground"}`}><ThumbsUp size={13} aria-hidden />{up}</span>
                            <span className={`inline-flex items-center gap-1 ${down ? "text-destructive font-medium" : "text-muted-foreground"}`}><ThumbsDown size={13} aria-hidden />{down}</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-sm font-mono truncate">{c.id}</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <ChannelLogo channel={c.channel} size={22} />
                    <span className="text-sm truncate">{CHANNEL_META[c.channel].label}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{c.username}</div>
                    <div className="text-sm text-muted-foreground truncate">{c.email ?? "-"}</div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">{c.messages.length}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasAnyConversations && filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-muted-foreground">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}/{filtered.length} · Trang {currentPage}/{totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang trước"
              >
                <HugeiconsIcon icon={ChevronLeftIcon} size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang sau"
              >
                <HugeiconsIcon icon={ChevronRightIcon} size={14} />
              </button>
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
