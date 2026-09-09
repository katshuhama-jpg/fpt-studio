import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background, BackgroundVariant,
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
import { WF_DOT_COLOR } from "./slateTheme";
import type { WorkforceNode, WorkforceEdge } from "./types";

const nodeTypes = { agent: AgentNode, omni: OmniNode, person: PersonNode, condition: ConditionNode, note: NoteNode };
const edgeTypes = { deletable: DeletableEdge };

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
  locked: boolean;
}

export default function Canvas({
  nodes, edges, setNodes, onNodesChange, setEdges, onEdgesChange, rfInstance, setRfInstance, nodeActions, onConfigureNode, toast, onBeforeMutate, locked,
}: CanvasProps) {
  const [agentPicker, setAgentPicker] = useState<{ position: XYPosition; connectFrom?: string } | null>(null);
  const [personPicker, setPersonPicker] = useState<{ position: XYPosition; connectFrom?: string } | null>(null);
  const [destTypePopup, setDestTypePopup] = useState<{ screen: { x: number; y: number }; flow: XYPosition; sourceId: string } | null>(null);

  const connectStartRef = useRef<{ nodeId: string | null }>({ nodeId: null });
  const connectionMadeRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastAddedPositionRef = useRef<XYPosition | null>(null);

  // Shared by both drag-drop and click-to-add: viewport center when the canvas is empty (or a
  // click has no prior node to offset from), otherwise a small down-right offset from the last
  // node added, so repeated clicks fan out instead of stacking exactly on top of each other.
  const CLICK_ADD_OFFSET = 48;
  const getClickAddPosition = useCallback((): XYPosition => {
    if (lastAddedPositionRef.current && nodes.length > 0) {
      return { x: lastAddedPositionRef.current.x + CLICK_ADD_OFFSET, y: lastAddedPositionRef.current.y + CLICK_ADD_OFFSET };
    }
    if (rfInstance && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      return rfInstance.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    return { x: 200, y: 200 };
  }, [rfInstance, nodes.length]);

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

  // The one place that actually places a fresh, unconnected node from the palette — shared by
  // drag-drop (position = drop point) and click-to-add (position = computed default), so both
  // entry points are fully equivalent rather than click being a second, parallel flow.
  const addFromPalette = useCallback((type: PaletteItemType, position: XYPosition) => {
    if (type === "agent") {
      setAgentPicker({ position });
    } else if (type === "omni") {
      onBeforeMutate();
      const node = createOmniNode(position);
      setNodes(ns => ns.concat(node));
      lastAddedPositionRef.current = position;
      toast("Đã thêm Omni Supports vào Workforce");
    } else if (type === "person") {
      setPersonPicker({ position });
    } else if (type === "note") {
      onBeforeMutate();
      setNodes(ns => ns.concat(createNoteNode(position)));
      lastAddedPositionRef.current = position;
    }
  }, [setNodes, toast, onBeforeMutate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!rfInstance) return;
    const type = e.dataTransfer.getData(WORKFORCE_DRAG_MIME) as PaletteItemType;
    if (!type) return;
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addFromPalette(type, position);
  }, [rfInstance, addFromPalette]);

  const onPaletteItemClick = useCallback((type: PaletteItemType) => {
    addFromPalette(type, getClickAddPosition());
  }, [addFromPalette, getClickAddPosition]);

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
      lastAddedPositionRef.current = destPos;
      toast("Đã thêm Agent đích vào Workforce");
    } else {
      setNodes(ns => ns.concat(createAgentNode(agentId, agentPicker.position, true)));
      lastAddedPositionRef.current = agentPicker.position;
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
      lastAddedPositionRef.current = destPos;
    } else {
      setNodes(ns => ns.concat(createPersonNode(memberId, personPicker.position)));
      lastAddedPositionRef.current = personPicker.position;
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
      lastAddedPositionRef.current = flow;
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
    <div ref={wrapperRef} className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
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
          nodesDraggable={!locked}
          nodesConnectable={!locked}
          elementsSelectable={!locked}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={WF_DOT_COLOR} className="![background-color:var(--wf-bg)]" />
        </ReactFlow>
      </WorkforceNodeActionsContext.Provider>

      <Palette onItemClick={onPaletteItemClick} />

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
