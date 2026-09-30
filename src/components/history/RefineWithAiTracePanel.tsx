import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Wrench, ShieldAlert, UserCheck, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationTrace } from "@/components/history/traceStore";
import { detectTraceIssues, type TraceIssue, type TraceIssueKind } from "@/components/history/refineTraceStore";

/** Left-side "Refine with AI" panel for the Trace page — same slide-in-from-the-left mechanic,
 * collapsed-nav feel and Thủ công/Tự động approval toggle verified against the real "Refine với
 * AI" panel on console-agents.fpt.ai (Agent Instructions). The content is new: it auto-scans the
 * whole conversation for structured/technical signals only (tool_call fail, guardrail
 * block/refusal, HITL reject, turn outcome=failed, high latency) — never a judgment of whether a
 * reply's content is correct, that's the separate Evaluators effort. v1 fix scope: only an
 * Instructions mismatch gets an AI-proposed diff (reuses the existing Apply/Discard mechanism);
 * everything else is diagnose + deep-link to the right existing screen. Knowledge is entirely
 * out of scope for v1 (team capacity) — detectTraceIssues() never produces a Knowledge issue. */

const KIND_ICON: Record<TraceIssueKind, React.ComponentType<{ size?: number; className?: string }>> = {
  tool_call: Wrench,
  guardrail: ShieldAlert,
  hitl: UserCheck,
  turn_failed: XCircle,
  latency: Clock,
};

function IssueCard({
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
  const Icon = KIND_ICON[issue.kind];
  const critical = issue.severity === "critical";
  const fix = issue.fix;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            critical ? "bg-destructive-soft text-[hsl(var(--destructive-strong))]" : "bg-warning-soft text-[hsl(var(--warning-strong))]",
          )}
        >
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span
              className={cn(
                "chip !h-5 !text-[11px]",
                critical ? "chip-danger !text-[hsl(var(--destructive-strong))]" : "chip-warning !text-[hsl(var(--warning-strong))]",
              )}
            >
              {critical ? "Critical" : "Warning"}
            </span>
            <button
              type="button"
              onClick={() => onScrollToTurn(issue.turnIndex)}
              className="text-xs text-muted-foreground hover:text-primary hover:underline transition-base"
            >
              Turn {issue.turnIndex}
            </button>
          </div>
          <p className="text-sm font-semibold leading-snug">{issue.diagnosis}</p>
          {issue.detail && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{issue.detail}</p>}

          {fix.kind === "deeplink" && (
            <div className="mt-2">
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
      </div>

      {fix.kind === "instructions_diff" && (
        applied ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[hsl(var(--success-strong))] pl-9">
            <CheckCircle2 size={12} /> Đã áp dụng vào Instructions
          </div>
        ) : (
          <div className="mt-2.5 pl-9">
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
                <button
                  type="button"
                  onClick={onApply}
                  className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Áp dụng vào Instructions
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="h-7 px-2.5 rounded-md hover:bg-surface-muted text-xs text-muted-foreground"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
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
              AI chỉ kiểm tra các tín hiệu kỹ thuật đã ghi nhận trong trace (tool call lỗi, bị Guardrail chặn,
              HITL từ chối, turn Failed, latency cao) — không đánh giá độ chính xác nội dung câu trả lời.
            </div>

            {visibleIssues.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success-strong))] px-1 py-1">
                <CheckCircle2 size={13} /> Không phát hiện vấn đề kỹ thuật nào trong conversation này.
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-muted-foreground px-0.5">
                  Đã phát hiện <span className="text-foreground">{visibleIssues.length}</span> điểm cần chú ý
                </div>
                {visibleIssues.map(issue => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    agentId={agentId}
                    onScrollToTurn={onScrollToTurn}
                    applied={appliedIds.has(issue.id)}
                    onApply={() => setAppliedIds(prev => new Set(prev).add(issue.id))}
                    onDismiss={() => setDismissedIds(prev => new Set(prev).add(issue.id))}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
