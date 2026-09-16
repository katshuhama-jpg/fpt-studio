import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ChevronLeft, ChevronDown, ChevronRight, Copy, Check, Clock, Wrench,
  Settings2, Waypoints, AlertTriangle, ShieldAlert, CheckCircle2, XCircle,
  UserCheck, Hourglass,
} from "lucide-react";
import { historyStore } from "@/components/history/historyStore";
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

/** Renders a JS value as a structured JSON tree — same shape as `JSON.stringify(value, null, 2)`
 * with LangSmith-style syntax coloring: keys in --code-key (steel blue), string leaf values in
 * --code-string (olive), number/boolean leaf values in --code-number (burnt orange), punctuation
 * (braces/commas/the ":" separator) dimmed as text-muted-foreground. This went through two
 * earlier passes this session — a first attempt reused the page's brighter status hues
 * (text-primary/text-success/text-warning) and got called "too colorful", so it was walked back
 * to a flat neutral two-tone; that in turn got called "too much gray" once keys and punctuation
 * were both muted. This third pass replaces the guessing with the actual reference: colors below
 * are sampled directly from LangSmith's own trace viewer (a muted, code-editor-style palette,
 * not the page's brighter accent hues) and verified at 4.5:1+ against white — see --code-key/
 * --code-string/--code-number in index.css. Only used for the formatted JSON view — the "Raw"
 * toggle intentionally stays plain text (that's what "raw" means), and YAML mode is unchanged
 * (still plain text) — colorizing a YAML tree is a separate, larger piece of work than this. */
function renderJson(value: unknown, indent = 0): React.ReactNode {
  const pad = "  ".repeat(indent);
  const childPad = "  ".repeat(indent + 1);
  const punct = "text-muted-foreground";
  if (value === null) return <span className={punct}>null</span>;
  if (typeof value === "boolean" || typeof value === "number") {
    return <span className="text-[hsl(var(--code-number))]">{String(value)}</span>;
  }
  if (typeof value === "string") return <span className="text-[hsl(var(--code-string))]">{JSON.stringify(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={punct}>[]</span>;
    return (
      <>
        <span className={punct}>[</span>{"\n"}
        {value.map((v, i) => (
          <span key={i}>
            {childPad}
            {renderJson(v, indent + 1)}
            {i < value.length - 1 && <span className={punct}>,</span>}
            {"\n"}
          </span>
        ))}
        {pad}<span className={punct}>]</span>
      </>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className={punct}>{"{}"}</span>;
    return (
      <>
        <span className={punct}>{"{"}</span>{"\n"}
        {entries.map(([k, v], i) => (
          <span key={k}>
            {childPad}
            <span className="text-[hsl(var(--code-key))]">{JSON.stringify(k)}</span>
            <span className={punct}>: </span>
            {renderJson(v, indent + 1)}
            {i < entries.length - 1 && <span className={punct}>,</span>}
            {"\n"}
          </span>
        ))}
        {pad}<span className={punct}>{"}"}</span>
      </>
    );
  }
  return <span>{String(value)}</span>;
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
      {copied ? <Check size={12} className="text-[hsl(var(--success-strong))]" /> : <Copy size={12} />}
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
  const isColorizedJson = format === "json" && !raw;
  return (
    <div>
      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
        {isColorizedJson ? renderJson(value) : text}
      </pre>
      <div className="flex items-center gap-1 mt-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-6 px-2 flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
            >
              {format.toUpperCase()} <ChevronDown size={12} />
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
            "h-6 px-2 rounded-md text-xs font-medium transition-base",
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

/** One HUMAN input or AI output item inside a turn's Inputs/Outputs section — just the chat
 * bubble itself. Whatever the agent DID to produce it (tool calls, guardrail checks) renders
 * separately as StepRow(s) around this bubble, not inside it — see the turn-rendering loop
 * below and its comment for why. */
function MessageCard({ role, content }: { role: "HUMAN" | "AI"; content: string }) {
  return (
    <div className="group relative px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-bold tracking-wider", role === "HUMAN" ? "text-primary" : "text-[hsl(var(--accent-strong))]")}>{role}</span>
        <CopyButton text={content} />
      </div>
      {content && <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>}
    </div>
  );
}

/** chipClass pairs the shared bg/border chip-* class with a `!text-[...]` override pointing at
 * this token's darker "-strong" sibling (see index.css) — the shared chip-warning/success/danger
 * classes are used across 20+ other pages, so the fix for their too-light default text color is
 * scoped here to this lookup's output rather than touching those classes globally. */
const GUARDRAIL_ACTION_META: Record<string, { label: string; chipClass: string }> = {
  pass: { label: "Pass", chipClass: "chip-muted" },
  agent_refusal: { label: "Agent refusal", chipClass: "chip-warning !text-[hsl(var(--warning-strong))]" },
  blocked: { label: "Blocked", chipClass: "chip-danger !text-[hsl(var(--destructive-strong))]" },
  replaced: { label: "Replaced", chipClass: "chip-warning !text-[hsl(var(--warning-strong))]" },
};

const HITL_ACTION_META: Record<string, { label: string; chipClass: string }> = {
  approve: { label: "Approved", chipClass: "chip-success !text-[hsl(var(--success-strong))]" },
  edit: { label: "Edited", chipClass: "chip-warning !text-[hsl(var(--warning-strong))]" },
  reject: { label: "Rejected", chipClass: "chip-danger !text-[hsl(var(--destructive-strong))]" },
  respond: { label: "Responded", chipClass: "chip-success !text-[hsl(var(--success-strong))]" },
  mixed: { label: "Mixed", chipClass: "chip-warning !text-[hsl(var(--warning-strong))]" },
  authorized: { label: "Authorized", chipClass: "chip-success !text-[hsl(var(--success-strong))]" },
};

/** One process step the agent took while producing a turn's reply — a tool call or a guardrail
 * check — rendered as a compact row, collapsed by default, instead of a full-width card at the
 * same visual weight as the actual chat bubble. This is the fix for dev feedback that "the tool/
 * config parts sit at the same level as the result, unclear that they're part of producing it":
 * steps now read as clearly subordinate to the MessageCard bubbles around them, matching how
 * the team's own tracing spec (agent-execution-tracing.md) treats "the ordered list of steps
 * the agent took" as a distinct concept from "the run's output" (the reply itself). */
function StepRow({ kind, label, connector, callId, status, guardrailAction, hitlAction, error, input, output }: {
  kind: "tool_call" | "guardrail" | "hitl";
  label: string;
  connector?: string;
  callId?: string;
  status?: "success" | "failed";
  guardrailAction?: "pass" | "agent_refusal" | "blocked" | "replaced";
  hitlAction?: "approve" | "edit" | "reject" | "respond" | "mixed" | "authorized";
  error?: string;
  input?: unknown;
  output?: unknown;
}) {
  const [open, setOpen] = useState(false);
  const actionMeta = guardrailAction
    ? GUARDRAIL_ACTION_META[guardrailAction]
    : hitlAction
      ? HITL_ACTION_META[hitlAction]
      : undefined;
  return (
    <div className={cn("rounded-lg border bg-surface", status === "failed" ? "border-destructive/30" : "border-border")}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left focus-ring rounded-lg"
      >
        <ChevronRight size={12} className={cn("text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
        {kind === "tool_call" && <Wrench size={12} className="text-muted-foreground shrink-0" />}
        {kind === "guardrail" && <ShieldAlert size={12} className="text-muted-foreground shrink-0" />}
        {kind === "hitl" && <UserCheck size={12} className="text-muted-foreground shrink-0" />}
        <span className="text-xs font-semibold shrink-0">{label}</span>
        {connector && <span className="chip chip-outline !h-5 !text-[11px] shrink-0">{connector}</span>}
        {actionMeta && <span className={cn("chip !h-5 !text-[11px] shrink-0", actionMeta.chipClass)}>{actionMeta.label}</span>}
        <span className="flex-1" />
        {status === "failed" && <XCircle size={13} className="text-[hsl(var(--destructive-strong))] shrink-0" />}
        {status === "success" && <CheckCircle2 size={13} className="text-[hsl(var(--success-strong))] shrink-0" />}
        {callId && <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px] shrink-0">{callId}</span>}
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-0.5 border-t border-border space-y-2">
          {error && <p className="text-xs text-[hsl(var(--destructive-strong))] leading-relaxed">{error}</p>}
          {input !== undefined && (
            <div>
              <div className="text-overline text-muted-foreground uppercase tracking-wider mb-1">Input</div>
              <PayloadBlock value={input} />
            </div>
          )}
          {output !== undefined && (
            <div>
              <div className="text-overline text-muted-foreground uppercase tracking-wider mb-1">Output</div>
              <PayloadBlock value={output} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold font-mono text-foreground">{value}</span>
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
            {copied ? <Check size={12} className="text-[hsl(var(--success-strong))]" /> : <Copy size={12} />}
          </button>
          {trace.error && (
            <span className="chip chip-danger !text-[hsl(var(--destructive-strong))] !h-6 gap-1 shrink-0" title={trace.error}>
              <AlertTriangle size={11} /> Error
            </span>
          )}
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
            <span className="text-overline font-semibold text-muted-foreground uppercase tracking-wider">Turns</span>
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
                <DropdownMenuLabel className="text-overline uppercase tracking-wider text-muted-foreground">Display</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={showLatency} onCheckedChange={setShowLatency}>Show Latency</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={showTokens} onCheckedChange={setShowTokens}>Show Tokens</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-overline uppercase tracking-wider text-muted-foreground">Visibility</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked disabled>Show all turns</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {trace.turns.map(turn => {
              const tokens = turn.tokensIn + turn.tokensCacheRead + turn.tokensOut + turn.tokensReasoning;
              const hasTool = turn.agentMessages.some(m => m.toolCalls?.length);
              const hasHitl = turn.agentMessages.some(m => m.hitl);
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
                        <span className="h-5 w-5 shrink-0 rounded-full bg-surface-muted border border-border flex items-center justify-center text-xs font-semibold">
                          {turn.index}
                        </span>
                        <span className="text-sm font-medium truncate">Banking ABC Agent</span>
                        {hasTool && <Wrench size={11} className="text-[hsl(var(--accent-strong))] shrink-0" />}
                        {hasHitl && <UserCheck size={11} className="text-[hsl(var(--accent-strong))] shrink-0" />}
                        {turn.outcome === "failed" && <AlertTriangle size={11} className="text-[hsl(var(--destructive-strong))] shrink-0" />}
                        {turn.outcome === "input_required" && <Hourglass size={11} className="text-[hsl(var(--warning-strong))] shrink-0" />}
                      </div>
                      {(showLatency || showTokens) && (
                        <div className="flex items-center gap-2.5 mt-1 pl-7 text-xs text-muted-foreground">
                          {showLatency && (
                            <span className="inline-flex items-center gap-0.5"><Clock size={11} />{fmtSec(turn.latencyMs)}</span>
                          )}
                          {showTokens && <span className="font-mono">{fmtTokens(tokens)}</span>}
                        </div>
                      )}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-72 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-[hsl(var(--success-strong))]" />
                      <span className="font-semibold text-sm">Banking ABC Agent</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">Thread Turn</div>
                    <div className="text-overline font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time</div>
                    <StatRow label="Start" value={fmtTime(turn.startedAt)} />
                    <StatRow label="End" value={fmtTime(turn.endedAt)} />
                    <div className="text-overline font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">Token breakdown</div>
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
                  className="w-full flex items-center gap-1.5 text-sm font-bold tracking-wider text-foreground uppercase mb-3 transition-base"
                >
                  <ChevronDown size={14} className={cn("transition-transform", collapsed[turn.index] && "-rotate-90")} />
                  Turn {turn.index}
                  {turn.outcome === "failed" && (
                    <span className="chip chip-danger !text-[hsl(var(--destructive-strong))] !h-5 !text-[11px] normal-case tracking-normal font-semibold">Failed</span>
                  )}
                  {turn.outcome === "input_required" && (
                    <span className="chip chip-warning !text-[hsl(var(--warning-strong))] !h-5 !text-[11px] normal-case tracking-normal font-semibold">Đang chờ duyệt</span>
                  )}
                </button>

                {!collapsed[turn.index] && (
                  <div className="grid grid-cols-[1fr,220px] gap-4 items-start">
                    <div className="space-y-3 min-w-0">
                      {turn.customer && (
                        <div className="border border-border rounded-xl overflow-hidden bg-surface">
                          <div className="px-3.5 py-1.5 bg-surface-muted border-b border-border text-right">
                            <span className="text-overline font-semibold text-muted-foreground uppercase tracking-wider">Inputs</span>
                          </div>
                          <MessageCard role="HUMAN" content={turn.customer.content} />
                        </div>
                      )}

                      <div className="border border-border rounded-xl overflow-hidden bg-surface">
                        <div className="px-3.5 py-1.5 bg-surface-muted border-b border-border flex items-center gap-2">
                          <span className="text-overline font-semibold text-muted-foreground uppercase tracking-wider">Outputs</span>
                          <span className="chip chip-muted !h-5 !text-[11px] !px-1.5">
                            messages: {turn.agentMessages.reduce((n, m) => n + 1 + (m.toolCalls?.length ?? 0) + (m.hitl ? 1 : 0), 0)}
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {turn.agentMessages.map(m => (
                            <div key={m.id}>
                              {m.hitl && (
                                <div className="px-3.5 pt-3">
                                  <StepRow
                                    kind="hitl"
                                    label={
                                      m.hitl.situation === "tool_approval"
                                        ? `Human-in-the-loop — duyệt công cụ: ${m.hitl.toolName}`
                                        : m.hitl.situation === "question"
                                          ? "Human-in-the-loop — câu hỏi cho khách hàng"
                                          : `Human-in-the-loop — kết nối tài khoản: ${m.hitl.provider}`
                                    }
                                    hitlAction={m.hitl.action}
                                    input={
                                      m.hitl.situation === "tool_approval"
                                        ? { tool: m.hitl.toolName, input: m.hitl.toolInput }
                                        : m.hitl.situation === "question"
                                          // `options` only shows up when the agent offered discrete
                                          // choices rather than an open question — see historyStore.ts.
                                          ? { question: m.hitl.question, ...(m.hitl.options ? { options: m.hitl.options } : {}) }
                                          : { provider: m.hitl.provider }
                                    }
                                    output={{ action: m.hitl.action, answer: m.hitl.answer }}
                                  />
                                </div>
                              )}
                              {m.guardrail && (
                                <div className="px-3.5 pt-3">
                                  <StepRow
                                    kind="guardrail"
                                    label={m.guardrail.name === "output" ? "Guardrail — kiểm tra output" : "Guardrail — kiểm tra input"}
                                    guardrailAction={m.guardrail.action}
                                    input={m.guardrail.rule ? { rule: m.guardrail.rule } : undefined}
                                  />
                                </div>
                              )}
                              <MessageCard role="AI" content={m.content} />
                              {m.toolCalls?.map(tc => (
                                <div key={tc.callId} className="px-3.5 pb-3">
                                  <StepRow
                                    kind="tool_call"
                                    label={tc.name}
                                    connector={tc.connector}
                                    callId={tc.callId}
                                    status={tc.status ?? "success"}
                                    error={tc.error}
                                    input={tc.input}
                                    output={tc.output}
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                          {turn.agentMessages.length === 0 && (
                            <p className="px-3.5 py-3 text-sm text-muted-foreground">Cuộc hội thoại kết thúc — chưa có phản hồi từ agent.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Per-turn quick stats, mirrors the sidebar hover card inline. No space-y wrapper here —
                        each StatRow already carries its own py-1.5, and stacking a space-y-2 gap on top of that
                        made row-to-row spacing (20px) nearly double the identical StatRow rows in the right-side
                        Stats panel (12px, no wrapper gap there either — see below). Removing it makes the two
                        stats surfaces, which render the exact same component, actually match. */}
                    <div className="border border-border rounded-xl p-3 bg-surface text-xs">
                      <div className="text-overline font-semibold uppercase tracking-wider text-muted-foreground mb-1">Turn stats</div>
                      <StatRow label="Latency" value={fmtSec(turn.latencyMs)} />
                      <StatRow label="Tokens" value={fmtTokens(turn.tokensIn + turn.tokensCacheRead + turn.tokensOut + turn.tokensReasoning)} />
                      <StatRow
                        label="Steps"
                        value={String(turn.agentMessages.reduce((n, m) => n + (m.toolCalls?.length ?? 0) + (m.guardrail ? 1 : 0) + (m.hitl ? 1 : 0), 0))}
                      />
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </main>

        {/* Right: Stats panel */}
        <aside className="w-[300px] border-l border-border bg-surface p-4 overflow-y-auto shrink-0">
          {trace.error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-soft p-2.5">
              <div className="flex items-center gap-1.5 text-overline font-semibold text-[hsl(var(--destructive-strong))] uppercase tracking-wider mb-1">
                <AlertTriangle size={12} /> Error
              </div>
              <p className="text-xs text-[hsl(var(--destructive-strong))] leading-relaxed">{trace.error}</p>
            </div>
          )}
          {/* Wrapped in the same bordered-card treatment as the inline per-turn "Turn stats" box
              (see StatRow usage above) — both surfaces render the exact same StatRow rows for the
              same kind of data, so a design-critique pass flagged it as inconsistent that only one
              of them read as its own distinct "stats widget" while the other sat bare against the
              aside background. This card only adds the container; internal spacing is untouched. */}
          <div className="border border-border rounded-xl p-3 bg-surface">
            <div className="text-overline font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stats</div>
            <StatRow label="Turns" value={String(trace.turns.length)} />

            <div className="mt-4 text-overline font-semibold text-muted-foreground uppercase tracking-wider mb-1">Time</div>
            <StatRow label="First start" value={fmtTime(trace.startedAt)} />
            <StatRow label="Last end" value={fmtTime(trace.endedAt)} />

            <div className="mt-4 text-overline font-semibold text-muted-foreground uppercase tracking-wider mb-1">Latency</div>
            <StatRow label="P50" value={fmtSec(trace.totals.p50LatencyMs)} />
            <StatRow label="P99" value={fmtSec(trace.totals.p99LatencyMs)} />

            <div className="mt-4 text-overline font-semibold text-muted-foreground uppercase tracking-wider mb-1">Token breakdown</div>
            <StatRow label={`Input (${pct(trace.totals.tokensIn)}%)`} value={fmtTokens(trace.totals.tokensIn)} />
            {trace.totals.tokensCacheRead > 0 && (
              <StatRow label={`cache read (${pct(trace.totals.tokensCacheRead)}%)`} value={fmtTokens(trace.totals.tokensCacheRead)} />
            )}
            <StatRow label={`Output (${pct(trace.totals.tokensOut)}%)`} value={fmtTokens(trace.totals.tokensOut)} />
            <StatRow label={`Reasoning (${pct(trace.totals.tokensReasoning)}%)`} value={fmtTokens(trace.totals.tokensReasoning)} />
            <div className="border-t border-border mt-1.5 pt-1.5">
              <StatRow label="Total" value={fmtTokens(totalTokens)} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
