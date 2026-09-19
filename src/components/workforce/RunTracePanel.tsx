import { Bot, Boxes, Check, CheckCircle2, GitBranch, Headset, Loader2, Play, ShieldCheck, Square, User, X, XCircle, Zap } from "lucide-react";
import type { WorkforceNode } from "./types";
import type { RunTraceState } from "./useRunTrace";

const KIND_ICON: Record<string, typeof Bot> = {
  trigger: Zap, agent: Bot, omni: Headset, person: User, subprocess: Boxes,
};

/** Same three-line summary ConditionNode.tsx itself shows on-canvas — duplicated rather than
 * imported since it's presentation-only and this is the only other place it's needed. */
function conditionSummary(node: WorkforceNode | undefined): string {
  if (!node || node.data.kind !== "condition") return "—";
  if (node.data.type === "llm") return node.data.llmText.trim() || "Chưa cấu hình điều kiện";
  if (node.data.type === "agent-judgment") return node.data.llmText.trim() || "Agent tự quyết định";
  return node.data.rules.length > 0 ? `${node.data.rules.length} điều kiện` : "Chưa cấu hình điều kiện";
}

/** Floating panel driving + narrating a simulated run (S-gap-7). Docked bottom-right rather than
 * the full-height right edge every config drawer uses (OmniConfigDrawer, SubProcessConfigDrawer,
 * …) — a run can be started while a node's own drawer is still open (e.g. right after finishing
 * a Trigger's setup), so the two need to coexist on screen rather than fight for the same real
 * estate. Also clears the left control rail (bottom-[58px] left-4) and the bottom palette dock. */
export default function RunTracePanel({
  nodes, state, describeNode, describeMember, onChoose, onResolveApproval, onStop, onRestart, onClose, mode = "test", contextMessage,
}: {
  nodes: WorkforceNode[];
  state: RunTraceState;
  describeNode: (nodeId: string) => string;
  /** Resolves an org member id to a display name — for the "Đang chờ <ai> duyệt" line, since
   * this panel has no org data of its own (same reason ConditionDrawer takes a resolved
   * `assigneeName` prop instead of an id). */
  describeMember: (memberId: string | null) => string;
  onChoose: (conditionId: string, targetId: string) => void;
  onResolveApproval: (decision: "approve" | "reject") => void;
  onStop: () => void;
  onRestart: () => void;
  onClose: () => void;
  /** "test" (default) is the builder-only "Chạy thử" tool; "manual" is a real run kicked off
   * from a manual Trigger's "Chạy Workforce" entry point (S-gap: manual/chat trigger) — same
   * trace visualization either way, just different header wording so a business user doing a
   * real run is never told this was only a "test". */
  mode?: "test" | "manual";
  /** The free-text request typed into ManualRunDialog when `mode === "manual"` — shown as the
   * run's own context so it's clear what request this trace is walking through. */
  contextMessage?: string | null;
}) {
  const findNode = (id: string) => nodes.find(n => n.id === id);

  const endMessage =
    state.endReason === "unwired" ? `Trigger này chưa kết nối tới Agent nào — không thể ${mode === "manual" ? "chạy" : "chạy thử"}.` :
    state.endReason === "stopped" ? `Đã dừng ${mode === "manual" ? "chạy" : "chạy thử"}.` :
    state.endReason === "rejected" ? `${describeMember(state.pendingApproval?.assigneeId ?? null)} đã từ chối — dừng tại "${state.currentNodeId ? describeNode(state.currentNodeId) : "—"}".` :
    state.currentNodeId ? `Hoàn tất — kết thúc tại "${describeNode(state.currentNodeId)}".` : "Hoàn tất.";

  return (
    <aside
      className="fixed right-4 bottom-[74px] w-[360px] max-h-[min(560px,70vh)] z-20 flex flex-col overflow-hidden animate-fade-up"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: "1px solid var(--wf-border)",
        boxShadow: "var(--wf-node-shadow-selected)",
      }}
    >
      <div className="flex items-center gap-2 px-3.5 h-11 shrink-0" style={{ borderBottom: "1px solid var(--wf-border)" }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--wf-accent)", color: "var(--wf-accent-ink)" }}>
          <Play size={11} fill="currentColor" />
        </div>
        <span className="text-[13px] font-bold flex-1 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
          {mode === "manual"
            ? (state.status === "done" ? "Kết quả" : "Đang chạy Workforce")
            : (state.status === "done" ? "Kết quả chạy thử" : "Đang chạy thử")}
        </span>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        {mode === "manual" && contextMessage && (
          <div
            className="mb-3 px-2.5 py-2 rounded-lg"
            style={{ background: "var(--wf-bg)", border: "1px dashed var(--wf-border)" }}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--wf-muted)" }}>Yêu cầu</p>
            <p className="text-[12.5px] leading-snug" style={{ color: "var(--wf-text)" }}>{contextMessage}</p>
          </div>
        )}
        <ol className="space-y-2">
          {state.steps.map((nodeId, i) => {
            const node = findNode(nodeId);
            const Icon = node ? KIND_ICON[node.data.kind] ?? Bot : Bot;
            const isCurrent = state.currentNodeId === nodeId && state.status !== "done";
            const isLast = i === state.steps.length - 1;
            return (
              <li key={nodeId + i} className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? "wf-run-current" : ""}`}
                  style={{
                    background: isCurrent ? "var(--wf-accent)" : "var(--wf-pub-bg)",
                    color: isCurrent ? "var(--wf-accent-ink)" : "var(--wf-pub-ink)",
                    outline: isCurrent ? "3px solid var(--wf-accent)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  {isCurrent ? <Loader2 size={12} className="animate-spin" /> : isLast && state.status === "done" && state.endReason !== "stopped" ? <CheckCircle2 size={13} /> : <Icon size={12} />}
                </div>
                <span className="text-[12.5px] leading-tight truncate" style={{ color: "var(--wf-text)", fontFamily: "var(--wf-font-body)" }}>
                  {describeNode(nodeId)}
                </span>
              </li>
            );
          })}
        </ol>

        {state.status === "choice" && state.choiceOptions && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--wf-border)" }}>
            <p className="text-[11.5px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--wf-muted)" }}>
              <GitBranch size={12} /> Có {state.choiceOptions.length} nhánh — chọn nhánh để tiếp tục mô phỏng
            </p>
            <div className="space-y-1.5">
              {state.choiceOptions.map(opt => {
                const condNode = findNode(opt.conditionId);
                return (
                  <button
                    key={opt.conditionId}
                    onClick={() => onChoose(opt.conditionId, opt.targetId)}
                    className="w-full text-left px-2.5 py-2 rounded-lg border transition-base hover:border-primary/50 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
                    style={{ borderColor: "var(--wf-border)", background: "var(--wf-bg)" }}
                  >
                    <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--wf-muted)" }}>{conditionSummary(condNode)}</p>
                    <p className="text-[12.5px] font-semibold mt-0.5" style={{ color: "var(--wf-text)" }}>→ {describeNode(opt.targetId)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {state.status === "approval" && state.pendingApproval && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--wf-border)" }}>
            <p className="text-[11.5px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--wf-muted)" }}>
              <ShieldCheck size={12} />
              {state.pendingApproval.mode === "agent-decide"
                ? `Agent đang tự đánh giá — ${describeMember(state.pendingApproval.assigneeId)} có thể can thiệp`
                : `Đang chờ ${describeMember(state.pendingApproval.assigneeId)} duyệt`}
            </p>
            <p className="text-[12.5px] font-semibold mb-2" style={{ color: "var(--wf-text)" }}>→ {describeNode(state.pendingApproval.option.targetId)}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onResolveApproval("approve")}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12.5px] font-semibold transition-base min-h-[44px]"
                style={{ background: "var(--wf-pub-bg)", color: "var(--wf-pub-ink)" }}
              >
                <Check size={13} /> Duyệt
              </button>
              <button
                onClick={() => onResolveApproval("reject")}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-[12.5px] font-semibold transition-base min-h-[44px]"
                style={{ borderColor: "var(--wf-border)", color: "var(--wf-muted)" }}
              >
                <XCircle size={13} /> Từ chối
              </button>
            </div>
          </div>
        )}

        {state.status === "done" && (
          <p className="text-[12px] leading-relaxed mt-3 pt-3" style={{ color: "var(--wf-muted)", borderTop: "1px dashed var(--wf-border)" }}>
            {endMessage}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2.5 shrink-0" style={{ borderTop: "1px solid var(--wf-border)" }}>
        {state.status === "done" ? (
          <>
            <button onClick={onRestart} className="wf-btn-pri flex-1 flex items-center justify-center gap-1.5"><Play size={12} fill="currentColor" /> Chạy lại</button>
            <button onClick={onClose} className="wf-btn-sec">Đóng</button>
          </>
        ) : (
          <button onClick={onStop} className="wf-btn-sec flex-1 flex items-center justify-center gap-1.5"><Square size={11} fill="currentColor" /> Dừng</button>
        )}
      </div>
    </aside>
  );
}
