import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance } from "reactflow";
import { AGENTS } from "@/components/configure/agentStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import Canvas from "@/components/workforce/Canvas";
import PersonPickerPopover from "@/components/workforce/PersonPickerPopover";
import OmniConfigDrawer from "@/components/workforce/OmniConfigDrawer";
import AgentConfigDrawer from "@/components/workforce/AgentConfigDrawer";
import ConditionDrawer from "@/components/workforce/ConditionDrawer";
import { DeleteNodeDialog, DeleteEdgeDialog } from "@/components/workforce/WorkforceDeleteDialogs";
import { workforceStore } from "@/components/workforce/workforceStore";
import { isConditionInvalid, type ConditionNodeData, type WorkforceNodeData, type WorkforceStatus } from "@/components/workforce/types";
import { removeNodeCascade, removeRouteByEdgeId, getRouteEndpoints, isDestinationNode } from "@/components/workforce/graphOps";
import type { WorkforceNodeActions } from "@/components/workforce/nodes/nodeActionsContext";

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

  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(wfRecord?.updatedAt ?? null);

  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [personEditTarget, setPersonEditTarget] = useState<string | null>(null);
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  const [deleteEdgeId, setDeleteEdgeId] = useState<string | null>(null);

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
        if (configuringId) setConfiguringId(null);
        else if (personEditTarget) setPersonEditTarget(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (isTyping) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const selNode = nodes.find(n => n.selected);
        const selEdge = edges.find(ed => ed.selected);
        if (selNode && selNode.data.kind !== "condition") { e.preventDefault(); setDeleteNodeId(selNode.id); }
        else if (selEdge) { e.preventDefault(); setDeleteEdgeId(selEdge.id); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, configuringId, personEditTarget, name]);

  const onConfigureNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.data.kind === "person") { setPersonEditTarget(nodeId); return; }
    if (node.data.kind === "note") return;
    setConfiguringId(nodeId);
  };

  const nodeActions: WorkforceNodeActions = {
    onConfigure: onConfigureNode,
    onDelete: id2 => setDeleteNodeId(id2),
    onDeleteEdge: id2 => setDeleteEdgeId(id2),
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
          />
        </ReactFlowProvider>
      </div>

      {personEditTarget && (
        <PersonPickerPopover
          open
          onClose={() => setPersonEditTarget(null)}
          onSelect={memberId => {
            setNodes(ns => ns.map(n => (n.id === personEditTarget ? { ...n, data: { ...n.data, memberId } } : n)));
            setPersonEditTarget(null);
            toast.success("Đã thêm người nhận vào Workforce");
          }}
        />
      )}

      {configuringNode?.data.kind === "omni" && (
        <OmniConfigDrawer
          reasonDefault={configuringNode.data.reasonDefault}
          onChange={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, reasonDefault: value } } : n)))}
          onClose={() => setConfiguringId(null)}
        />
      )}

      {configuringNode?.data.kind === "agent" && (
        <AgentConfigDrawer
          agentId={configuringNode.data.agentId}
          isDestination={isDestinationNode(configuringNode.id, edges)}
          keepContext={configuringNode.data.keepContext}
          onChangeKeepContext={value => setNodes(ns => ns.map(n => (n.id === configuringNode.id ? { ...n, data: { ...n.data, keepContext: value } } : n)))}
          onClose={() => setConfiguringId(null)}
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
          destination.data.kind === "person" ? members.find(m => m.id === destination.data.memberId)?.name ?? "Người trong Org" : "—";
        const destAgentKeepContext = destination?.data.kind === "agent" ? destination.data.keepContext : undefined;

        return (
          <ConditionDrawer
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
          const { nodes: n2, edges: e2 } = removeNodeCascade(deleteNodeId, nodes as any, edges);
          setNodes(n2 as any);
          setEdges(e2);
          if (configuringId === deleteNodeId) setConfiguringId(null);
          setDeleteNodeId(null);
          toast.success("Đã xóa");
        }}
      />

      <DeleteEdgeDialog
        open={!!deleteEdgeId}
        onOpenChange={v => !v && setDeleteEdgeId(null)}
        onConfirm={() => {
          if (!deleteEdgeId) return;
          const { nodes: n2, edges: e2 } = removeRouteByEdgeId(deleteEdgeId, nodes as any, edges);
          setNodes(n2 as any);
          setEdges(e2);
          setDeleteEdgeId(null);
          toast.success("Đã xóa");
        }}
      />
    </div>
  );
}
