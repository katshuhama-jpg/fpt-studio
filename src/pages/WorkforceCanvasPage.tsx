import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import AgentConfigDrawer from "@/components/workforce/AgentConfigDrawer";
import ConditionDrawer from "@/components/workforce/ConditionDrawer";
import GettingStartedChecklist from "@/components/workforce/GettingStartedChecklist";
import { DeleteNodeDialog } from "@/components/workforce/WorkforceDeleteDialogs";
import { workforceStore } from "@/components/workforce/workforceStore";
import { isConditionInvalid, type ConditionNodeData, type WorkforceNode, type WorkforceEdge, type WorkforceNodeData, type WorkforceStatus } from "@/components/workforce/types";
import { removeNodeCascade, removeRouteByConditionId, getRouteEndpoints, isDestinationNode, autoArrange } from "@/components/workforce/graphOps";
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
    workforceStore.publish(id);
    setStatus("published");
    toast.success("Publish Workforce thành công");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "Escape") {
        if (personPickerNodeId) setPersonPickerNodeId(null);
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
  }, [nodes, edges, configuringId, personPickerNodeId, name]);

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
  };

  const saveStateText =
    saveState === "saving" ? "Đang lưu..." :
    saveState === "dirty" ? "Chưa lưu" :
    lastSavedAt ? `Đã lưu lúc ${new Date(lastSavedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` :
    "Đã lưu";

  const configuringNode = configuringId ? nodes.find(n => n.id === configuringId) ?? null : null;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <button
          onClick={() => navigate("/workforce")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <div className="w-px h-5 bg-border" />
        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
          <Link to="/workforce" className="text-muted-foreground hover:text-foreground">Workforce</Link>
          <span className="text-muted-foreground">/</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => workforceStore.rename(id, name.trim() || "Untitled workforce")}
            className="bg-transparent outline-none font-medium text-foreground min-w-0 px-1.5 py-0.5 rounded hover:bg-surface-muted focus:bg-surface-muted transition-base"
          />
          <span className={`chip ${status === "published" ? "chip-success" : "chip-muted"}`}>
            {status === "published" ? "Published" : "Draft"}
          </span>
          <span className="text-xs text-muted-foreground">{saveStateText}</span>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleSave} className="btn-secondary h-9">Save</button>
          <button onClick={handlePublish} className="btn-primary h-9">Publish</button>
        </div>
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
            scattering these across separate floating widgets in different corners. */}
        <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-0.5 bg-white rounded-xl border border-border shadow-elev p-1">
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

      {configuringNode?.data.kind === "person" && (() => {
        const member = members.find(m => m.id === configuringNode.data.memberId);
        return (
          <PersonConfigDrawer
            key={configuringNode.id}
            name={member?.name ?? "Chưa chọn người nhận"}
            email={member?.email ?? "—"}
            initials={member?.initials ?? "?"}
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
        const sourceLabel = source?.data.kind === "agent" ? AGENTS.find(a => a.id === source.data.agentId)?.name ?? "Agent" : "—";
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
