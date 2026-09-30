import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Wrench, ShieldAlert, UserCheck, XCircle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
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

const KIND_META: Record<TraceIssueKind, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; tone: "critical" | "warning" }> = {
  turn_failed: { label: "Turn thất bại", icon: XCircle, tone: "critical" },
  tool_call: { label: "Tool call lỗi", icon: Wrench, tone: "critical" },
  guardrail: { label: "Guardrail chặn", icon: ShieldAlert, tone: "warning" },
  hitl: { label: "HITL từ chối", icon: UserCheck, tone: "warning" },
  latency: { label: "Latency cao", icon: Clock, tone: "warning" },
};

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
      <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success-strong))] px-3 pb-2.5 pt-0.5">
        <CheckCircle2 size={12} /> Đã áp dụng vào Instructions
      </div>
    );
  }
  return (
    <div className="px-3 pb-2.5 pt-0.5">
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
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => onScrollToTurn(issue.turnIndex)}
        className="w-full flex items-start gap-2 pl-9 pr-3 py-2 text-left hover:bg-surface-muted transition-base"
      >
        <span className="text-xs font-mono text-muted-foreground shrink-0 mt-px">Turn {issue.turnIndex}</span>
        <span className="text-xs text-foreground flex-1 min-w-0">
          {issue.diagnosis}
          {issue.detail && <span className="block text-muted-foreground mt-0.5">{issue.detail}</span>}
        </span>
      </button>

      {fix.kind === "instructions_diff" && (
        <InstructionsFix fix={fix} applied={applied} onApply={onApply} onDismiss={onDismiss} />
      )}

      {fix.kind === "deeplink" && (
        <div className="pl-9 pr-3 pb-2.5 -mt-0.5">
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
  return (
    <details open={isFirst} className="group rounded-xl border border-border bg-surface overflow-hidden [&::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer flex items-center gap-2 px-3 py-2.5 select-none">
        <Icon size={14} className={meta.tone === "critical" ? "text-[hsl(var(--destructive-strong))]" : "text-[hsl(var(--warning-strong))]"} />
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

export function RefineWithAiTracePanel({
  agentId, conversationId, trace, onClose, onScrollToTurn,
}: {
  agentId: string;
  conversationId: string;
  trace: ConversationTrace;
  onClose: () => void;
  onScrollToTurn: (turnIndex: number) => void;
}) {
  const [scanning, setScanning] = useState(true);
  const [approvalMode, setApprovalMode] = useState<"manual" | "auto">("manual");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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
          </>
        )}
      </div>
    </aside>
  );
}
