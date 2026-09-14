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
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel,
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
function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(2)}K` : `${n}`;
}

/** Minimal JS-object-to-YAML renderer — just enough for the flat tool-call payloads this
 * prototype mocks, to offer the same JSON/YAML format switch LangSmith's Turns view has. Not
 * a general YAML serializer (no anchors, multiline strings, etc.) since real payloads here are
 * always plain objects/arrays/primitives. */
function toYaml(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map(v => {
        if (v !== null && typeof v === "object") {
          const nested = toYaml(v, indent + 1).split("\n");
          return `${pad}- ${nested[0].trim()}\n${nested.slice(1).join("\n")}`;
        }
        return `${pad}- ${JSON.stringify(v)}`;
      })
      .join("\n");
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => (v !== null && typeof v === "object" ? `${pad}${k}:\n${toYaml(v, indent + 1)}` : `${pad}${k}: ${JSON.stringify(v)}`))
      .join("\n");
  }
  return `${pad}${JSON.stringify(value)}`;
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

/** A JSON/YAML-formatted payload with the same three controls LangSmith's Turns view has on
 * every tool input/output block: a format dropdown, a "Raw" (single-line, unformatted) toggle,
 * and copy. Shared by the inline tool-call block inside an AI message and by ToolResultCard. */
function PayloadBlock({ value }: { value: unknown }) {
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [raw, setRaw] = useState(false);
  const text = raw ? JSON.stringify(value) : format === "yaml" ? toYaml(value) : JSON.stringify(value, null, 2);
  return (
    <div>
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{text}</pre>
      <div className="flex items-center gap-1 mt-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-6 px-2 flex items-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
            >
              {format.toUpperCase()} <ChevronDown size={11} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-28">
            <DropdownMenuItem onClick={() => setFormat("json")} className="text-xs">
              {format === "json" && <Check size={12} className="mr-1.5" />} JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormat("yaml")} className="text-xs">
              {format === "yaml" && <Check size={12} className="mr-1.5" />} YAML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => setRaw(v => !v)}
          className={cn(
            "h-6 px-2 rounded-md text-[11px] font-medium transition-base",
            raw ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          Raw
        </button>
        <CopyButton text={text} />
      </div>
    </div>
  );
}

/** One HUMAN input or AI output item inside a turn's Inputs/Outputs section. An AI message that
 * made a tool call shows the call (name + id + input payload) inline, same as LangSmith renders
 * an AIMessage's tool_calls as part of that same message — the tool's own response is a
 * separate "TOOL" item below (ToolResultCard), matching the real AIMessage → ToolMessage pair. */
function MessageCard({ role, content, feedback, toolCall }: { role: "HUMAN" | "AI"; content: string; feedback?: "up" | "down"; toolCall?: ToolCallInfo }) {
  return (
    <div className="group relative px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-bold tracking-wider", role === "HUMAN" ? "text-primary" : "text-accent")}>{role}</span>
        <CopyButton text={content} />
      </div>
      {content && <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>}
      {feedback && (
        <div className={cn(
          "mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
          feedback === "up" ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
        )}>
          Người dùng đánh giá {feedback === "up" ? "hữu ích 👍" : "chưa hữu ích 👎"}
        </div>
      )}
      {toolCall && (
        <div className={cn("pt-3", content || feedback ? "mt-3 border-t border-border/60" : "")}>
          <div className="flex items-center gap-2 mb-1.5">
            <Wrench size={12} className="text-accent shrink-0" />
            <span className="text-xs font-semibold">{toolCall.name}</span>
            <span className="chip chip-accent !h-5 !text-[10px]">{toolCall.connector}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">{toolCall.callId}</span>
          </div>
          <PayloadBlock value={toolCall.input} />
        </div>
      )}
    </div>
  );
}

/** The tool's response to a call made by the preceding AI message — its own list item, same as
 * a ToolMessage is its own entry in the real message list (not nested inside the AI message). */
function ToolResultCard({ call }: { call: ToolCallInfo }) {
  return (
    <div className="px-3.5 py-3 bg-accent-soft">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold tracking-wider text-accent">TOOL</span>
        <span className="text-xs font-semibold">{call.name}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">{call.callId}</span>
      </div>
      <PayloadBlock value={call.output} />
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
  const [showTokens, setShowTokens] = useState(true);
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

  const totalTokens = trace.totals.tokensIn + trace.totals.tokensCacheRead + trace.totals.tokensOut + trace.totals.tokensReasoning;
  const pct = (v: number) => (totalTokens > 0 ? Math.round((v / totalTokens) * 100) : 0);

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
                <DropdownMenuCheckboxItem checked={showTokens} onCheckedChange={setShowTokens}>Show Tokens</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Visibility</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked disabled>Show all turns</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {trace.turns.map(turn => {
              const tokens = turn.tokensIn + turn.tokensCacheRead + turn.tokensOut + turn.tokensReasoning;
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
                      {(showLatency || showTokens) && (
                        <div className="flex items-center gap-2.5 mt-1 pl-7 text-[10px] text-muted-foreground">
                          {showLatency && (
                            <span className="inline-flex items-center gap-0.5"><Clock size={10} />{fmtSec(turn.latencyMs)}</span>
                          )}
                          {showTokens && <span className="font-mono">{fmtTokens(tokens)}</span>}
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
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Token breakdown</div>
                    <StatRow label={`Input (${pct(turn.tokensIn)}%)`} value={fmtTokens(turn.tokensIn)} />
                    {turn.tokensCacheRead > 0 && (
                      <StatRow label="cache read" value={fmtTokens(turn.tokensCacheRead)} />
                    )}
                    <StatRow label="Output" value={fmtTokens(turn.tokensOut)} />
                    <StatRow label="Reasoning" value={fmtTokens(turn.tokensReasoning)} />
                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <StatRow label="Total" value={fmtTokens(tokens)} />
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </aside>

        {/* Middle: turn feed */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] py-6 px-8 space-y-8">
            {trace.turns.map(turn => (
              <section key={turn.index} id={`turn-${turn.index}`} data-turn={turn.index} className="scroll-mt-3">
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [turn.index]: !c[turn.index] }))}
                  className="w-full flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground/70 uppercase mb-3 hover:text-foreground transition-base"
                >
                  <ChevronDown size={14} className={cn("transition-transform", collapsed[turn.index] && "-rotate-90")} />
                  Turn {turn.index}
                </button>

                {!collapsed[turn.index] && (
                  <div className="grid grid-cols-[1fr,220px] gap-4 items-start">
                    <div className="space-y-3 min-w-0">
                      {turn.customer && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface">
                          <div className="px-3.5 py-1.5 bg-surface-muted border-b border-border text-right">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inputs</span>
                          </div>
                          <MessageCard role="HUMAN" content={turn.customer.content} />
                        </div>
                      )}

                      <div className="border border-border rounded-xl overflow-hidden bg-surface">
                        <div className="px-3.5 py-1.5 bg-surface-muted border-b border-border flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Outputs</span>
                          <span className="chip chip-muted !h-4 !text-[9px] !px-1.5">
                            messages: {turn.agentMessages.reduce((n, m) => n + (m.toolCall ? 2 : 1), 0)}
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {turn.agentMessages.map(m => (
                            <div key={m.id} className="divide-y divide-border">
                              <MessageCard role="AI" content={m.content} feedback={m.feedback} toolCall={m.toolCall} />
                              {m.toolCall && <ToolResultCard call={m.toolCall} />}
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
                      <StatRow label="Tokens" value={fmtTokens(turn.tokensIn + turn.tokensCacheRead + turn.tokensOut + turn.tokensReasoning)} />
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

          <div className="mt-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Token breakdown</div>
          <StatRow label={`Input (${pct(trace.totals.tokensIn)}%)`} value={fmtTokens(trace.totals.tokensIn)} />
          {trace.totals.tokensCacheRead > 0 && (
            <StatRow label={`cache read (${pct(trace.totals.tokensCacheRead)}%)`} value={fmtTokens(trace.totals.tokensCacheRead)} />
          )}
          <StatRow label={`Output (${pct(trace.totals.tokensOut)}%)`} value={fmtTokens(trace.totals.tokensOut)} />
          <StatRow label={`Reasoning (${pct(trace.totals.tokensReasoning)}%)`} value={fmtTokens(trace.totals.tokensReasoning)} />
          <div className="border-t border-border mt-1.5 pt-1.5">
            <StatRow label="Total" value={fmtTokens(totalTokens)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
