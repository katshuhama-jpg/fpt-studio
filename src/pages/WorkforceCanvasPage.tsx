import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Undo2, Redo2, LayoutGrid, Plus, Minus, Maximize, Lock, LockOpen, Play, ChevronDown, MessageSquare, Workflow, History } from "lucide-react";
import { toast } from "sonner";
import { ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance } from "reactflow";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AGENTS } from "@/components/configure/agentStore";
import { triggerStore } from "@/components/configure/triggerStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import Canvas from "@/components/workforce/Canvas";
import PersonPickerPopover from "@/components/workforce/PersonPickerPopover";
import PersonConfigDrawer from "@/components/workforce/PersonConfigDrawer";
import OmniConfigDrawer from "@/components/workforce/OmniConfigDrawer";
import TriggerConfigDrawer from "@/components/workforce/TriggerConfigDrawer";
import ToolConfigDrawer from "@/components/workforce/ToolConfigDrawer";
import SubProcessConfigDrawer from "@/components/workforce/SubProcessConfigDrawer";
import AgentConfigDrawer from "@/components/workforce/AgentConfigDrawer";
import ConditionDrawer from "@/components/workforce/ConditionDrawer";
import GettingStartedChecklist from "@/components/workforce/GettingStartedChecklist";
import RunTracePanel from "@/components/workforce/RunTracePanel";
import RunHistoryTab from "@/components/workforce/RunHistoryTab";
import ManualRunDialog, { type ManualRunTriggerOption } from "@/components/workforce/ManualRunDialog";
import { DeleteNodeDialog } from "@/components/workforce/WorkforceDeleteDialogs";
import { workforceStore } from "@/components/workforce/workforceStore";
import { isConditionInvalid, type ConditionNodeData, type WorkforceNode, type WorkforceEdge, type WorkforceNodeData, type WorkforceStatus } from "@/components/workforce/types";
import { removeNodeCascade, removeRouteByConditionId, getRouteEndpoints, isDestinationNode, autoArrange, getNodesUnreachableFromTrigger } from "@/components/workforce/graphOps";
import { useRunTrace } from "@/components/workforce/useRunTrace";
import { runHistoryStore, buildConditionChoices, type RunStatus } from "@/components/workforce/runHistoryStore";
import type { WorkforceNodeActions } from "@/components/workforce/nodes/nodeActionsContext";

const MAX_HISTORY = 50;

export default function WorkforceCanvasPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);

  const wfRecord = useMemo(() => workforceStore.get(id), [id]);

  useEffect(() => {
    if (!wfRecord) navigate("/workforce", { replace: true });
  }, [wfRecord, navigate]);

  const [name, setName] = useState(wfRecord?.name ?? "Untitled workforce");
  const [status, setStatus] = useState<WorkforceStatus>(wfRecord?.status ?? "draft");
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkforceNodeData>(wfRecord?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(wfRecord?.edges ?? []);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [locked, setLocked] = useState(false);

  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(wfRecord?.updatedAt ?? null);

  const [configuringId, setConfiguringId] = useState<string | null>(null);
  // Set only from inside the Person node's own drawer ("Đổi người nhận") — clicking the node
  // itself opens that drawer via `configuringId` like every other node type, never this picker
  // directly.
  const [personPickerNodeId, setPersonPickerNodeId] = useState<string | null>(null);
  // Set only from inside the Person node's own drawer when picking who a task escalates to on
  // SLA breach — a separate id from `personPickerNodeId` because it writes to `data.escalation`
  // instead of `data.memberId` (S-gap-5).
  const [escalationPickerNodeId, setEscalationPickerNodeId] = useState<string | null>(null);
  // Set only from inside a Condition's own drawer when picking who approves that route — writes
  // to that Condition node's `data.approval.assigneeId` (S-demo gap 1: approval moved from a
  // Person(approve) node onto the Condition/edge, matching Relevance AI's model).
  const [approvalPickerConditionId, setApprovalPickerConditionId] = useState<string | null>(null);
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  // Only relevant when the canvas has more than one Trigger node — the small "which Trigger do
  // you want to simulate?" menu that opens under the "Chạy thử" button in that case (S-gap-7).
  // With zero or one Trigger, "Chạy thử" skips this and acts directly (see handleTestRun below).
  const [triggerMenuOpen, setTriggerMenuOpen] = useState(false);
  // "Chạy Workforce" (S-gap: manual/chat Trigger) — the real, non-test way a business user
  // starts this Workforce. Kept fully separate from `triggerMenuOpen`/handleTestRun above: it
  // only ever lists Trigger nodes backed by a "manual" TriggerRecord, and it collects a request
  // message first (ManualRunDialog) before handing off to the same run-trace machinery.
  const [manualRunOpen, setManualRunOpen] = useState(false);
  const [manualRunMessage, setManualRunMessage] = useState<string | null>(null);
  const [manualRunActive, setManualRunActive] = useState(false);
  const runTrace = useRunTrace(nodes as any, edges);
  // When a run started, so the recorded WorkforceRunRecord (below) has a real duration — a ref
  // (not state) since it's write-once-per-run and read only inside the recording effect, never
  // rendered off directly.
  const runStartedAtRef = useRef<number | null>(null);

  // "Canvas" | "Lịch sử chạy" (S-gap-8, Observability) — single-row header tabs, same slot the
  // Agent page's own Build/Test/Channels/Insights tabs occupy.
  const [activeTab, setActiveTab] = useState<"canvas" | "history">("canvas");
  const [runs, setRuns] = useState(() => runHistoryStore.list(id));

  // Undo/redo history — snapshots are pushed right before a mutating action (add/delete a
  // node or route, drag a node, open a config drawer, save a Condition) rather than on every
  // reactflow change event, so one Ctrl+Z reverts one meaningful edit, not one pixel of drag.
  const historyRef = useRef<{ nodes: WorkforceNode[]; edges: WorkforceEdge[] }[]>([]);
  const futureRef = useRef<{ nodes: WorkforceNode[]; edges: WorkforceEdge[] }[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const snapshot = () => {
    historyRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    futureRef.current = [];
    setHistoryTick(t => t + 1);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(prev.nodes as any);
    setEdges(prev.edges);
    setHistoryTick(t => t + 1);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(next.nodes as any);
    setEdges(next.edges);
    setHistoryTick(t => t + 1);
  };

  const handleAutoArrange = () => {
    snapshot();
    setNodes(ns => autoArrange(ns as any, edges) as any);
    toast.success("Đã sắp xếp lại canvas");
  };

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSaveState("dirty");
    const t = setTimeout(() => workforceStore.saveGraph(id, nodes as any, edges), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  if (!wfRecord) return null;

  const handleSave = () => {
    setSaveState("saving");
    workforceStore.saveGraph(id, nodes as any, edges);
    const trimmedName = name.trim() || "Untitled workforce";
    if (trimmedName !== name) setName(trimmedName);
    workforceStore.rename(id, trimmedName);
    setTimeout(() => {
      setLastSavedAt(Date.now());
      setSaveState("saved");
    }, 300);
  };

  const handlePublish = () => {
    const invalidIds = new Set(
      nodes.filter(n => n.data.kind === "condition" && isConditionInvalid(n.data as ConditionNodeData)).map(n => n.id),
    );
    setNodes(ns => ns.map(n => n.data.kind === "condition" ? { ...n, data: { ...n.data, invalid: invalidIds.has(n.id) } } : n));
    if (invalidIds.size > 0) {
      toast.error("Một số route chưa cấu hình điều kiện chuyển giao, vui lòng hoàn tất trước khi publish");
      return;
    }
    const unreachable = getNodesUnreachableFromTrigger(nodes as any, edges);
    if (unreachable.size > 0) {
      toast.error("Một số node không có Trigger nào dẫn tới, sẽ không bao giờ chạy — vui lòng nối Trigger hoặc xoá trước khi publish");
      return;
    }
    const hasUnconfiguredTrigger = nodes.some(n => n.data.kind === "trigger" && edges.some(e => e.source === n.id) && !n.data.triggerId);
    if (hasUnconfiguredTrigger) {
      toast.error("Một số Trigger chưa chọn trigger thật — vui lòng chọn hoặc tạo trigger trước khi publish");
      return;
    }
    const hasUnconfiguredTool = nodes.some(n => n.data.kind === "tool" && !n.data.ref);
    if (hasUnconfiguredTool) {
      toast.error("Một số node Tool chưa chọn tool hoặc integration — vui lòng chọn trước khi publish");
      return;
    }
    const hasUnconfiguredSubProcess = nodes.some(n => n.data.kind === "subprocess" && !n.data.workforceId);
    if (hasUnconfiguredSubProcess) {
      toast.error("Một số node Sub-process chưa chọn Workforce để gọi — vui lòng chọn trước khi publish");
      return;
    }
    workforceStore.publish(id);
    setStatus("published");
    toast.success("Publish Workforce thành công");
  };

  // Live, not just at publish time — so opening an already-published workforce that's since
  // drifted into a broken state (someone added a chain and forgot to wire a Trigger to it)
  // shows the warning immediately, the same way `isConditionInvalid` is computed live in
  // ConditionNode rather than only stamped at publish time.
  const unreachableNodeIds = useMemo(() => getNodesUnreachableFromTrigger(nodes as any, edges), [nodes, edges]);

  // For each Trigger node, the agentId of the Agent it connects to (or null) — see the field's
  // own doc comment in nodeActionsContext.ts for why this is derived live from edges each
  // render rather than stored on the Trigger node's own data.
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

  // Human-readable label for a node reached during a simulated run (S-gap-7) — one label
  // resolver covering every kind a run can actually pass through (trigger/agent/omni/person/
  // subprocess), reusing the same lookups (AGENTS, members, triggerStore, workforceStore)
  // ConditionDrawer's own sourceLabel/destinationLabel already use below for the exact same
  // purpose, just generalized to every routable node kind instead of only a route's two ends.
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

  const triggerNodes = useMemo(() => nodes.filter(n => n.data.kind === "trigger"), [nodes]);
  const runActive = runTrace.state.status !== "idle";

  // Persist every finished run to the "Lịch sử chạy" tab (S-gap-8, Observability) — fires once
  // per completed run, right when `status` transitions into "done" (a restart or a fresh run
  // walks back through "running"/"choice" first, so this fires again for each one). `manualRunActive`
  // is exactly "this was a real 'Chạy Workforce' run, not a 'Chạy thử'" — RunTracePanel already
  // keys its own "test" vs "manual" mode off the same flag.
  useEffect(() => {
    if (runTrace.state.status !== "done") return;
    const s = runTrace.state;
    const startedAt = runStartedAtRef.current ?? Date.now();
    const status: RunStatus = s.endReason === "unwired" ? "error" : s.endReason === "stopped" ? "stopped" : s.endReason === "rejected" ? "rejected" : "success";
    const conditionChoices = buildConditionChoices(s.nodeStatus.keys(), nodes as any, edges, describeRunNode);
    const rejectedBy = s.endReason === "rejected" ? members.find(m => m.id === s.pendingApproval?.assigneeId) : undefined;
    runHistoryStore.record({
      workforceId: id,
      source: manualRunActive ? "trigger" : "test",
      triggerLabel: s.steps[0] ? describeRunNode(s.steps[0]) : "Trigger",
      contextMessage: manualRunActive ? manualRunMessage : null,
      startedAt,
      endedAt: Date.now(),
      status,
      steps: s.steps,
      edgeIds: [...s.edgeIds],
      conditionChoices,
      errorReason: s.endReason === "unwired" ? `Trigger "${s.steps[0] ? describeRunNode(s.steps[0]) : "này"}" chưa kết nối tới Agent nào — dừng ngay từ bước đầu.`
        : s.endReason === "rejected" ? `${rejectedBy?.name ?? "Người duyệt"} đã từ chối.`
        : null,
    });
    setRuns(runHistoryStore.list(id));
    runStartedAtRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTrace.state.status]);

  const handleTestRun = () => {
    if (triggerNodes.length === 0) {
      toast.error("Chưa có Trigger nào trên canvas để chạy thử");
      return;
    }
    if (triggerNodes.length === 1) {
      setManualRunActive(false);
      runStartedAtRef.current = Date.now();
      runTrace.start(triggerNodes[0].id);
      return;
    }
    setTriggerMenuOpen(v => !v);
  };

  // Every Trigger node whose real trigger (resolved the same way TriggerNode.tsx itself does)
  // is type "manual" — these are the only Triggers a business user can fire by hand from
  // "Chạy Workforce" (S-gap: manual/chat Trigger, matching Relevance AI's default "User message
  // received" Trigger). Requires the node to actually be wired to an Agent, same precondition
  // every other Trigger use already enforces.
  const manualTriggerOptions: ManualRunTriggerOption[] = useMemo(() => {
    const options: ManualRunTriggerOption[] = [];
    for (const n of triggerNodes) {
      const agentId = triggerAgentIds.get(n.id) ?? null;
      const triggerId = n.data.kind === "trigger" ? n.data.triggerId : null;
      const record = agentId && triggerId ? triggerStore.get(agentId, triggerId) : undefined;
      if (record?.type !== "manual") continue;
      options.push({
        nodeId: n.id,
        name: record.name,
        agentName: AGENTS.find(a => a.id === agentId)?.name ?? "Agent",
        instructions: record.config.manual?.instructions,
      });
    }
    return options;
  }, [triggerNodes, triggerAgentIds]);

  const handleManualRunStart = (nodeId: string, message: string) => {
    setManualRunOpen(false);
    setManualRunActive(true);
    setManualRunMessage(message || null);
    runStartedAtRef.current = Date.now();
    runTrace.start(nodeId);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "Escape") {
        if (triggerMenuOpen) setTriggerMenuOpen(false);
        else if (escalationPickerNodeId) setEscalationPickerNodeId(null);
        else if (personPickerNodeId) setPersonPickerNodeId(null);
        else if (configuringId) setConfiguringId(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (isTyping) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const selNode = nodes.find(n => n.selected);
        const selEdge = edges.find(ed => ed.selected);
        if (selNode) { e.preventDefault(); setDeleteNodeId(selNode.id); }
        else if (selEdge?.data?.conditionId) { e.preventDefault(); setDeleteNodeId(selEdge.data.conditionId); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, configuringId, personPickerNodeId, escalationPickerNodeId, triggerMenuOpen, name]);

  const onConfigureNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.data.kind === "note") return;
    snapshot();
    setConfiguringId(nodeId);
  };

  const nodeActions: WorkforceNodeActions = {
    onDelete: id2 => setDeleteNodeId(id2),
    onNoteTextChange: (id2, text) => setNodes(ns => ns.map(n => (n.id === id2 ? { ...n, data: { ...n.data, text } } : n))),
    unreachableNodeIds,
    triggerAgentIds,
    runTrace: runTrace.highlight,
  };

  const saveStateText =
    saveState === "saving" ? "Đang lưu..." :
    saveState === "dirty" ? "Chưa lưu" :
    lastSavedAt ? `Đã lưu lúc ${new Date(lastSavedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` :
    "Đã lưu";

  const configuringNode = configuringId ? nodes.find(n => n.id === configuringId) ?? null : null;

  return (
    <div className="wf-slate flex flex-col h-full">
      {/* Single-row header (h-14, 56px), matching the Agent page's own top bar exactly — back
          nav + editable name on the left, a centered tab bar in the same slot Agent's own
          Build/Test/Channels/Insights occupies (S-gap-8: "Lịch sử chạy" is the run-history tab
          this now lives at), status/save-state + run/Save/Publish actions on the right. Replaces
          the earlier two-tier 96px header — every config drawer's `top-14` (see e.g.
          OmniConfigDrawer) is hand-matched to this exact height. */}
      <div
        className="flex items-center h-14 px-[18px] gap-3 shrink-0 [font-family:var(--wf-font-display)]"
        style={{ background: "var(--wf-surface)", borderBottom: "1px solid var(--wf-border)" }}
      >
        <button
          onClick={() => navigate("/workforce")}
          className="flex items-center gap-1.5 text-[13px] font-semibold shrink-0 transition-base hover:opacity-80"
          style={{ color: "var(--wf-muted)" }}
        >
          <ChevronLeft size={14} /> Workforce
        </button>
        <span style={{ color: "var(--wf-border)" }}>/</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => workforceStore.rename(id, name.trim() || "Untitled workforce")}
          className="bg-transparent outline-none font-extrabold min-w-0 px-1.5 py-1 rounded transition-base text-[14.5px] hover:bg-[var(--wf-bg)] focus:bg-[var(--wf-bg)]"
          style={{ color: "var(--wf-text)", width: `${Math.max(name.length, 6) + 1}ch` }}
        />

        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {([
              { id: "canvas" as const, label: "Canvas", Icon: Workflow },
              { id: "history" as const, label: "Lịch sử chạy", Icon: History },
            ]).map(({ id: tabId, label, Icon }) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className="h-8 px-3 rounded-[var(--wf-radius-sm)] text-[13px] font-bold flex items-center gap-2 transition-base"
                style={activeTab === tabId
                  ? { background: "var(--wf-accent-bg)", color: "var(--wf-accent)" }
                  : { background: "transparent", color: "var(--wf-muted)" }}
              >
                <Icon size={15} /> {label}
                {tabId === "history" && runs.length > 0 && (
                  <span
                    className="text-[10.5px] font-bold tabular-nums rounded-full px-1.5 py-px"
                    style={activeTab === tabId ? { background: "var(--wf-surface)", color: "var(--wf-accent)" } : { background: "var(--wf-bg)", color: "var(--wf-muted)" }}
                  >
                    {runs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <span className={`wf-pill shrink-0 ${status === "published" ? "" : "muted"}`}>
          {status === "published" ? "Published" : "Draft"}
        </span>
        <span className="text-[12px] shrink-0" style={{ color: "var(--wf-muted)" }}>{saveStateText}</span>
        <div className="relative shrink-0">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span>
                <button
                  onClick={handleTestRun}
                  disabled={runActive || triggerNodes.length === 0}
                  className="wf-btn-sec flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Play size={13} fill="currentColor" /> Chạy thử {triggerNodes.length > 1 && <ChevronDown size={12} />}
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {triggerNodes.length === 0 ? "Cần ít nhất một Trigger trên canvas" : "Mô phỏng luồng chạy trên canvas"}
            </TooltipContent>
          </Tooltip>
          {triggerMenuOpen && (
            <>
            <div className="fixed inset-0 z-20" onClick={() => setTriggerMenuOpen(false)} />
            <div
              className="absolute right-0 top-[calc(100%+6px)] w-[240px] py-1.5 z-30 animate-fade-up"
              style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)", borderRadius: "var(--wf-radius-sm)", boxShadow: "var(--wf-node-shadow-selected)" }}
            >
              <p className="px-3 pb-1 text-[11px] font-semibold" style={{ color: "var(--wf-muted)" }}>Chạy thử từ Trigger nào?</p>
              {triggerNodes.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setManualRunActive(false); runStartedAtRef.current = Date.now(); runTrace.start(t.id); setTriggerMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-[12.5px] min-h-[44px] flex items-center transition-base hover:bg-[var(--wf-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ color: "var(--wf-text)" }}
                >
                  {describeRunNode(t.id)}
                </button>
              ))}
            </div>
            </>
          )}
        </div>
        {status === "published" && manualTriggerOptions.length > 0 && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span>
                <button
                  onClick={() => setManualRunOpen(true)}
                  disabled={runActive}
                  className="wf-btn-sec flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  <MessageSquare size={13} /> Chạy Workforce
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bắt đầu một lượt chạy thật, bằng cách gõ yêu cầu — giống người dùng thật sẽ làm</TooltipContent>
          </Tooltip>
        )}
        <button onClick={handleSave} className="wf-btn-sec shrink-0">Save</button>
        <button onClick={handlePublish} className="wf-btn-pri shrink-0">Publish</button>
      </div>

      <div className="flex-1 relative flex overflow-hidden">
        {activeTab === "history" ? (
          <RunHistoryTab workforceId={id} runs={runs} />
        ) : (
        <>
        <ReactFlowProvider>
          <Canvas
            nodes={nodes as any}
            edges={edges}
            setNodes={setNodes as any}
            onNodesChange={onNodesChange}
            setEdges={setEdges}
            onEdgesChange={onEdgesChange}
            rfInstance={rfInstance}
            setRfInstance={setRfInstance}
            nodeActions={nodeActions}
            onConfigureNode={onConfigureNode}
            toast={(msg: string) => toast.success(msg)}
            onBeforeMutate={snapshot}
            locked={locked}
          />
        </ReactFlowProvider>

        <GettingStartedChecklist nodes={nodes as any} edges={edges} name={name} status={status} />

        {runActive && (
          <RunTracePanel
            nodes={nodes as any}
            state={runTrace.state}
            describeNode={describeRunNode}
            describeMember={memberId => members.find(m => m.id === memberId)?.name ?? "Người duyệt"}
            onChoose={runTrace.choose}
            onResolveApproval={runTrace.resolveApproval}
            onStop={runTrace.stop}
            onRestart={() => { runStartedAtRef.current = Date.now(); runTrace.start(runTrace.state.steps[0]); }}
            onClose={() => { runTrace.reset(); setManualRunActive(false); setManualRunMessage(null); }}
            mode={manualRunActive ? "manual" : "test"}
            contextMessage={manualRunMessage}
          />
        )}

        {/* One unified control rail — zoom, fit, lock, undo/redo, tidy layout — instead of
            scattering these across separate floating widgets in different corners. Sits above
            the bottom palette bar (a full-width dock, not a floating pill) so the two never
            overlap. rounded-lg (8px), matching --wf-radius-sm, not the softer rounded-xl this
            used before — keeps every floating control on the same small-radius, "solid" system
            as the rest of the canvas chrome. */}
        <div className="absolute bottom-[58px] left-4 z-10 flex flex-col gap-0.5 bg-white rounded-lg border border-border shadow-elev p-1">
          <RailButton label="Phóng to" shortcut={undefined} icon={<Plus size={16} />} onClick={() => rfInstance?.zoomIn({ duration: 150 })} />
          <RailButton label="Thu nhỏ" icon={<Minus size={16} />} onClick={() => rfInstance?.zoomOut({ duration: 150 })} />
          <RailButton label="Vừa khung hình" icon={<Maximize size={15} />} onClick={() => rfInstance?.fitView({ duration: 200, padding: 0.2 })} />
          <RailButton
            label={locked ? "Mở khóa canvas" : "Khóa canvas"}
            icon={locked ? <Lock size={15} /> : <LockOpen size={15} />}
            onClick={() => setLocked(v => !v)}
            active={locked}
          />
          <div className="h-px bg-border mx-1 my-0.5" />
          <RailButton label="Hoàn tác" shortcut="Ctrl+Z" icon={<Undo2 size={16} />} onClick={undo} disabled={historyRef.current.length === 0} />
          <RailButton label="Làm lại" shortcut="Ctrl+Shift+Z" icon={<Redo2 size={16} />} onClick={redo} disabled={futureRef.current.length === 0} />
          <div className="h-px bg-border mx-1 my-0.5" />
          <RailButton label="Sắp xếp lại canvas" icon={<LayoutGrid size={16} />} onClick={handleAutoArrange} disabled={nodes.length === 0} />
        </div>
        </>
        )}
      </div>

      <ManualRunDialog
        open={manualRunOpen}
        options={manualTriggerOptions}
        onStart={handleManualRunStart}
        onClose={() => setManualRunOpen(false)}
      />

      {personPickerNodeId && (
        <PersonPickerPopover
          open
          onClose={() => setPersonPickerNodeId(null)}
          onSelect={memberId => {
            setNodes(ns => ns.map(n => (n.id === personPickerNodeId ? { ...n, data: { ...n.data, memberId } } : n)));
            setPersonPickerNodeId(null);
            toast.success("Đã thêm người nhận vào Workforce");
          }}
        />
      )}

      {escalationPickerNodeId && (
        <PersonPickerPopover
          open
          onClose={() => setEscalationPickerNodeId(null)}
          onSelect={memberId => {
            setNodes(ns => ns.map(n => (n.id === escalationPickerNodeId ? { ...n, data: { ...n.data, escalation: { memberId } } } : n)));
            setEscalationPickerNodeId(null);
            toast.success("Đã đặt người thay thế khi quá hạn");
          }}
        />
      )}

      {approvalPickerConditionId && (
        <PersonPickerPopover
          open
          onClose={() => setApprovalPickerConditionId(null)}
          onSelect={memberId => {
            setNodes(ns => ns.map(n => (n.id === approvalPickerConditionId && n.data.kind === "condition"
              ? { ...n, data: { ...n.data, approval: { mode: n.data.approval?.mode ?? "required", assigneeId: memberId } } }
              : n)));
            setApprovalPickerConditionId(null);
            toast.success("Đã chọn người duyệt");
          }}
        />
      )}

      {configuringNode?.data.kind === "person" && (() => {
        const data = configuringNode.data;
        const member = members.find(m => m.id === data.memberId);
        const escalationMember = data.escalation ? members.find(m => m.id === data.escalation!.memberId) : undefined;
        return (
          <PersonConfigDrawer
            key={configuringNode.id}
            name={member?.name ?? "Chưa chọn người nhận"}
            email={member?.email ?? "—"}
            initials={member?.initials ?? "?"}
            taskKind={data.taskKind}
            onChangeTaskKind={value => {
              snapshot();
              // "notify" is a dead end (no source Handle) — any existing outgoing routes would
              // otherwise be left dangling from a node that can no longer draw new ones, so they
              // get cascade-removed as part of the same change rather than left orphaned.
              const conditionIds = value === "notify"
                ? new Set(edges.filter(e => e.source === configuringNode.id).map(e => e.data?.conditionId).filter(Boolean))
                : new Set();
              if (conditionIds.size > 0) {
                let n: any = nodes, e = edges;
                for (const cid of conditionIds) ({ nodes: n, edges: e } = removeRouteByConditionId(cid as string, n, e));
                setNodes(n.map((nn: any) => (nn.id === configuringNode.id ? { ...nn, data: { ...nn.data, taskKind: value } } : nn)));
                setEdges(e);
                toast(`Đã xoá ${conditionIds.size} route ra khỏi node — "Thông báo" không tiếp tục luồng`);
              } else {
                setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, taskKind: value } } : n)));
              }
            }}
            slaMinutes={data.slaMinutes}
            onChangeSla={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, slaMinutes: value, escalation: value == null ? null : data.escalation } } : n)))}
            escalationName={escalationMember?.name ?? null}
            escalationInitials={escalationMember?.initials ?? "?"}
            onChangeEscalation={() => setEscalationPickerNodeId(configuringNode.id)}
            onClearEscalation={() => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, escalation: null } } : n)))}
            onChangePerson={() => setPersonPickerNodeId(configuringNode.id)}
            onClose={() => setConfiguringId(null)}
            onDelete={() => setDeleteNodeId(configuringNode.id)}
          />
        );
      })()}

      {configuringNode?.data.kind === "omni" && (
        <OmniConfigDrawer
          key={configuringNode.id}
          reasonDefault={configuringNode.data.reasonDefault}
          onChange={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, reasonDefault: value } } : n)))}
          onClose={() => setConfiguringId(null)}
          onDelete={() => setDeleteNodeId(configuringNode.id)}
        />
      )}

      {configuringNode?.data.kind === "trigger" && (
        <TriggerConfigDrawer
          key={configuringNode.id}
          agentId={triggerAgentIds.get(configuringNode.id) ?? null}
          triggerId={configuringNode.data.triggerId}
          onSelectTrigger={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, triggerId: value } } : n)))}
          onClose={() => setConfiguringId(null)}
          onDelete={() => setDeleteNodeId(configuringNode.id)}
        />
      )}

      {configuringNode?.data.kind === "tool" && (
        <ToolConfigDrawer
          key={configuringNode.id}
          toolRef={configuringNode.data.ref}
          onSelect={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, ref: value } } : n)))}
          onClose={() => setConfiguringId(null)}
          onDelete={() => setDeleteNodeId(configuringNode.id)}
        />
      )}

      {configuringNode?.data.kind === "subprocess" && (
        <SubProcessConfigDrawer
          key={configuringNode.id}
          currentWorkforceId={id}
          workforceId={configuringNode.data.workforceId}
          onSelect={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, workforceId: value } } : n)))}
          onClose={() => setConfiguringId(null)}
          onDelete={() => setDeleteNodeId(configuringNode.id)}
        />
      )}

      {configuringNode?.data.kind === "agent" && (
        <AgentConfigDrawer
          key={configuringNode.id}
          agentId={configuringNode.data.agentId}
          isDestination={isDestinationNode(configuringNode.id, edges)}
          keepContext={configuringNode.data.keepContext}
          onChangeKeepContext={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, keepContext: value } } : n)))}
          onClose={() => setConfiguringId(null)}
          onDelete={() => setDeleteNodeId(configuringNode.id)}
        />
      )}

      {configuringNode?.data.kind === "condition" && (() => {
        const { source, destination } = getRouteEndpoints(configuringNode.id, nodes as any, edges);
        const sourceLabel =
          source?.data.kind === "agent" ? AGENTS.find(a => a.id === source.data.agentId)?.name ?? "Agent" :
          source?.data.kind === "person" ? members.find(m => m.id === source.data.memberId)?.name ?? "Người trong tổ chức" :
          source?.data.kind === "subprocess" ? (source.data.workforceId ? workforceStore.get(source.data.workforceId)?.name : undefined) ?? "Sub-process" :
          "—";
        const destinationKind: "agent" | "omni" | "person" = destination?.data.kind === "agent" || destination?.data.kind === "person"
          ? destination.data.kind
          : "omni";
        const destinationLabel = !destination ? "—" :
          destination.data.kind === "agent" ? AGENTS.find(a => a.id === destination.data.agentId)?.name ?? "Agent" :
          destination.data.kind === "omni" ? "Omni Supports" :
          destination.data.kind === "person" ? members.find(m => m.id === destination.data.memberId)?.name ?? "Người trong tổ chức" :
          destination.data.kind === "subprocess" ? (destination.data.workforceId ? workforceStore.get(destination.data.workforceId)?.name : undefined) ?? "Sub-process" : "—";
        const destAgentKeepContext = destination?.data.kind === "agent" ? destination.data.keepContext : undefined;
        const approvalAssignee = configuringNode.data.kind === "condition" && configuringNode.data.approval?.assigneeId
          ? members.find(m => m.id === configuringNode.data.approval!.assigneeId)
          : undefined;

        return (
          <ConditionDrawer
            key={configuringNode.id}
            sourceLabel={sourceLabel}
            destinationLabel={destinationLabel}
            destinationKind={destinationKind}
            data={configuringNode.data}
            onSave={updated => {
              setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: updated } : n)));
              setConfiguringId(null);
              toast.success("Đã lưu route");
            }}
            onClose={() => setConfiguringId(null)}
            onDelete={() => setDeleteNodeId(configuringNode.id)}
            keepContext={destAgentKeepContext}
            onChangeKeepContext={destination?.data.kind === "agent"
              ? (value => setNodes(ns => ns.map(n => (n.id === destination.id ? { ...n, data: { ...n.data, keepContext: value } } : n))))
              : undefined}
            assigneeName={approvalAssignee?.name ?? null}
            assigneeInitials={approvalAssignee?.initials}
            onPickAssignee={() => setApprovalPickerConditionId(configuringNode.id)}
          />
        );
      })()}

      <DeleteNodeDialog
        open={!!deleteNodeId}
        onOpenChange={v => !v && setDeleteNodeId(null)}
        onConfirm={() => {
          if (!deleteNodeId) return;
          snapshot();
          const target = nodes.find(n => n.id === deleteNodeId);
          const { nodes: n2, edges: e2 } = target?.data.kind === "condition"
            ? removeRouteByConditionId(deleteNodeId, nodes as any, edges)
            : removeNodeCascade(deleteNodeId, nodes as any, edges);
          setNodes(n2 as any);
          setEdges(e2);
          if (configuringId === deleteNodeId) setConfiguringId(null);
          setDeleteNodeId(null);
          toast.success("Đã xóa");
        }}
      />
    </div>
  );
}

function RailButton({ label, shortcut, icon, onClick, disabled, active }: {
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span>
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={`w-9 h-9 min-w-[44px] min-h-[44px] -m-[3.5px] rounded-lg flex items-center justify-center transition-base disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"
            }`}
          >
            {icon}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="left">{shortcut ? `${label} (${shortcut})` : label}</TooltipContent>
    </Tooltip>
  );
}
