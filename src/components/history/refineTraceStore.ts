// Detects the "not ok" points a Builder would want surfaced on a Trace's "Refine with AI"
// panel — see BRAINSTORM/roadmap discussion (Sprint 66, "Trace lỗi hội thoại"). Scope is
// deliberately narrow: only structured/technical signals already present in the trace data
// (tool_call fail, guardrail block/refusal, HITL reject, turn outcome=failed, high latency).
// This never judges whether an agent reply is factually correct or hallucinated — that is a
// separate, later effort (Evaluators, roadmap M3) and mixing the two here would misrepresent
// what this feature actually checks.
import type { ConversationTrace, TraceTurn } from "./traceStore";

// Mirrors HistoryTab.tsx's own SLOW_LATENCY_MS — same threshold, kept local here since that
// constant isn't exported (avoids a cross-file coupling for one shared number).
const SLOW_LATENCY_MS = 3000;

export type TraceIssueKind = "tool_call" | "guardrail" | "hitl" | "turn_failed" | "latency";
export type TraceIssueSeverity = "critical" | "warning";

/** How a Builder can act on this issue from the panel. v1: only an Instructions mismatch gets
 * an AI-proposed diff (reuses the existing Apply/Discard mechanism from Refine with AI on
 * Instructions). Knowledge, Guardrail and Tool/connection issues are diagnose-only — the panel
 * deep-links to the right existing screen instead of generating a fix. Knowledge itself is
 * out of scope for v1 entirely (team capacity), so no issue kind here ever targets it. */
export type TraceIssueFix =
  | { kind: "instructions_diff"; before: string; after: string }
  | { kind: "deeplink"; ctaLabel: string; section: "skills" | "guardrails" }
  | { kind: "none" };

export interface TraceIssue {
  id: string;
  turnIndex: number;
  kind: TraceIssueKind;
  severity: TraceIssueSeverity;
  diagnosis: string;
  detail?: string;
  fix: TraceIssueFix;
}

/** A turn's outcome reads "failed" whenever its last tool-call attempt never recovered — see
 * traceStore.ts buildTrace(). When that's what actually happened, the failure belongs to the
 * tool_call issue for that same turn, not a second, redundant "turn failed" card. Only a turn
 * that ends Failed for some OTHER reason (the agent's own reply didn't do what Instructions
 * asked) surfaces as its own issue, and that's the one case v1 offers an Instructions diff for. */
function turnHasUnrecoveredToolFailure(turn: TraceTurn): boolean {
  const allCalls = turn.agentMessages.flatMap(m => m.toolCalls ?? []);
  return allCalls.length > 0 && allCalls[allCalls.length - 1].status === "failed";
}

export function detectTraceIssues(trace: ConversationTrace): TraceIssue[] {
  const issues: TraceIssue[] = [];

  for (const turn of trace.turns) {
    // Every tool-call attempt in the turn, in order — needed to tell a failure the run never
    // recovered from (Critical) apart from one a later retry of the same tool fixed (Warning:
    // the reply came through, but a connector that times out on the first try is still worth
    // a look). Treating both as Critical flagged every retried-then-succeeded call as broken.
    const turnCalls = turn.agentMessages.flatMap(m => m.toolCalls ?? []);
    turnCalls.forEach((tc, i) => {
      if (tc.status !== "failed") return;
      const recovered = turnCalls.slice(i + 1).some(later => later.name === tc.name && (later.status ?? "success") === "success");
      issues.push({
        id: `${turn.index}-tool-${tc.callId}`,
        turnIndex: turn.index,
        kind: "tool_call",
        severity: recovered ? "warning" : "critical",
        diagnosis: recovered
          ? `Tool ${tc.name} lỗi ở lần gọi đầu, đã tự thử lại thành công`
          : `Tool ${tc.name} gọi thất bại`,
        detail: tc.error ? tc.error : "Không có phản hồi hợp lệ từ connector.",
        fix: { kind: "deeplink", ctaLabel: "Kiểm tra kết nối Tool", section: "skills" },
      });
    });

    for (const msg of turn.agentMessages) {

      // "pass" is the only guardrail outcome that didn't intervene; "replaced" (first reply
      // blocked, agent regenerated it) is still an intervention a Builder should see.
      if (msg.guardrail && msg.guardrail.action !== "pass") {
        const action = msg.guardrail.action;
        issues.push({
          id: `${turn.index}-guardrail-${msg.id}`,
          turnIndex: turn.index,
          kind: "guardrail",
          severity: "warning",
          diagnosis:
            action === "blocked" ? "Bị Guardrail chặn"
              : action === "replaced" ? "Guardrail đã chặn và thay câu trả lời"
                : "Agent từ chối trả lời do Guardrail",
          detail: msg.guardrail.rule ? `Rule: "${msg.guardrail.rule}"` : undefined,
          fix: { kind: "deeplink", ctaLabel: "Mở cấu hình Guardrail", section: "guardrails" },
        });
      }

      if (msg.hitl && msg.hitl.action === "reject") {
        issues.push({
          id: `${turn.index}-hitl-${msg.id}`,
          turnIndex: turn.index,
          kind: "hitl",
          severity: "warning",
          diagnosis: "Human-in-the-loop: reviewer từ chối đề xuất",
          detail: msg.hitl.answer ?? (msg.hitl.situation === "tool_approval" ? `Tool: ${msg.hitl.toolName}` : undefined),
          fix: { kind: "none" },
        });
      }
    }

    if (turn.outcome === "failed" && !turnHasUnrecoveredToolFailure(turn)) {
      issues.push({
        id: `${turn.index}-turnfailed`,
        turnIndex: turn.index,
        kind: "turn_failed",
        severity: "critical",
        diagnosis: "Turn kết thúc với trạng thái Failed",
        detail: turn.agentMessages.find(m => m.failure)?.failure?.reason ?? "Không tuân theo định dạng trả lời quy định trong Instructions.",
        fix: {
          kind: "instructions_diff",
          before: "Luôn trả lời bằng một đoạn văn ngắn gọn.",
          after: "Luôn trả lời theo cấu trúc: (1) Tóm tắt, (2) Bước tiếp theo.",
        },
      });
    }

    if (turn.latencyMs > SLOW_LATENCY_MS) {
      issues.push({
        id: `${turn.index}-latency`,
        turnIndex: turn.index,
        kind: "latency",
        severity: "warning",
        diagnosis: `Latency ${(turn.latencyMs / 1000).toFixed(1)}s (ngưỡng ${(SLOW_LATENCY_MS / 1000).toFixed(0)}s)`,
        fix: { kind: "none" },
      });
    }
  }

  return issues;
}
