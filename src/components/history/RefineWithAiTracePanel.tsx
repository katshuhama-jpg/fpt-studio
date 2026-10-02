import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, X, Wrench, ShieldAlert, UserCheck, XCircle, Clock, CheckCircle2, ChevronRight,
  SendHorizontal, SquarePen, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationTrace, TraceTurn } from "@/components/history/traceStore";
import { detectTraceIssues, type TraceIssue, type TraceIssueKind } from "@/components/history/refineTraceStore";

/** Left-side "Refine với AI" panel for the Trace page, modelled on LangSmith's Polly: a chat
 * assistant that already has the open trace as context, answers free-form questions about it
 * ("Chỗ nào agent chạy sai?", "Agent có làm gì kém hiệu quả không?", "Chuyện gì xảy ra ở Turn 3?"),
 * shows the steps it took to answer, and can change the agent's Instructions. Opening and the
 * Thủ công/Tự động approval toggle follow the real "Refine với AI" panel on console-agents.fpt.ai.
 *
 * Its first message is an automatic scan of the conversation, grouped by kind (Turn thất bại /
 * Tool call lỗi / Guardrail chặn / HITL từ chối / Latency cao). Everything it says — scan and chat
 * — comes only from what the trace recorded; whether a reply is factually right is Evaluators'
 * job and gets redirected there. Only an Instructions mismatch gets an AI-written diff (same
 * Áp dụng / Bỏ qua mechanism as Instructions); Tool and Guardrail issues get a diagnosis plus a
 * link to the right config screen. Knowledge is out of scope for this phase (team capacity).
 *
 * Replies are deterministic and built from the trace data — they stand in for the model call so
 * the prototype behaves the same on every run. */

const KIND_ORDER: TraceIssueKind[] = ["turn_failed", "tool_call", "guardrail", "hitl", "latency"];

const KIND_META: Record<TraceIssueKind, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  turn_failed: { label: "Turn thất bại", icon: XCircle },
  tool_call: { label: "Tool call lỗi", icon: Wrench },
  guardrail: { label: "Guardrail chặn", icon: ShieldAlert },
  hitl: { label: "HITL từ chối", icon: UserCheck },
  latency: { label: "Latency cao", icon: Clock },
};

type Section = "instructions" | "guardrails";

/** Visible keyboard focus for every control in the panel (uiux-pro-max: focus-states). */
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type ChatMsg =
  | { role: "user"; text: string }
  | { role: "steps"; steps: string[] }
  | { role: "ai"; text: string; actions?: { label: string; section: Section }[]; followUps?: string[] }
  | { role: "ai-diff"; id: string; before: string; after: string };

/** What the Builder already did in this panel, per conversation — kept outside the component so
 * closing and reopening the panel (which unmounts it) keeps the chat and doesn't bring back a
 * proposal they already applied or dismissed. In-memory only, same lifetime as the prototype's
 * other stores. */
const panelMemory = new Map<string, { mode: "manual" | "auto"; applied: Set<string>; dismissed: Set<string>; chat: ChatMsg[] }>();

/* ───────────────────────── Shared pieces ───────────────────────── */

function InstructionsFix({
  fix, applied, onApply, onDismiss,
}: {
  fix: { before: string; after: string };
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
        <button type="button" onClick={onApply} className={cn("h-7 px-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-glow text-xs font-medium transition-base", FOCUS)}>
          Áp dụng vào Instructions
        </button>
        <button type="button" onClick={onDismiss} className={cn("h-7 px-2.5 rounded-md hover:bg-surface-muted text-xs text-muted-foreground transition-base", FOCUS)}>
          Bỏ qua
        </button>
      </div>
    </div>
  );
}

function DeepLinkButton({ agentId, section, label }: { agentId: string; section: Section; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/agents/${agentId}?tab=build&section=${section}`)}
      className={cn("h-7 px-2.5 rounded-md border border-border bg-surface hover:bg-surface-muted text-xs font-medium text-foreground transition-base", FOCUS)}
    >
      {label}
    </button>
  );
}

/** The steps the assistant took to answer, shown like the tool-call chips in the Instructions
 * "Refine với AI" chat — so the Builder can see what it actually looked at. */
function StepChips({ steps, running }: { steps: string[]; running?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map(s => (
        <div
          key={s}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs w-fit border",
            running ? "border-primary/30 bg-primary-soft text-primary" : "border-success/30 bg-success/10 text-[hsl(var(--success-strong))]",
          )}
        >
          {running ? <Loader2 size={11} className="motion-safe:animate-spin" aria-hidden /> : <CheckCircle2 size={11} aria-hidden />}
          {s}
        </div>
      ))}
    </div>
  );
}

/** Clickable prompts — starter questions after the scan and follow-ups after an answer, so the
 * Builder never has to retype a question the assistant just suggested. */
function PromptChips({ prompts, onPick }: { prompts: string[]; onPick: (p: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {prompts.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className={cn("text-xs px-2.5 py-1 rounded-full bg-surface border border-primary/30 text-primary hover:bg-primary-soft transition-base text-left", FOCUS)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

/** Renders "Turn N" inside an answer as a link that scrolls the trace to that turn. */
function TurnLinkedText({ text, onScrollToTurn, turnCount }: { text: string; onScrollToTurn: (n: number) => void; turnCount: number }) {
  const parts = text.split(/(Turn \d+)/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^Turn (\d+)$/);
        // Only turns that exist become links — "không có Turn 9" stays plain text.
        return m && Number(m[1]) >= 1 && Number(m[1]) <= turnCount ? (
          <button key={i} type="button" onClick={() => onScrollToTurn(Number(m[1]))} title={`Đi tới ${p}`} className={cn("font-medium text-primary hover:underline rounded-sm", FOCUS)}>
            {p}
          </button>
        ) : <span key={i}>{p}</span>;
      })}
    </>
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
          <DeepLinkButton agentId={agentId} section={fix.section} label={fix.ctaLabel} />
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
      <summary className={cn("list-none cursor-pointer flex items-center gap-2 px-3 py-2.5 select-none rounded-xl", FOCUS)}>
        <Icon size={14} aria-hidden className={critical ? "text-[hsl(var(--destructive-strong))]" : "text-[hsl(var(--warning-strong))]"} />
        <span className="text-sm font-semibold">{meta.label}</span>
        {/* Colour alone shouldn't carry severity (uiux-pro-max: color is not the only indicator). */}
        <span className="sr-only">{critical ? " - Có mục Critical" : " - Warning"}</span>
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

/* ───────────────────────── Answering ───────────────────────── */

const CONTENT_JUDGEMENT = /(đúng không|có đúng|chính xác|sai sự thật|bịa|hallucin|trả lời sai|trả lời đúng)/i;
const FIX_INTENT = /(sửa|fix|đề xuất|chỉnh|instructions)/i;
const EFFICIENCY_INTENT = /(hiệu quả|chậm|tối ưu|token|nhanh hơn|efficien|latency)/i;
const WRONG_INTENT = /(sai|lỗi|vấn đề|hỏng|trục trặc|went wrong|bất thường)/i;
const SUMMARY_INTENT = /(tóm tắt|chuyện gì|diễn ra|summar|tổng quan)/i;

const fmtS = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}K` : `${n}`);
const turnTokens = (t: TraceTurn) => t.tokensIn + t.tokensCacheRead + t.tokensOut + t.tokensReasoning;
const clip = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);
const issueLine = (i: TraceIssue) => `Turn ${i.turnIndex}: ${i.diagnosis}${i.detail ? ` - ${i.detail}` : ""}`;

function linkActions(issues: TraceIssue[]): { label: string; section: Section }[] {
  const seen = new Set<string>();
  const out: { label: string; section: Section }[] = [];
  for (const i of issues) {
    if (i.fix.kind !== "deeplink" || seen.has(i.fix.section)) continue;
    seen.add(i.fix.section);
    out.push({ label: i.fix.ctaLabel, section: i.fix.section });
  }
  return out;
}

function outcomeLabel(t: TraceTurn) {
  return t.outcome === "failed" ? "Failed" : t.outcome === "input_required" ? "đang chờ duyệt" : "hoàn tất";
}

/** Deterministic, trace-grounded answer: which steps it "ran", then the messages to show. */
export function buildReply(
  text: string, trace: ConversationTrace, issues: TraceIssue[], appliedIds: Set<string>,
): { steps: string[]; msgs: ChatMsg[] } {
  const n = trace.turns.length;
  const turnMatch = text.match(/turn\s*(\d+)/i);
  const turnIndex = turnMatch ? Number(turnMatch[1]) : undefined;
  const turn = turnIndex ? trace.turns.find(t => t.index === turnIndex) : undefined;
  if (turnIndex && !turn) {
    return { steps: [`Đọc ${n} turn`], msgs: [{ role: "ai", text: `Conversation này chỉ có ${n} turn, không có Turn ${turnIndex}.` }] };
  }
  const scoped = turnIndex ? issues.filter(i => i.turnIndex === turnIndex) : issues;
  const readStep = turn ? `Đọc Turn ${turn.index}` : `Đọc ${n} turn`;

  // Whether a reply is factually right is not something the trace records.
  if (CONTENT_JUDGEMENT.test(text)) {
    const facts = scoped.length ? scoped.map(issueLine).join("\n") : "Không có tín hiệu kỹ thuật bất thường.";
    return {
      steps: [readStep],
      msgs: [{
        role: "ai",
        text: `Mình chỉ đọc được những gì trace ghi lại (tool call, Guardrail, HITL, trạng thái turn, latency), nên không kết luận được câu trả lời đúng hay sai về nội dung - Phần đó sẽ do Evaluators chấm.\n\nTrace cho thấy${turn ? ` ở Turn ${turn.index}` : ""}:\n${facts}`,
      }],
    };
  }

  if (FIX_INTENT.test(text)) {
    const target = scoped.find(i => i.fix.kind === "instructions_diff");
    if (target && target.fix.kind === "instructions_diff") {
      if (appliedIds.has(target.id)) {
        return { steps: [`Đọc Turn ${target.turnIndex}`], msgs: [{ role: "ai", text: `Đề xuất sửa Instructions cho Turn ${target.turnIndex} đã được áp dụng rồi.` }] };
      }
      return {
        steps: [`Đọc Turn ${target.turnIndex}`, "Đối chiếu với Instructions hiện tại"],
        msgs: [
          { role: "ai", text: `Turn ${target.turnIndex} Failed vì: ${target.detail ?? target.diagnosis}\nMình đề xuất chỉnh Instructions như sau:` },
          { role: "ai-diff", id: target.id, before: target.fix.before, after: target.fix.after },
        ],
      };
    }
    const manual = scoped.filter(i => i.fix.kind === "deeplink");
    return {
      steps: [readStep, "Đối chiếu với Instructions hiện tại"],
      msgs: [{
        role: "ai",
        text: `Mình không thấy lỗi nào${turn ? ` ở Turn ${turn.index}` : ""} do Instructions gây ra, nên chưa có gì để đề xuất sửa Instructions.` +
          (manual.length ? `\n\nNhững chỗ cần sửa tay ở màn cấu hình:\n${manual.map(issueLine).join("\n")}` : ""),
        actions: linkActions(manual),
      }],
    };
  }

  if (EFFICIENCY_INTENT.test(text)) {
    const turns = turn ? [turn] : trace.turns;
    const lines: string[] = [];
    const slowest = [...turns].sort((a, b) => b.latencyMs - a.latencyMs)[0];
    const p50 = trace.totals.p50LatencyMs;
    if (slowest && slowest.latencyMs > 3000) {
      lines.push(`Turn ${slowest.index} chậm nhất: ${fmtS(slowest.latencyMs)}, gấp ${(slowest.latencyMs / p50).toFixed(1)} lần P50 của conversation (${fmtS(p50)}).`);
    }
    for (const t of turns) {
      const calls = t.agentMessages.flatMap(m => m.toolCalls ?? []);
      const retried = calls.filter((c, i) => c.status === "failed" && calls.slice(i + 1).some(l => l.name === c.name && (l.status ?? "success") === "success"));
      // Trim the error's own trailing period so the sentence doesn't end in ".)."
      for (const c of retried) lines.push(`Turn ${t.index} phải gọi ${c.name} thêm một lần vì lần đầu lỗi${c.error ? ` (${c.error.replace(/\.\s*$/, "")})` : ""}.`);
    }
    const heaviest = [...turns].sort((a, b) => turnTokens(b) - turnTokens(a))[0];
    const totalTok = trace.totals.tokensIn + trace.totals.tokensCacheRead + trace.totals.tokensOut + trace.totals.tokensReasoning;
    const cacheShare = totalTok ? Math.round((trace.totals.tokensCacheRead / totalTok) * 100) : 0;
    if (!turn && heaviest) {
      lines.push(`Turn ${heaviest.index} dùng nhiều token nhất (${fmtK(turnTokens(heaviest))}). ${cacheShare}% token của cả conversation là cache read - Instructions và Knowledge đang được tái sử dụng giữa các turn.`);
    }
    return {
      steps: [`Đọc latency ${turns.length} turn`, "Đếm số lần gọi lại tool", "Xem token từng turn"],
      msgs: [{
        role: "ai",
        text: lines.length
          ? lines.join("\n")
          : `Không thấy điểm kém hiệu quả rõ rệt${turn ? ` ở Turn ${turn.index}` : ""}: dưới ngưỡng 3s, không có tool bị gọi lại.`,
        // A connector that needed a retry is worth checking — same CTA as the scan's Tool row.
        actions: linkActions(issues.filter(i => i.kind === "tool_call" && turns.some(t => t.index === i.turnIndex))),
        followUps: !turn && slowest && slowest.latencyMs > 3000 ? [`Chuyện gì xảy ra ở Turn ${slowest.index}?`] : undefined,
      }],
    };
  }

  if (turn) {
    const steps: string[] = [];
    for (const m of turn.agentMessages) {
      for (const c of m.toolCalls ?? []) steps.push(`Tool ${c.name} (${c.connector}) - ${(c.status ?? "success") === "failed" ? "lỗi" : "thành công"}`);
      if (m.guardrail) steps.push(`Guardrail ${m.guardrail.name} - ${m.guardrail.action}`);
      if (m.hitl) steps.push(`Human-in-the-loop - ${m.hitl.action}${m.hitl.answer ? `: ${m.hitl.answer}` : ""}`);
    }
    const head = `Turn ${turn.index} (${outcomeLabel(turn)} · ${fmtS(turn.latencyMs)})${turn.customer ? ` - Khách hỏi: "${clip(turn.customer.content)}"` : ""}`;
    const body = [
      steps.length ? `Các bước agent đã chạy:\n${steps.map(s => `• ${s}`).join("\n")}` : "Agent trả lời trực tiếp, không qua bước tool / Guardrail / HITL nào.",
      scoped.length ? `Điểm cần chú ý:\n${scoped.map(issueLine).join("\n")}` : "Không có tín hiệu kỹ thuật bất thường ở turn này.",
    ].join("\n\n");
    return {
      steps: [`Đọc Turn ${turn.index}`, `Xem ${steps.length} bước`],
      msgs: [{
        role: "ai", text: `${head}\n\n${body}`, actions: linkActions(scoped),
        followUps: scoped.some(i => i.fix.kind === "instructions_diff" && !appliedIds.has(i.id)) ? [`Đề xuất sửa Instructions cho Turn ${turn.index}`] : undefined,
      }],
    };
  }

  if (SUMMARY_INTENT.test(text)) {
    const outline = trace.turns.map(t => {
      const own = issues.filter(i => i.turnIndex === t.index);
      return `Turn ${t.index}${t.customer ? ` - "${clip(t.customer.content, 50)}"` : ""} → ${outcomeLabel(t)}${own.length ? ` (${own.map(i => i.diagnosis).join("; ")})` : ""}`;
    });
    return {
      steps: [`Đọc ${n} turn`],
      msgs: [{
        role: "ai", text: `Conversation có ${n} turn:\n${outline.join("\n")}`,
        followUps: issues.length ? ["Chỗ nào agent chạy sai?"] : undefined,
      }],
    };
  }

  // "Chỗ nào sai?" — and the fallback for anything else: where it went wrong, worst first.
  const ordered = [...issues].sort((a, b) => (a.severity === b.severity ? a.turnIndex - b.turnIndex : a.severity === "critical" ? -1 : 1));
  const instr = ordered.find(i => i.fix.kind === "instructions_diff" && !appliedIds.has(i.id));
  const intro = WRONG_INTENT.test(text) ? "" : "Mình hiểu câu hỏi là đang tìm chỗ agent chạy không ổn. ";
  return {
    steps: [`Quét ${n} turn`],
    msgs: [{
      role: "ai",
      text: ordered.length
        ? `${intro}${ordered.length} chỗ đáng chú ý, nặng nhất trước:\n${ordered.map(issueLine).join("\n")}` +
          (instr ? `\n\nTurn ${instr.turnIndex} có thể sửa ngay bằng Instructions.` : "")
        : `${intro}Mình không thấy chỗ nào agent chạy sai về mặt kỹ thuật trong ${n} turn này.`,
      actions: linkActions(ordered),
      followUps: [
        ...(instr ? [`Đề xuất sửa Instructions cho Turn ${instr.turnIndex}`] : []),
        "Agent có làm gì kém hiệu quả không?",
      ],
    }],
  };
}

function starterPrompts(issues: TraceIssue[], appliedIds: Set<string>): string[] {
  const out: string[] = [];
  const instr = issues.find(i => i.fix.kind === "instructions_diff" && !appliedIds.has(i.id));
  if (instr) out.push(`Đề xuất sửa Instructions cho Turn ${instr.turnIndex}`);
  out.push("Chỗ nào agent chạy sai?", "Agent có làm gì kém hiệu quả không?", "Tóm tắt những gì đã xảy ra");
  return out;
}

/* ───────────────────────── Panel ───────────────────────── */

const SCAN_STEPS = (n: number) => [`Đọc trace · ${n} turn`, "Kiểm tra tool call, Guardrail, HITL, latency"];

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
  const [scanning, setScanning] = useState(!remembered);
  const [approvalMode, setApprovalMode] = useState<"manual" | "auto">(remembered?.mode ?? "manual");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => new Set(remembered?.applied));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set(remembered?.dismissed));
  const [chat, setChat] = useState<ChatMsg[]>(remembered?.chat ?? []);
  const [input, setInput] = useState("");
  const [pendingSteps, setPendingSteps] = useState<string[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const issues = useMemo(() => detectTraceIssues(trace), [trace]);
  const visibleIssues = issues.filter(i => !dismissedIds.has(i.id));
  const groups = KIND_ORDER
    .map(kind => ({ kind, items: visibleIssues.filter(i => i.kind === kind) }))
    .filter(g => g.items.length > 0);
  const answering = pendingSteps !== null;

  useEffect(() => {
    panelMemory.set(memoryKey, { mode: approvalMode, applied: appliedIds, dismissed: dismissedIds, chat });
  }, [memoryKey, approvalMode, appliedIds, dismissedIds, chat]);

  // The scan runs by itself the first time the panel opens on a conversation — no "Quét" button.
  useEffect(() => {
    if (!scanning) return;
    const t = setTimeout(() => setScanning(false), 900);
    return () => clearTimeout(t);
  }, [scanning]);

  useEffect(() => {
    if (!scanning) inputRef.current?.focus();
  }, [scanning]);

  useEffect(() => {
    if (chat.length || answering) bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "end" });
  }, [chat.length, answering]);

  // "Tự động": Instructions fixes apply themselves as soon as they're found, the same as Tự động
  // on the Instructions panel — no separate rule for Trace.
  useEffect(() => {
    if (approvalMode !== "auto" || scanning) return;
    setAppliedIds(prev => {
      const next = new Set(prev);
      for (const issue of issues) if (issue.fix.kind === "instructions_diff") next.add(issue.id);
      return next;
    });
  }, [approvalMode, scanning, issues]);

  const newChat = () => {
    setChat([]);
    setInput("");
    inputRef.current?.focus();
  };

  // ⌘⇧O / Ctrl+Shift+O starts a new conversation, same shortcut as Polly.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || answering || scanning) return;
    setInput("");
    const reply = buildReply(text, trace, issues, appliedIds);
    setChat(c => [...c, { role: "user", text }]);
    setPendingSteps(reply.steps);
    setTimeout(() => {
      setChat(c => [...c, { role: "steps", steps: reply.steps }, ...reply.msgs]);
      if (approvalMode === "auto") {
        const diffIds = reply.msgs.flatMap(m => (m.role === "ai-diff" ? [m.id] : []));
        if (diffIds.length) setAppliedIds(prev => new Set([...prev, ...diffIds]));
      }
      setPendingSteps(null);
    }, 800);
  };

  const apply = (id: string) => setAppliedIds(prev => new Set(prev).add(id));
  const dismiss = (id: string) => setDismissedIds(prev => new Set(prev).add(id));
  const hasUserMessage = chat.some(m => m.role === "user");
  const lastAiIndex = chat.reduce((last, m, i) => (m.role === "ai" ? i : last), -1);

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
            onClick={newChat}
            disabled={!chat.length}
            title="Cuộc trò chuyện mới (⌘⇧O / Ctrl+Shift+O)"
            aria-label="Cuộc trò chuyện mới"
            className={cn("h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 disabled:opacity-40 disabled:cursor-not-allowed", FOCUS)}
          >
            <SquarePen size={14} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng (⌘I / Ctrl+I)"
            aria-label="Đóng"
            className={cn("h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0", FOCUS)}
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        <div role="radiogroup" aria-label="Chế độ áp dụng đề xuất" className="flex items-center bg-surface-muted rounded-lg p-0.5 border border-border w-fit mt-2.5">
          {([
            { id: "manual", label: "Thủ công" },
            { id: "auto", label: "Tự động" },
          ] as const).map(opt => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={approvalMode === opt.id}
              onClick={() => setApprovalMode(opt.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-base", FOCUS,
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

      {/* Thread */}
      <div role="log" aria-live="polite" aria-label="Hội thoại với AI" className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <StepChips steps={SCAN_STEPS(trace.turns.length)} running={scanning} />

        {!scanning && (
          <>
            {/* First assistant message: the automatic scan */}
            <div className="bg-surface-muted/60 border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
              {visibleIssues.length > 0 ? (
                <div className="text-foreground mb-0.5">
                  Mình đã quét xong · <span className="font-semibold">{groups.length}</span> nhóm vấn đề · <span className="font-semibold">{visibleIssues.length}</span> điểm cần chú ý.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[hsl(var(--success-strong))] mb-0.5">
                  <CheckCircle2 size={13} /> Không phát hiện vấn đề kỹ thuật nào trong conversation này.
                </div>
              )}
              Chỉ dựa trên tín hiệu kỹ thuật trong trace, không chấm nội dung câu trả lời. Hỏi mình bất cứ điều gì về conversation này.
            </div>

            {groups.map((g, idx) => (
              <IssueGroup
                key={g.kind}
                kind={g.kind}
                items={g.items}
                isFirst={idx === 0}
                agentId={agentId}
                onScrollToTurn={onScrollToTurn}
                appliedIds={appliedIds}
                onApply={apply}
                onDismiss={dismiss}
              />
            ))}

            {/* Starter questions sit in the thread (scrolling with it) instead of pinned above the
                composer, where four wrapped chips took ~190px from the thread. */}
            {!hasUserMessage && <PromptChips prompts={starterPrompts(visibleIssues, appliedIds)} onPick={send} />}

            {chat.map((m, i) => {
              if (m.role === "user") return (
                <div key={i} className="flex justify-end pt-1">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-xs max-w-[90%] leading-relaxed whitespace-pre-wrap">{m.text}</div>
                </div>
              );
              if (m.role === "steps") return <StepChips key={i} steps={m.steps} />;
              if (m.role === "ai") return (
                <div key={i} className="bg-surface-muted/60 border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 text-xs leading-relaxed">
                  <div className="whitespace-pre-wrap"><TurnLinkedText text={m.text} onScrollToTurn={onScrollToTurn} turnCount={trace.turns.length} /></div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.actions.map(a => <DeepLinkButton key={a.section} agentId={agentId} section={a.section} label={a.label} />)}
                    </div>
                  )}
                  {m.followUps && m.followUps.length > 0 && i === lastAiIndex && !answering && (
                    <div className="mt-2.5"><PromptChips prompts={m.followUps} onPick={send} /></div>
                  )}
                </div>
              );
              if (dismissedIds.has(m.id)) return null;
              return (
                <InstructionsFix
                  key={i}
                  fix={m}
                  applied={appliedIds.has(m.id)}
                  onApply={() => apply(m.id)}
                  onDismiss={() => dismiss(m.id)}
                />
              );
            })}

            {pendingSteps && <StepChips steps={pendingSteps} running />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 shrink-0 bg-surface">
        <div className="rounded-xl border border-border bg-surface focus-within:border-primary transition-base p-1.5">
          <div className="flex items-end gap-1.5">
            <label htmlFor="refine-trace-input" className="sr-only">Hỏi AI về conversation này</label>
            <textarea
              id="refine-trace-input"
              ref={inputRef}
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
              className={cn("h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary-glow flex items-center justify-center transition-base shrink-0 disabled:opacity-40 disabled:cursor-not-allowed", FOCUS)}
            >
              <SendHorizontal size={14} aria-hidden />
            </button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 px-1">Enter để gửi · Shift+Enter xuống dòng</div>
      </div>
    </aside>
  );
}
