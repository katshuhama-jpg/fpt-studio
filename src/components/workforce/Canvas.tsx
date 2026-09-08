import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Connection, type Edge, type ReactFlowInstance, type OnConnectStartParams, type XYPosition,
} from "reactflow";
import "reactflow/dist/style.css";
import AgentNode from "./nodes/AgentNode";
import OmniNode from "./nodes/OmniNode";
import PersonNode from "./nodes/PersonNode";
import ConditionNode from "./nodes/ConditionNode";
import NoteNode from "./nodes/NoteNode";
import DeletableEdge from "./edges/DeletableEdge";
import Palette, { WORKFORCE_DRAG_MIME, type PaletteItemType } from "./Palette";
import AgentPickerPopover from "./AgentPickerPopover";
import PersonPickerPopover from "./PersonPickerPopover";
import DestinationTypePopup from "./DestinationTypePopup";
import { WorkforceNodeActionsContext, type WorkforceNodeActions } from "./nodes/nodeActionsContext";
import { createAgentNode, createOmniNode, createPersonNode, createNoteNode, createRoute } from "./graphOps";
import type { WorkforceNode, WorkforceEdge, WorkforceNodeData } from "./types";

const nodeTypes = { agent: AgentNode, omni: OmniNode, person: PersonNode, condition: ConditionNode, note: NoteNode };
const edgeTypes = { deletable: DeletableEdge };

// Reactflow's MiniMap defaults every node to the same flat gray block, which — stacked the way
// this canvas's nodes are — reads as a stuck loading skeleton rather than an actual map. Color
// each block to match its node type's own accent so it's unmistakably a real minimap.
const MINIMAP_NODE_COLOR: Record<WorkforceNodeData["kind"], string> = {
  agent: "hsl(var(--primary))",
  omni: "hsl(var(--accent))",
  person: "hsl(var(--primary))",
  condition: "hsl(var(--primary) / 0.5)",
  note: "hsl(var(--warning))",
};

interface CanvasProps {
  nodes: WorkforceNode[];
  edges: WorkforceEdge[];
  setNodes: ReturnType<typeof useNodesState<any>>[1];
  onNodesChange: ReturnType<typeof useNodesState<any>>[2];
  setEdges: ReturnType<typeof useEdgesState>[1];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  rfInstance: ReactFlowInstance | null;
  setRfInstance: (i: ReactFlowInstance) => void;
  nodeActions: WorkforceNodeActions;
  onConfigureNode: (id: string) => void;
  toast: (message: string) => void;
  onBeforeMutate: () => void;
}

export default function Canvas({
  nodes, edges, setNodes, onNodesChange, setEdges, onEdgesChange, rfInstance, setRfInstance, nodeActions, onConfigureNode, toast, onBeforeMutate,
}: CanvasProps) {
  const [agentPicker, setAgentPicker] = useState<{ position: XYPosition; connectFrom?: string } | null>(null);
  const [personPicker, setPersonPicker] = useState<{ position: XYPosition; connectFrom?: string } | null>(null);
  const [destTypePopup, setDestTypePopup] = useState<{ screen: { x: number; y: number }; flow: XYPosition; sourceId: string } | null>(null);

  const connectStartRef = useRef<{ nodeId: string | null }>({ nodeId: null });
  const connectionMadeRef = useRef(false);

  const findNode = (id: string) => nodes.find(n => n.id === id);

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    const source = findNode(connection.source);
    const target = findNode(connection.target);
    if (!source || !target) return false;
    if (source.data.kind !== "agent") return false;
    if (target.data.kind === "condition" || target.data.kind === "note") return false;
    if (target.data.kind === "agent" && source.data.kind === "agent" && source.data.agentId === target.data.agentId) return false;
    return true;
  }, [nodes]);

  const onConnect = useCallback((connection: Connection) => {
    connectionMadeRef.current = true;
    if (!connection.source || !connection.target) return;
    const source = findNode(connection.source);
    const target = findNode(connection.target);
    if (!source || !target) return;
    onBeforeMutate();
    const { condition, edges: newEdges } = createRoute(source.id, target.position, source.position, target.id);
    setNodes(ns => ns.concat(condition));
    setEdges(es => es.concat(newEdges));
    toast("Đã thêm Agent đích vào Workforce");
  }, [nodes, setNodes, setEdges, toast, onBeforeMutate]);

  const onConnectStart = useCallback((_: any, params: OnConnectStartParams) => {
    connectionMadeRef.current = false;
    connectStartRef.current = { nodeId: params.nodeId };
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (connectionMadeRef.current) return;
    const sourceId = connectStartRef.current.nodeId;
    if (!sourceId) return;
    const sourceNode = findNode(sourceId);
    if (!sourceNode || sourceNode.data.kind !== "agent") return;
    const target = event.target as HTMLElement;
    if (!target.classList.contains("react-flow__pane")) return;
    const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : (event as MouseEvent).clientX;
    const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : (event as MouseEvent).clientY;
    if (!rfInstance) return;
    const flow = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });
    setDestTypePopup({ screen: { x: clientX, y: clientY }, flow, sourceId });
  }, [rfInstance, nodes]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!rfInstance) return;
    const type = e.dataTransfer.getData(WORKFORCE_DRAG_MIME) as PaletteItemType;
    if (!type) return;
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

    if (type === "agent") {
      setAgentPicker({ position });
    } else if (type === "omni") {
      onBeforeMutate();
      const node = createOmniNode(position);
      setNodes(ns => ns.concat(node));
      toast("Đã thêm Omni Supports vào Workforce");
    } else if (type === "person") {
      setPersonPicker({ position });
    } else if (type === "note") {
      onBeforeMutate();
      setNodes(ns => ns.concat(createNoteNode(position)));
    }
  }, [rfInstance, setNodes, toast, onBeforeMutate]);

  const finishAgentPick = (agentId: string) => {
    if (!agentPicker) return;
    onBeforeMutate();
    if (agentPicker.connectFrom) {
      const source = findNode(agentPicker.connectFrom);
      const destPos: XYPosition = { x: agentPicker.position.x + 260, y: agentPicker.position.y };
      const destNode = createAgentNode(agentId, destPos, true);
      const { condition, edges: newEdges } = createRoute(agentPicker.connectFrom, destPos, source?.position ?? agentPicker.position, destNode.id);
      setNodes(ns => ns.concat(condition, destNode));
      setEdges(es => es.concat(newEdges));
      toast("Đã thêm Agent đích vào Workforce");
    } else {
      setNodes(ns => ns.concat(createAgentNode(agentId, agentPicker.position, true)));
      toast("Đã thêm Agent vào Workforce");
    }
    setAgentPicker(null);
  };

  const finishPersonPick = (memberId: string) => {
    if (!personPicker) return;
    onBeforeMutate();
    if (personPicker.connectFrom) {
      const source = findNode(personPicker.connectFrom);
      const destPos: XYPosition = { x: personPicker.position.x + 260, y: personPicker.position.y };
      const destNode = createPersonNode(memberId, destPos);
      const { condition, edges: newEdges } = createRoute(personPicker.connectFrom, destPos, source?.position ?? personPicker.position, destNode.id);
      setNodes(ns => ns.concat(condition, destNode));
      setEdges(es => es.concat(newEdges));
    } else {
      setNodes(ns => ns.concat(createPersonNode(memberId, personPicker.position)));
    }
    toast("Đã thêm người nhận vào Workforce");
    setPersonPicker(null);
  };

  const pickDestinationType = (type: Exclude<PaletteItemType, "note">) => {
    if (!destTypePopup) return;
    const { flow, sourceId } = destTypePopup;
    setDestTypePopup(null);
    if (type === "agent") {
      setAgentPicker({ position: flow, connectFrom: sourceId });
    } else if (type === "person") {
      setPersonPicker({ position: flow, connectFrom: sourceId });
    } else {
      onBeforeMutate();
      const source = findNode(sourceId);
      const destNode = createOmniNode(flow);
      const { condition, edges: newEdges } = createRoute(sourceId, flow, source?.position ?? flow, destNode.id);
      setNodes(ns => ns.concat(condition, destNode));
      setEdges(es => es.concat(newEdges));
      toast("Đã thêm Omni Supports vào Workforce");
    }
  };

  const excludeAgentId = agentPicker?.connectFrom
    ? (findNode(agentPicker.connectFrom)?.data as any)?.agentId
    : undefined;

  // Single click on a node — or on the connection line itself — opens that item's config
  // drawer immediately (matching the reference canvas: no double-click, no menu step first).
  const onNodeClick = useCallback((_: React.MouseEvent, node: WorkforceNode) => {
    onConfigureNode(node.id);
  }, [onConfigureNode]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const conditionId = edge.data?.conditionId;
    if (conditionId) onConfigureNode(conditionId);
  }, [onConfigureNode]);

  return (
    <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
      <WorkforceNodeActionsContext.Provider value={nodeActions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDragStart={onBeforeMutate}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={null}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} className="!bg-gradient-soft" />
          <Controls className="!shadow-soft !border !border-border !rounded-lg overflow-hidden" position="bottom-right" />
          <MiniMap
            pannable
            zoomable
            position="top-right"
            className="!border !border-border !rounded-lg"
            maskColor="hsl(var(--foreground) / 0.06)"
            nodeColor={n => MINIMAP_NODE_COLOR[(n.data as WorkforceNode["data"] | undefined)?.kind ?? "note"]}
            nodeStrokeWidth={0}
          />
        </ReactFlow>
      </WorkforceNodeActionsContext.Provider>

      <Palette />

      <AgentPickerPopover
        open={!!agentPicker}
        excludeAgentId={excludeAgentId}
        onClose={() => setAgentPicker(null)}
        onSelect={finishAgentPick}
      />
      <PersonPickerPopover
        open={!!personPicker}
        onClose={() => setPersonPicker(null)}
        onSelect={finishPersonPick}
      />
      {destTypePopup && (
        <DestinationTypePopup
          x={destTypePopup.screen.x}
          y={destTypePopup.screen.y}
          onPick={pickDestinationType}
          onDismiss={() => setDestTypePopup(null)}
        />
      )}
    </div>
  );
}
