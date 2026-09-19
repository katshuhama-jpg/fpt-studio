import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Bot, Boxes, Headset, User, Zap, CheckCircle2, Square, TriangleAlert, GitBranch } from "lucide-react";
import { ReactFlowProvider, useNodesState, useEdgesState } from "reactflow";
import { AGENTS } from "@/components/configure/agentStore";
import { triggerStore } from "@/components/configure/triggerStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import Canvas from "@/components/workforce/Canvas";
import { workforceStore } from "@/components/workforce/workforceStore";
import { runHistoryStore } from "@/components/workforce/runHistoryStore";
import { getNodesUnreachableFromTrigger } from "@/components/workforce/graphOps";
import type { WorkforceNodeActions } from "@/components/workforce/nodes/nodeActionsContext";
import type { RunNodeStatus } from "@/components/workforce/useRunTrace";

const KIND_ICON: Record<string, typeof Bot> = { trigger: Zap, agent: Bot, omni: Headset, person: User, subprocess: Boxes };
const STATUS_META = {
  success: { label: "Thành công", icon: CheckCircle2, bg: "var(--wf-pub-bg)", ink: "var(--wf-pub-ink)" },
  stopped: { label: "Đã dừng", icon: Square, bg: "var(--wf-bg)", ink: "var(--wf-muted)" },
  error: { label: "Lỗi", icon: TriangleAlert, bg: "#FDECEC", ink: "#C0362C" },
} as const;

function fmtDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const NOOP = () => {};

/** Read-only replay of one past run (S-gap-8, Observability) — the "Xem trace" destination from
 * RunHistoryTab. Reuses the exact same Canvas + node/edge components the live builder uses, fed
 * a static `RunTraceHighlight` built from the stored record instead of `useRunTrace`'s live
 * state, so a run's path lights up on the real graph precisely the way "Chạy thử" itself
 * highlights it — just frozen at its final state rather than animating. `locked` on the Canvas
 * (no drag/connect/select) plus every mutation callback wired to a no-op keeps this page from
 * ever writing back to `workforceStore`; it only ever reads. */
export default function WorkforceTracePage() {
  const { id = "", runId = "" } = useParams();
  const navigate = useNavigate();
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);

  const wfRecord = useMemo(() => workforceStore.get(id), [id]);
  const run = useMemo(() => runHistoryStore.get(runId), [runId]);

  const [nodes] = useNodesState(wfRecord?.nodes ?? []);
  const [edges] = useEdgesState(wfRecord?.edges ?? []);

  const triggerAgentIds = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const n of nodes) {
      if (n.data.kind !== "trigger") continue;
      const outEdge = edges.find(e => e.source === n.id);
      const target = outEdge ? nodes.find(nn => nn.id === outEdge.target) : undefined;
      map.set(n.id, target?.data.kind === "agent" ? target.data.agentId : null);
    }
    return map;
  }, [nodes, edges]);

  const describeRunNode = (nodeId: string): string => {
    const n = nodes.find(nn => nn.id === nodeId);
    if (!n) return "—";
    switch (n.data.kind) {
      case "agent": return AGENTS.find(a => a.id === n.data.agentId)?.name ?? "Agent";
      case "omni": return "Omni Supports";
      case "person": return members.find(m => m.id === n.data.memberId)?.name ?? "Người trong tổ chức";
      case "subprocess": return (n.data.workforceId ? workforceStore.get(n.data.workforceId)?.name : undefined) ?? "Sub-process";
      case "trigger": {
        const agentId = triggerAgentIds.get(n.id) ?? null;
        const record = agentId && n.data.triggerId ? triggerStore.get(agentId, n.data.triggerId) : undefined;
        return record?.name ?? "Trigger";
      }
      default: return "—";
    }
  };

  const unreachableNodeIds = useMemo(() => getNodesUnreachableFromTrigger(nodes as any, edges), [nodes, edges]);

  // Freeze the run's own steps + condition ids as "done" — a trace replay never shows a
  // "current" (in-progress) node, only the completed path, same visual language as a finished
  // live run (RunTraceHighlight already treats "current" vs "done" identically once done).
  const runHighlight = useMemo(() => {
    if (!run) return null;
    const nodeStatus = new Map<string, RunNodeStatus>();
    for (const sId of run.steps) nodeStatus.set(sId, "done");
    for (const c of run.conditionChoices) nodeStatus.set(c.conditionId, "done");
    return { nodeStatus, edgeIds: new Set(run.edgeIds), travelingEdgeIds: new Set<string>() };
  }, [run]);

  const nodeActions: WorkforceNodeActions = {
    onDelete: NOOP,
    onNoteTextChange: NOOP,
    unreachableNodeIds,
    triggerAgentIds,
    runTrace: runHighlight,
  };

  if (!wfRecord || !run) {
    return (
      <div className="wf-slate flex flex-col h-full items-center justify-center gap-3">
        <p className="text-[13px]" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>Không tìm thấy phiên chạy này.</p>
        <button onClick={() => navigate(`/workforce/${id}`)} className="wf-btn-sec">Quay lại Workforce</button>
      </div>
    );
  }

  const meta = STATUS_META[run.status];
  const StatusIcon = meta.icon;

  return (
    <div className="wf-slate flex flex-col h-full">
      <div
        className="flex items-center h-14 px-[18px] gap-3 shrink-0 [font-family:var(--wf-font-display)]"
        style={{ background: "var(--wf-surface)", borderBottom: "1px solid var(--wf-border)" }}
      >
        <button
          onClick={() => navigate(`/workforce/${id}`)}
          className="flex items-center gap-1.5 text-[13px] font-semibold shrink-0 transition-base hover:opacity-80"
          style={{ color: "var(--wf-muted)" }}
        >
          <ChevronLeft size={14} /> {wfRecord.name}
        </button>
        <span style={{ color: "var(--wf-border)" }}>/</span>
        <span className="text-[14.5px] font-extrabold truncate" style={{ color: "var(--wf-text)" }}>Trace · {fmtTime(run.startedAt)}</span>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: run.source === "trigger" ? "var(--wf-trigger-bg)" : "var(--wf-accent-bg)", color: run.source === "trigger" ? "var(--wf-trigger)" : "var(--wf-accent)" }}
          >
            {run.source === "trigger" ? <Zap size={11} /> : <GitBranch size={11} />} {run.source === "trigger" ? run.triggerLabel : "Chạy thử"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: meta.bg, color: meta.ink }}>
            <StatusIcon size={11} /> {meta.label}
          </span>
          <span className="text-[12px] tabular-nums" style={{ color: "var(--wf-muted)" }}>{fmtDuration(run.endedAt - run.startedAt)}</span>
        </div>
      </div>

      <div className="flex-1 relative flex overflow-hidden">
        <ReactFlowProvider>
          <Canvas
            nodes={nodes as any}
            edges={edges}
            setNodes={NOOP as any}
            onNodesChange={NOOP as any}
            setEdges={NOOP as any}
            onEdgesChange={NOOP as any}
            rfInstance={null}
            setRfInstance={NOOP}
            nodeActions={nodeActions}
            onConfigureNode={NOOP}
            toast={NOOP}
            onBeforeMutate={NOOP}
            locked
          />
        </ReactFlowProvider>

        <aside
          className="w-[340px] shrink-0 flex flex-col overflow-y-auto"
          style={{ borderLeft: "1px solid var(--wf-border)", background: "var(--wf-surface)" }}
        >
          {run.contextMessage && (
            <div className="m-3.5 mb-0 px-2.5 py-2 rounded-lg" style={{ background: "var(--wf-bg)", border: "1px dashed var(--wf-border)" }}>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--wf-muted)" }}>Yêu cầu</p>
              <p className="text-[12.5px] leading-snug" style={{ color: "var(--wf-text)" }}>{run.contextMessage}</p>
            </div>
          )}

          <div className="p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-display)" }}>Đường đi</p>
            <ol className="space-y-2">
              {run.steps.map((nodeId, i) => {
                const node = nodes.find(n => n.id === nodeId);
                const Icon = node ? KIND_ICON[node.data.kind] ?? Bot : Bot;
                const isLast = i === run.steps.length - 1;
                return (
                  <li key={nodeId + i} className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--wf-pub-bg)", color: "var(--wf-pub-ink)" }}
                    >
                      {isLast && run.status === "success" ? <CheckCircle2 size={13} /> : <Icon size={12} />}
                    </div>
                    <span className="text-[12.5px] leading-tight truncate" style={{ color: "var(--wf-text)", fontFamily: "var(--wf-font-body)" }}>
                      {describeRunNode(nodeId)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {run.conditionChoices.length > 0 && (
            <div className="px-3.5 pb-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-display)" }}>Nhánh đã đi qua</p>
              <div className="space-y-1.5">
                {run.conditionChoices.map(c => (
                  <div key={c.conditionId} className="px-2.5 py-2 rounded-lg" style={{ border: "1px solid var(--wf-border)", background: "var(--wf-bg)" }}>
                    <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--wf-muted)" }}>{c.conditionLabel}</p>
                    <p className="text-[12.5px] font-semibold mt-0.5" style={{ color: "var(--wf-text)" }}>→ {c.targetLabel}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {run.errorReason && (
            <div className="px-3.5 pb-3.5">
              <div className="px-2.5 py-2 rounded-lg flex items-start gap-2" style={{ background: "#FDECEC", border: "1px solid #F5C6C0" }}>
                <TriangleAlert size={13} className="shrink-0 mt-0.5" style={{ color: "#C0362C" }} />
                <p className="text-[12px] leading-snug" style={{ color: "#C0362C" }}>{run.errorReason}</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
