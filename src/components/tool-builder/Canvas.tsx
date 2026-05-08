import { useCallback } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Node, type Edge, type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import FlowNode from "./nodes/FlowNode";
import { specByKind } from "./NodeLibrary";
import type { NodeData, NodeKind, ToolNode, ToolEdge } from "./types";

const nodeTypes = { flow: FlowNode };

interface CanvasProps {
  nodes: ToolNode[];
  edges: ToolEdge[];
  setNodes: ReturnType<typeof useNodesState<NodeData>>[1];
  onNodesChange: ReturnType<typeof useNodesState<NodeData>>[2];
  setEdges: ReturnType<typeof useEdgesState>[1];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  rfInstance: ReactFlowInstance | null;
  setRfInstance: (i: ReactFlowInstance) => void;
}

export default function Canvas({
  nodes, edges, setNodes, onNodesChange, setEdges, onEdgesChange,
  selectedId, setSelectedId, rfInstance, setRfInstance,
}: CanvasProps) {
  const onConnect = useCallback(
    (c: Connection) => setEdges(eds => addEdge({ ...c, animated: true, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-tool-node") as NodeKind;
    if (!kind || !rfInstance) return;
    const spec = specByKind(kind);
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = `${kind}-${Date.now()}`;
    const newNode: ToolNode = {
      id,
      type: "flow",
      position,
      data: { kind, label: spec.label, config: {} },
    };
    setNodes(ns => ns.concat(newNode));
    setSelectedId(id);
  }, [rfInstance, setNodes, setSelectedId]);

  return (
    <div className="flex-1 h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes.map(n => ({ ...n, selected: n.id === selectedId }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onNodeClick={(_, n) => setSelectedId(n.id)}
        onPaneClick={() => setSelectedId(null)}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} className="!bg-gradient-soft" />
        <Controls className="!shadow-soft !border !border-border !rounded-lg overflow-hidden" />
        <MiniMap pannable zoomable className="!border !border-border !rounded-lg" />
      </ReactFlow>
    </div>
  );
}
