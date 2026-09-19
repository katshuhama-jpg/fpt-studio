import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Undo2, Redo2, LayoutGrid, Plus, Minus, Maximize, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance } from "reactflow";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AGENTS } from "@/components/configure/agentStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import Canvas from "@/components/workforce/Canvas";
import PersonPickerPopover from "@/components/workforce/PersonPickerPopover";
import PersonConfigDrawer from "@/components/workforce/PersonConfigDrawer";
import OmniConfigDrawer from "@/components/workforce/OmniConfigDrawer";
import TriggerConfigDrawer from "@/components/workforce/TriggerConfigDrawer";
import ToolConfigDrawer from "@/components/workforce/ToolConfigDrawer";
import AgentConfigDrawer from "@/components/workforce/AgentConfigDrawer";
import ConditionDrawer from "@/components/workforce/ConditionDrawer";
import GettingStartedChecklist from "@/components/workforce/GettingStartedChecklist";
import { DeleteNodeDialog } from "@/components/workforce/WorkforceDeleteDialogs";
import { workforceStore } from "@/components/workforce/workforceStore";
import { isConditionInvalid, type ConditionNodeData, type WorkforceNode, type WorkforceEdge, type WorkforceNodeData, type WorkforceStatus } from "@/components/workforce/types";
import { removeNodeCascade, removeRouteByConditionId, getRouteEndpoints, isDestinationNode, autoArrange, getNodesUnreachableFromTrigger } from "@/components/workforce/graphOps";
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
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);

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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "Escape") {
        if (escalationPickerNodeId) setEscalationPickerNodeId(null);
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
  }, [nodes, edges, configuringId, personPickerNodeId, escalationPickerNodeId, name]);

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
  };

  const saveStateText =
    saveState === "saving" ? "Đang lưu..." :
    saveState === "dirty" ? "Chưa lưu" :
    lastSavedAt ? `Đã lưu lúc ${new Date(lastSavedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` :
    "Đã lưu";

  const configuringNode = configuringId ? nodes.find(n => n.id === configuringId) ?? null : null;

  return (
    <div className="wf-slate flex flex-col h-full">
      {/* Two-tier header, echoing the Relevance AI reference canvas: a thin utility row (back
          nav + status/save state + primary actions) sitting above a separate, much more
          prominent title row — instead of cramming breadcrumb, name, status and save-state onto
          one dense line. Same controls, same behavior, just given room to read as the page's
          actual title rather than a small piece of a breadcrumb. */}
      {/* Fixed h-10/h-14 rows (not intrinsic padding) so the total header height is an exact,
          known 96px (24 * 4px) — every config drawer's `top-24` (see e.g. OmniConfigDrawer) is
          hand-matched to this sum, same convention the old single-row header's `top-14` used. */}
      <div
        className="flex items-center h-10 px-[22px] gap-2.5 shrink-0 [font-family:var(--wf-font-display)]"
        style={{ background: "var(--wf-surface)", borderBottom: "1px solid var(--wf-border)" }}
      >
        <button
          onClick={() => navigate("/workforce")}
          className="flex items-center gap-1.5 text-[13px] shrink-0 transition-base hover:opacity-80"
          style={{ color: "var(--wf-muted)" }}
        >
          <ChevronLeft size={14} /> Workforce
        </button>
        <span className={`wf-pill ${status === "published" ? "" : "muted"}`}>
          {status === "published" ? "Published" : "Draft"}
        </span>
        <span className="text-[12px]" style={{ color: "var(--wf-muted)" }}>{saveStateText}</span>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          <button onClick={handleSave} className="wf-btn-sec">Save</button>
          <button onClick={handlePublish} className="wf-btn-pri">Publish</button>
        </div>
      </div>

      <div
        className="flex items-center h-14 px-[22px] shrink-0 [font-family:var(--wf-font-display)]"
        style={{ background: "var(--wf-surface)", borderBottom: "1px solid var(--wf-border)" }}
      >
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => workforceStore.rename(id, name.trim() || "Untitled workforce")}
          className="bg-transparent outline-none font-extrabold min-w-0 flex-1 px-1.5 py-1 rounded transition-base text-[22px] hover:bg-[var(--wf-bg)] focus:bg-[var(--wf-bg)]"
          style={{ color: "var(--wf-text)" }}
        />
      </div>

      <div className="flex-1 relative flex overflow-hidden">
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
      </div>

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
          "—";
        const destinationKind: "agent" | "omni" | "person" = destination?.data.kind === "agent" || destination?.data.kind === "person"
          ? destination.data.kind
          : "omni";
        const destinationLabel = !destination ? "—" :
          destination.data.kind === "agent" ? AGENTS.find(a => a.id === destination.data.agentId)?.name ?? "Agent" :
          destination.data.kind === "omni" ? "Omni Supports" :
          destination.data.kind === "person" ? members.find(m => m.id === destination.data.memberId)?.name ?? "Người trong tổ chức" : "—";
        const destAgentKeepContext = destination?.data.kind === "agent" ? destination.data.keepContext : undefined;

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
