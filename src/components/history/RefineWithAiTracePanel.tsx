import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Wrench, ShieldAlert, UserCheck, XCircle, Clock, CheckCircle2, ChevronRight, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationTrace } from "@/components/history/traceStore";
import { detectTraceIssues, type TraceIssue, type TraceIssueKind } from "@/components/history/refineTraceStore";

/** Left-side "Refine with AI" panel for the Trace page — same slide-in-from-the-left mechanic,
 * collapsed-nav feel and Thủ công/Tự động approval toggle verified against the real "Refine với
 * AI" panel on console-agents.fpt.ai (Agent Instructions). The content is new: it auto-scans the
 * whole conversation for structured/technical signals only (tool_call fail, guardrail
 * block/refusal, HITL reject, turn outcome=failed, high latency) — never a judgment of whether a
 * reply's content is correct, that's the separate Evaluators effort. Issues are grouped by kind
 * (Turn thất bại / Tool call lỗi / Guardrail chặn / HITL từ chối / Latency cao), each a
 * collapsible section with a count, so a long conversation with many repeats of the same signal
 * doesn't turn into one long scroll — only the first non-empty group opens by default. v1 fix
 * scope: only a turn-failed/Instructions mismatch gets an AI-proposed diff (reuses the existing
 * Apply/Discard mechanism); everything else is diagnose + deep-link to the right existing screen.
 * Knowledge is entirely out of scope for v1 (team capacity) — detectTraceIssues() never produces
 * a Knowledge issue. */

const KIND_ORDER: TraceIssueKind[] = ["turn_failed", "tool_call", "guardrail", "hitl", "latency"];

const KIND_META: Record<TraceIssueKind, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  turn_failed: { label: "Turn thất bại", icon: XCircle },
  tool_call: { label: "Tool call lỗi", icon: Wrench },
  guardrail: { label: "Guardrail chặn", icon: ShieldAlert },
  hitl: { label: "HITL từ chối", icon: UserCheck },
  latency: { label: "Latency cao", icon: Clock },
};

/** What the Builder already did in this panel, per conversation — kept outside the component so
 * closing and reopening the panel (which unmounts it) doesn't bring back a proposal they already
 * applied or dismissed. In-memory only, same lifetime as the rest of this prototype's stores. */
const panelMemory = new Map<string, { mode: "manual" | "auto"; applied: Set<string>; dismissed: Set<string>; chat: ChatMsg[] }>();

function InstructionsFix({
  fix, applied, onApply, onDismiss,
}: {
  fix: Extract<TraceIssue["fix"], { kind: "instructions_diff" }>;
  applied: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  if (applied) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success-strong))]">
        <CheckCircle2 size={12} /> Đã áp dụng vào Instructions
      </div>
    );
  }
  return (
    <div>
      <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={11} className="text-primary" />
          <span className="text-xs font-semibold text-primary">Đề xuất chỉnh sửa · Instructions</span>
        </div>
        <div className="font-mono text-xs space-y-1">
          <div className="bg-destructive/10 text-destructive px-2 py-1 rounded line-through">− {fix.before}</div>
          <div className="bg-success/10 text-success px-2 py-1 rounded">+ {fix.after}</div>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button type="button" onClick={onApply} className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
            Áp dụng vào Instructions
          </button>
          <button type="button" onClick={onDismiss} className="h-7 px-2.5 rounded-md hover:bg-surface-muted text-xs text-muted-foreground">
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueRow({
  issue, agentId, onScrollToTurn, applied, onApply, onDismiss,
}: {
  issue: TraceIssue;
  agentId: string;
  onScrollToTurn: (turnIndex: number) => void;
  applied: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const fix = issue.fix;
  return (
    <div className="border-t border-border first:border-t-0 pl-7 pr-3 py-2 space-y-2">
      <button
        type="button"
        onClick={() => onScrollToTurn(issue.turnIndex)}
        title={`Đi tới Turn ${issue.turnIndex}`}
        className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-base"
      >
        <span className="text-xs font-mono text-muted-foreground shrink-0 mt-px">Turn {issue.turnIndex}</span>
        <span className="text-xs text-foreground flex-1 min-w-0">
          {issue.diagnosis}
          {issue.detail && <span className="block text-muted-foreground mt-0.5">{issue.detail}</span>}
        </span>
      </button>

      {fix.kind === "instructions_diff" && (
        <div className="pl-2">
          <InstructionsFix fix={fix} applied={applied} onApply={onApply} onDismiss={onDismiss} />
        </div>
      )}

      {fix.kind === "deeplink" && (
        <div className="pl-2">
          <button
            type="button"
            onClick={() => navigate(`/agents/${agentId}?tab=build&section=${fix.section}`)}
            className="h-7 px-2.5 rounded-md border border-border bg-surface hover:bg-surface-muted text-xs font-medium text-foreground transition-base"
          >
            {fix.ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function IssueGroup({
  kind, items, isFirst, agentId, onScrollToTurn, appliedIds, onApply, onDismiss,
}: {
  kind: TraceIssueKind;
  items: TraceIssue[];
  isFirst: boolean;
  agentId: string;
  onScrollToTurn: (turnIndex: number) => void;
  appliedIds: Set<string>;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  // The group's colour follows its worst item, not its kind — a group holding only a
  // retried-then-succeeded tool call is a Warning, and a red icon there overstated it.
  const critical = items.some(i => i.severity === "critical");
  return (
    <details open={isFirst} className="group rounded-xl border border-border bg-surface overflow-hidden [&::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer flex items-center gap-2 px-3 py-2.5 select-none">
        <Icon size={14} className={critical ? "text-[hsl(var(--destructive-strong))]" : "text-[hsl(var(--warning-strong))]"} />
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="chip chip-muted !h-5 !text-[11px] ml-auto">{items.length}</span>
        <ChevronRight size={13} className="text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div>
        {items.map(issue => (
          <IssueRow
            key={issue.id}
            issue={issue}
            agentId={agentId}
            onScrollToTurn={onScrollToTurn}
            applied={appliedIds.has(issue.id)}
            onApply={() => onApply(issue.id)}
            onDismiss={() => onDismiss(issue.id)}
          />
        ))}
      </div>
    </details>
  );
}

/* ───────────── Chat: hỏi AI về conversation này ─────────────
 * The scan above answers "what went wrong"; the chat covers what a fixed list can't — "why did
 * Turn 3 fail", "fix Turn 1 for me" — the pattern LangSmith Polly, Arize Alyx and Braintrust Loop
 * all use on their trace views. Answers stay inside the same boundary as the scan: they're built
 * only from what the trace recorded, and any question about whether a reply is factually right is
 * redirected (that's Evaluators). An Instructions change asked for in chat comes back as the same
 * diff card with Áp dụng / Bỏ qua, and follows the Thủ công / Tự động toggle like the scan's does. */

type ChatMsg =
  | { role: "user"; text: string }
  | { role: "ai"; text: string }
  | { role: "ai-diff"; id: string; before: string; after: string };

const CONTENT_JUDGEMENT = /(đúng không|có đúng|chính xác|sai sự thật|bịa|hallucin|trả lời sai|trả lời đúng)/i;
const FIX_INTENT = /(sửa|fix|đề xuất|chỉnh|instructions)/i;

function issueLine(i: TraceIssue) {
  return `Turn ${i.turnIndex}: ${i.diagnosis}${i.detail ? ` — ${i.detail}` : ""}`;
}

/** Deterministic, trace-grounded reply for the prototype — stands in for the real model call. */
function buildReply(text: string, trace: ConversationTrace, issues: TraceIssue[], appliedIds: Set<string>): ChatMsg[] {
  const turnMatch = text.match(/turn\s*(\d+)/i);
  const turnIndex = turnMatch ? Number(turnMatch[1]) : undefined;
  const turn = turnIndex ? trace.turns.find(t => t.index === turnIndex) : undefined;
  if (turnIndex && !turn) {
    return [{ role: "ai", text: `Conversation này chỉ có ${trace.turns.length} turn, không có Turn ${turnIndex}.` }];
  }
  const scoped = turnIndex ? issues.filter(i => i.turnIndex === turnIndex) : issues;

  if (CONTENT_JUDGEMENT.test(text)) {
    const facts = scoped.length ? scoped.map(issueLine).join("\n") : "Không có tín hiệu kỹ thuật bất thường.";
    return [{
      role: "ai",
      text: `Mình chỉ đọc được những gì trace ghi lại (tool call, Guardrail, HITL, trạng thái turn, latency), nên không kết luận được câu trả lời đúng hay sai về nội dung — phần đó sẽ do Evaluators chấm.\n\nTrace cho thấy${turnIndex ? ` ở Turn ${turnIndex}` : ""}:\n${facts}`,
    }];
  }

  if (FIX_INTENT.test(text)) {
    const target = scoped.find(i => i.fix.kind === "instructions_diff");
    if (target && target.fix.kind === "instructions_diff") {
      if (appliedIds.has(target.id)) {
        return [{ role: "ai", text: `Đề xuất sửa Instructions cho Turn ${target.turnIndex} đã được áp dụng rồi.` }];
      }
      return [
        { role: "ai", text: `Turn ${target.turnIndex} Failed vì: ${target.detail ?? target.diagnosis}\nMình đề xuất chỉnh Instructions như sau:` },
        { role: "ai-diff", id: target.id, before: target.fix.before, after: target.fix.after },
      ];
    }
    const others = scoped.filter(i => i.fix.kind === "deeplink");
    return [{
      role: "ai",
      text: `Mình không thấy lỗi nào${turnIndex ? ` ở Turn ${turnIndex}` : ""} do Instructions gây ra, nên chưa có gì để đề xuất sửa Instructions.` +
        (others.length ? `\n\nCần sửa tay ở màn cấu hình:\n${others.map(i => `${issueLine(i)} → ${i.fix.kind === "deeplink" ? i.fix.ctaLabel : ""}`).join("\n")}` : ""),
    }];
  }

  if (turn) {
    const steps = turn.agentMessages.reduce((n, m) => n + (m.toolCalls?.length ?? 0) + (m.guardrail ? 1 : 0) + (m.hitl ? 1 : 0), 0);
    const head = `Turn ${turn.index}: ${turn.outcome === "failed" ? "Failed" : turn.outcome === "input_required" ? "đang chờ duyệt" : "hoàn tất"} · latency ${(turn.latencyMs / 1000).toFixed(2)}s · ${steps} bước.`;
    return [{ role: "ai", text: scoped.length ? `${head}\n${scoped.map(issueLine).join("\n")}` : `${head}\nKhông có tín hiệu kỹ thuật bất thường ở turn này.` }];
  }

  return [{
    role: "ai",
    text: issues.length
      ? `Conversation có ${trace.turns.length} turn, ${issues.length} điểm cần chú ý:\n${issues.map(issueLine).join("\n")}`
      : `Conversation có ${trace.turns.length} turn và không có tín hiệu kỹ thuật bất thường nào.`,
  }];
}

/** Renders "Turn N" inside an AI answer as a link that scrolls the trace to that turn. */
function TurnLinkedText({ text, onScrollToTurn }: { text: string; onScrollToTurn: (n: number) => void }) {
  const parts = text.split(/(Turn \d+)/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^Turn (\d+)$/);
        return m ? (
          <button key={i} type="button" onClick={() => onScrollToTurn(Number(m[1]))} className="font-medium text-primary hover:underline">
            {p}
          </button>
        ) : <span key={i}>{p}</span>;
      })}
    </>
  );
}

function starterPrompts(issues: TraceIssue[]): string[] {
  const out: string[] = [];
  const instr = issues.find(i => i.fix.kind === "instructions_diff");
  if (instr) out.push(`Đề xuất sửa Instructions cho Turn ${instr.turnIndex}`);
  const other = issues.find(i => i.kind !== "turn_failed");
  if (other) out.push(`Chuyện gì xảy ra ở Turn ${other.turnIndex}?`);
  out.push("Tóm tắt các vấn đề của conversation này");
  return out.slice(0, 3);
}

export function RefineWithAiTracePanel({
  agentId, conversationId, trace, onClose, onScrollToTurn,
}: {
  agentId: string;
  conversationId: string;
  trace: ConversationTrace;
  onClose: () => void;
  onScrollToTurn: (turnIndex: number) => void;
}) {
  const memoryKey = `${agentId}:${conversationId}`;
  const remembered = panelMemory.get(memoryKey);
  const [scanning, setScanning] = useState(true);
  const [approvalMode, setApprovalMode] = useState<"manual" | "auto">(remembered?.mode ?? "manual");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => new Set(remembered?.applied));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set(remembered?.dismissed));

  const [chat, setChat] = useState<ChatMsg[]>(remembered?.chat ?? []);
  const [input, setInput] = useState("");
  const [answering, setAnswering] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelMemory.set(memoryKey, { mode: approvalMode, applied: appliedIds, dismissed: dismissedIds, chat });
  }, [memoryKey, approvalMode, appliedIds, dismissedIds, chat]);

  useEffect(() => {
    if (chat.length) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, answering]);

  const issues = useMemo(() => detectTraceIssues(trace), [trace]);
  const visibleIssues = issues.filter(i => !dismissedIds.has(i.id));
  const groups = KIND_ORDER
    .map(kind => ({ kind, items: visibleIssues.filter(i => i.kind === kind) }))
    .filter(g => g.items.length > 0);

  // Auto-scan on open — the panel is meant to surface issues immediately, no extra click to
  // trigger a scan. The brief delay is a deliberate "we actually checked" beat, same feel as
  // the tool-call steps in the Instructions "Refine with AI" chat.
  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 650);
    return () => clearTimeout(t);
  }, [trace]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || answering || scanning) return;
    setInput("");
    setChat(c => [...c, { role: "user", text }]);
    setAnswering(true);
    setTimeout(() => {
      const reply = buildReply(text, trace, issues, appliedIds);
      setChat(c => [...c, ...reply]);
      if (approvalMode === "auto") {
        const diffIds = reply.flatMap(m => (m.role === "ai-diff" ? [m.id] : []));
        if (diffIds.length) setAppliedIds(prev => new Set([...prev, ...diffIds]));
      }
      setAnswering(false);
    }, 700);
  };

  // "Tự động": Instructions fixes apply themselves as soon as they're found, exactly the same
  // as the Tự động behavior already on Instructions — no separate rule for Trace.
  useEffect(() => {
    if (approvalMode !== "auto" || scanning) return;
    setAppliedIds(prev => {
      const next = new Set(prev);
      for (const issue of issues) if (issue.fix.kind === "instructions_diff") next.add(issue.id);
      return next;
    });
  }, [approvalMode, scanning, issues]);

  return (
    <aside className="w-[420px] border-r border-border flex flex-col shrink-0 h-full bg-surface">
      {/* Header */}
      <div className="px-3.5 pt-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-brand flex items-center justify-center shrink-0">
            <Sparkles size={13} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight">Refine với AI</div>
            <div className="text-xs text-muted-foreground leading-tight truncate">
              Trace · Conversation #{conversationId}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0"
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center bg-surface-muted rounded-lg p-0.5 border border-border w-fit mt-2.5">
          {([
            { id: "manual", label: "Thủ công" },
            { id: "auto", label: "Tự động" },
          ] as const).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setApprovalMode(opt.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-base",
                approvalMode === opt.id ? "bg-white shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {approvalMode === "auto" && (
          <p className="text-xs text-muted-foreground mt-1.5">Đề xuất sửa Instructions sẽ được áp dụng ngay khi phát hiện.</p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {scanning ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs w-fit border border-primary/30 bg-primary-soft text-primary">
            <Sparkles size={11} className="animate-pulse" />
            Đang quét conversation…
          </div>
        ) : (
          <>
            <div className="bg-surface-muted/60 border border-border rounded-xl px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
              {visibleIssues.length > 0 && (
                <div className="mb-0.5">
                  Đã quét xong · <span className="text-foreground font-semibold">{groups.length}</span> nhóm vấn đề · <span className="text-foreground font-semibold">{visibleIssues.length}</span> điểm cần chú ý
                </div>
              )}
              Chỉ dựa trên tín hiệu kỹ thuật trong trace, không chấm nội dung câu trả lời.
            </div>

            {visibleIssues.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success-strong))] px-1 py-1">
                <CheckCircle2 size={13} /> Không phát hiện vấn đề kỹ thuật nào trong conversation này.
              </div>
            ) : (
              groups.map((g, idx) => (
                <IssueGroup
                  key={g.kind}
                  kind={g.kind}
                  items={g.items}
                  isFirst={idx === 0}
                  agentId={agentId}
                  onScrollToTurn={onScrollToTurn}
                  appliedIds={appliedIds}
                  onApply={id => setAppliedIds(prev => new Set(prev).add(id))}
                  onDismiss={id => setDismissedIds(prev => new Set(prev).add(id))}
                />
              ))
            )}

            {chat.map((m, i) => {
              if (m.role === "user") return (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-xs max-w-[90%] leading-relaxed whitespace-pre-wrap">{m.text}</div>
                </div>
              );
              if (m.role === "ai") return (
                <div key={i} className="bg-surface-muted/60 border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap">
                  <TurnLinkedText text={m.text} onScrollToTurn={onScrollToTurn} />
                </div>
              );
              if (dismissedIds.has(m.id)) return null;
              return (
                <InstructionsFix
                  key={i}
                  fix={{ kind: "instructions_diff", before: m.before, after: m.after }}
                  applied={appliedIds.has(m.id)}
                  onApply={() => setAppliedIds(prev => new Set(prev).add(m.id))}
                  onDismiss={() => setDismissedIds(prev => new Set(prev).add(m.id))}
                />
              );
            })}
            {answering && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs w-fit border border-primary/30 bg-primary-soft text-primary">
                <Sparkles size={11} className="animate-pulse" /> Đang đọc trace…
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 shrink-0 bg-surface">
        {!scanning && chat.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {starterPrompts(visibleIssues).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="text-xs px-2 py-1 rounded-full bg-surface border border-border hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-base text-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-border bg-surface focus-within:border-primary transition-base p-1.5">
          <div className="flex items-end gap-1.5">
            <label htmlFor="refine-trace-input" className="sr-only">Hỏi AI về conversation này</label>
            <textarea
              id="refine-trace-input"
              rows={2}
              value={input}
              disabled={scanning}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Hỏi về conversation này hoặc nói bạn muốn sửa gì…"
              className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none px-1 py-0.5 max-h-32 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!input.trim() || answering || scanning}
              aria-label="Gửi"
              className="h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary-glow flex items-center justify-center transition-base shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendHorizontal size={13} />
            </button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 px-1">Enter để gửi · Shift+Enter xuống dòng</div>
      </div>
    </aside>
  );
}
