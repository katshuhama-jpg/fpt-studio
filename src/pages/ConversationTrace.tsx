import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ChevronLeft, ChevronDown, Copy, Check, Clock, Wrench,
  Settings2, Waypoints,
} from "lucide-react";
import { historyStore } from "@/components/history/historyStore";
import type { ConversationMessage, ToolCallInfo } from "@/components/history/historyStore";
import { buildTrace } from "@/components/history/traceStore";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

function fmtTime(ms: number) {
  return format(new Date(ms), "dd/MM/yyyy, HH:mm:ss");
}
function fmtSec(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}
function fmtUsd(v: number) {
  return `$${v.toFixed(4)}`;
}
function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(2)}K` : `${n}`;
}

/** Small copy-on-hover affordance shared by every message / tool card. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy"
      aria-label="Copy"
      className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-surface-muted hover:text-foreground transition-base"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

/** One HUMAN input or AI output bubble inside a turn's Inputs/Outputs section. */
function MessageCard({ role, content, feedback }: { role: "HUMAN" | "AI"; content: string; feedback?: "up" | "down" }) {
  return (
    <div className="group relative px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-bold tracking-wider", role === "HUMAN" ? "text-primary" : "text-accent")}>{role}</span>
        <CopyButton text={content} />
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
      {feedback && (
        <div className={cn(
          "mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
          feedback === "up" ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
        )}>
          Người dùng đánh giá {feedback === "up" ? "hữu ích 👍" : "chưa hữu ích 👎"}
        </div>
      )}
    </div>
  );
}

/** A tool/connector call step — rendered between the AI's own message when present. */
function ToolCard({ call }: { call: ToolCallInfo }) {
  const [raw, setRaw] = useState(false);
  const inputStr = raw ? JSON.stringify(call.input) : JSON.stringify(call.input, null, 2);
  const outputStr = raw ? JSON.stringify(call.output) : JSON.stringify(call.output, null, 2);
  return (
    <div className="group bg-accent-soft/30">
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border/60">
        <Wrench size={12} className="text-accent shrink-0" />
        <span className="text-[10px] font-bold tracking-wider text-accent">TOOL CALL</span>
        <span className="text-xs font-mono">{call.name}</span>
        <span className="chip chip-accent !h-5 !text-[10px]">{call.connector}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">{call.callId}</span>
        <button
          type="button"
          onClick={() => setRaw(v => !v)}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface-muted transition-base"
        >
          {raw ? "Pretty" : "Raw"}
        </button>
        <CopyButton text={`${inputStr}\n${outputStr}`} />
      </div>
      <div className="px-3.5 py-2 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">input</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{inputStr}</pre>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">output</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{outputStr}</pre>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono">{value}</span>
    </div>
  );
}

export default function ConversationTrace() {
  const { id: agentId = "cskh", conversationId = "" } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showLatency, setShowLatency] = useState(true);
  const [showCost, setShowCost] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [activeTurn, setActiveTurn] = useState(1);
  const mainRef = useRef<HTMLDivElement>(null);

  const record = useMemo(() => historyStore.get(agentId, conversationId), [agentId, conversationId]);
  const trace = useMemo(() => (record ? buildTrace(record) : null), [record]);

  // Highlight whichever turn is currently in view while scrolling the middle feed, same as
  // LangSmith's Turns list tracking the active turn — not just on click.
  useEffect(() => {
    if (!trace) return;
    const root = mainRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveTurn(Number((visible[0].target as HTMLElement).dataset.turn));
      },
      { root, threshold: [0.2, 0.5, 0.8] },
    );
    trace.turns.forEach(t => {
      const el = document.getElementById(`turn-${t.index}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [trace]);

  const scrollToTurn = (index: number) => {
    setActiveTurn(index);
    document.getElementById(`turn-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const backToHistory = () => navigate(`/agents/${agentId}?tab=insights&section=history&conversationId=${conversationId}`);

  if (!record || !trace) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-3">
        <p className="text-sm text-muted-foreground">Không tìm thấy trace cho hội thoại này.</p>
        <button onClick={backToHistory} className="btn-primary h-9 px-4">
          <ChevronLeft size={14} /> Quay lại History
        </button>
      </div>
    );
  }

  const totalCost = trace.totals.costIn + trace.totals.costOut + trace.totals.costReasoning;
  const totalTokens = trace.totals.tokensIn + trace.totals.tokensOut + trace.totals.tokensReasoning;
  const pct = (v: number) => (totalCost > 0 ? Math.round((v / totalCost) * 100) : 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Topbar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button
          type="button"
          onClick={backToHistory}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base shrink-0"
        >
          <ChevronLeft size={15} /> Back to History
        </button>
        <div className="w-px h-5 bg-border shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <Waypoints size={15} className="text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">Trace</span>
          <span className="text-xs font-mono text-muted-foreground truncate">{trace.conversationId}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(trace.conversationId).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            title="Copy conversation ID"
            className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          </button>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">
          Model: <span className="font-medium text-foreground">{trace.model}</span>
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Turns list */}
        <aside className="w-[248px] border-r border-border bg-surface flex flex-col shrink-0">
          <div className="h-10 px-3 flex items-center justify-between border-b border-border shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Turns</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Turns display settings"
                  className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                >
                  <Settings2 size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Display</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={showLatency} onCheckedChange={setShowLatency}>Show Latency</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={showCost} onCheckedChange={setShowCost}>Show Cost and Tokens</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Visibility</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked disabled>Show all turns</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {trace.turns.map(turn => {
              const cost = turn.costIn + turn.costOut + turn.costReasoning;
              const hasTool = turn.agentMessages.some(m => m.toolCall);
              return (
                <HoverCard key={turn.index} openDelay={200} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      onClick={() => scrollToTurn(turn.index)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg border transition-base",
                        activeTurn === turn.index ? "border-primary/40 bg-primary-soft" : "border-transparent hover:bg-surface-muted",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-5 w-5 shrink-0 rounded-full bg-surface-muted border border-border flex items-center justify-center text-[10px] font-semibold">
                          {turn.index}
                        </span>
                        <span className="text-sm font-medium truncate">Banking ABC Agent</span>
                        {hasTool && <Wrench size={11} className="text-accent shrink-0" />}
                      </div>
                      {(showLatency || showCost) && (
                        <div className="flex items-center gap-2.5 mt-1 pl-7 text-[10px] text-muted-foreground">
                          {showLatency && (
                            <span className="inline-flex items-center gap-0.5"><Clock size={10} />{fmtSec(turn.latencyMs)}</span>
                          )}
                          {showCost && <span className="font-mono">{fmtUsd(cost)}</span>}
                        </div>
                      )}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-72 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-success" />
                      <span className="font-semibold text-sm">Banking ABC Agent</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-2">Thread Turn</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time</div>
                    <StatRow label="Start" value={fmtTime(turn.startedAt)} />
                    <StatRow label="End" value={fmtTime(turn.endedAt)} />
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Total cost breakdown</div>
                    <StatRow label={`Input (${pct(turn.costIn)}%)`} value={`${fmtTokens(turn.tokensIn)} · ${fmtUsd(turn.costIn)}`} />
                    <StatRow label="Output" value={`${fmtTokens(turn.tokensOut)} · ${fmtUsd(turn.costOut)}`} />
                    <StatRow label="Reasoning" value={`${fmtTokens(turn.tokensReasoning)} · ${fmtUsd(turn.costReasoning)}`} />
                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <StatRow label="Total" value={`${fmtTokens(turn.tokensIn + turn.tokensOut + turn.tokensReasoning)} · ${fmtUsd(cost)}`} />
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </aside>

        {/* Middle: turn feed */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-[860px] mx-auto py-6 px-6 space-y-8">
            {trace.turns.map(turn => (
              <section key={turn.index} id={`turn-${turn.index}`} data-turn={turn.index} className="scroll-mt-3">
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [turn.index]: !c[turn.index] }))}
                  className="w-full flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 hover:text-foreground transition-base"
                >
                  <ChevronDown size={14} className={cn("transition-transform", collapsed[turn.index] && "-rotate-90")} />
                  Turn {turn.index}
                </button>

                {!collapsed[turn.index] && (
                  <div className="grid grid-cols-[1fr,220px] gap-4 items-start">
                    <div className="space-y-3 min-w-0">
                      {turn.customer && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface">
                          <div className="px-3.5 py-1.5 bg-surface-muted/60 border-b border-border text-right">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inputs</span>
                          </div>
                          <MessageCard role="HUMAN" content={turn.customer.content} />
                        </div>
                      )}

                      <div className="border border-border rounded-xl overflow-hidden bg-surface">
                        <div className="px-3.5 py-1.5 bg-surface-muted/60 border-b border-border flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Outputs</span>
                          <span className="chip chip-muted !h-4 !text-[9px] !px-1.5">messages: {turn.agentMessages.length}</span>
                        </div>
                        <div className="divide-y divide-border">
                          {turn.agentMessages.map(m => (
                            <div key={m.id} className="divide-y divide-border">
                              {m.toolCall && <ToolCard call={m.toolCall} />}
                              <MessageCard role="AI" content={m.content} feedback={m.feedback} />
                            </div>
                          ))}
                          {turn.agentMessages.length === 0 && (
                            <p className="px-3.5 py-3 text-xs text-muted-foreground">Cuộc hội thoại kết thúc — chưa có phản hồi từ agent.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Per-turn quick stats, mirrors the sidebar hover card inline */}
                    <div className="border border-border rounded-xl p-3 bg-surface text-xs space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Turn stats</div>
                      <StatRow label="Latency" value={fmtSec(turn.latencyMs)} />
                      <StatRow label="Tokens" value={fmtTokens(turn.tokensIn + turn.tokensOut + turn.tokensReasoning)} />
                      <StatRow label="Cost" value={fmtUsd(turn.costIn + turn.costOut + turn.costReasoning)} />
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </main>

        {/* Right: Stats panel */}
        <aside className="w-[300px] border-l border-border bg-surface p-4 overflow-y-auto shrink-0">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stats</div>
          <StatRow label="Turns" value={String(trace.turns.length)} />

          <div className="mt-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Time</div>
          <StatRow label="First start" value={fmtTime(trace.startedAt)} />
          <StatRow label="Last end" value={fmtTime(trace.endedAt)} />

          <div className="mt-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Latency</div>
          <StatRow label="P50" value={fmtSec(trace.totals.p50LatencyMs)} />
          <StatRow label="P99" value={fmtSec(trace.totals.p99LatencyMs)} />

          <div className="mt-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total cost breakdown</div>
          <StatRow label={`Input (${pct(trace.totals.costIn)}%)`} value={`${fmtTokens(trace.totals.tokensIn)} · ${fmtUsd(trace.totals.costIn)}`} />
          <StatRow label={`Output (${pct(trace.totals.costOut)}%)`} value={`${fmtTokens(trace.totals.tokensOut)} · ${fmtUsd(trace.totals.costOut)}`} />
          <StatRow label={`Reasoning (${pct(trace.totals.costReasoning)}%)`} value={`${fmtTokens(trace.totals.tokensReasoning)} · ${fmtUsd(trace.totals.costReasoning)}`} />
          <div className="border-t border-border mt-1.5 pt-1.5">
            <StatRow label="Total" value={`${fmtTokens(totalTokens)} · ${fmtUsd(totalCost)}`} />
          </div>
        </aside>
      </div>
    </div>
  );
}
