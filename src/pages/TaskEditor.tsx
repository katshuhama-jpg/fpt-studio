import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronLeft, Save, Play, History, Rocket, Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance,
} from "reactflow";

import NodeLibrary from "@/components/tool-builder/NodeLibrary";
import Canvas from "@/components/tool-builder/Canvas";
import Inspector from "@/components/tool-builder/Inspector";
import TestDrawer from "@/components/tool-builder/TestDrawer";
import type { NodeData, ToolNode, ToolEdge } from "@/components/tool-builder/types";

const startTemplates: { id: string; name: string; desc: string; build: () => { nodes: ToolNode[]; edges: ToolEdge[] } }[] = [
  {
    id: "blank",
    name: "Blank canvas",
    desc: "Start from scratch with a single trigger.",
    build: () => ({
      nodes: [{
        id: "n1", type: "flow", position: { x: 80, y: 180 },
        data: { kind: "trigger", label: "User intent", config: {} },
      }],
      edges: [],
    }),
  },
  {
    id: "lock-card",
    name: "Lock credit card",
    desc: "Verify customer → call lock API → reply.",
    build: () => ({
      nodes: [
        { id: "n1", type: "flow", position: { x: 40, y: 180 }, data: { kind: "trigger", label: "User asks to lock card", config: {} } },
        { id: "n2", type: "flow", position: { x: 280, y: 180 }, data: { kind: "http", label: "verify_customer", config: { method: "POST", url: "/tools/verify_customer" } } },
        { id: "n3", type: "flow", position: { x: 540, y: 80 }, data: { kind: "if", label: "Verified?", config: { condition: "prev.ok === true" } } },
        { id: "n4", type: "flow", position: { x: 800, y: 40 }, data: { kind: "http", label: "lock_card_api", config: { method: "POST" } } },
        { id: "n5", type: "flow", position: { x: 1060, y: 80 }, data: { kind: "llm", label: "Confirm to user", config: {} } },
        { id: "n6", type: "flow", position: { x: 800, y: 220 }, data: { kind: "output", label: "Escalate to agent", config: {} } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { strokeWidth: 2 } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { strokeWidth: 2 } },
        { id: "e3", source: "n3", target: "n4", animated: true, style: { strokeWidth: 2 } },
        { id: "e4", source: "n4", target: "n5", animated: true, style: { strokeWidth: 2 } },
        { id: "e5", source: "n3", target: "n6", animated: true, style: { strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: "kb-answer",
    name: "Knowledge Q&A",
    desc: "Lookup KB → compose with LLM → reply.",
    build: () => ({
      nodes: [
        { id: "n1", type: "flow", position: { x: 40, y: 180 }, data: { kind: "trigger", label: "User question", config: {} } },
        { id: "n2", type: "flow", position: { x: 300, y: 180 }, data: { kind: "knowledge", label: "Lookup KB", config: { topK: 4 } } },
        { id: "n3", type: "flow", position: { x: 580, y: 180 }, data: { kind: "llm", label: "Compose answer", config: {} } },
        { id: "n4", type: "flow", position: { x: 860, y: 180 }, data: { kind: "output", label: "Reply", config: {} } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { strokeWidth: 2 } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { strokeWidth: 2 } },
        { id: "e3", source: "n3", target: "n4", animated: true, style: { strokeWidth: 2 } },
      ],
    }),
  },
];

export default function TaskEditor() {
  const { id: agentId = "cskh", taskId = "lock-card" } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("Lock credit card");
  const [description, setDescription] = useState(
    "Verify customer identity, then call the lock_card_api tool to lock the user's card. Confirm with the customer.",
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState(false);

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedId) || null,
    [nodes, selectedId],
  );

  const updateNode = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const applyTemplate = (tplId: string) => {
    const t = startTemplates.find(s => s.id === tplId)!;
    const built = t.build();
    setNodes(built.nodes);
    setEdges(built.edges);
    setPickedTemplate(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar with breadcrumbs */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <button
          onClick={() => navigate(`/agents/${agentId}?tab=develop&section=task`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          <ChevronLeft size={15} /> Back to agent
        </button>
        <div className="w-px h-5 bg-border" />
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Link to="/agents" className="text-muted-foreground hover:text-foreground">Agents</Link>
          <span className="text-muted-foreground">/</span>
          <Link to={`/agents/${agentId}`} className="text-muted-foreground hover:text-foreground">Banking ABC</Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Tasks</span>
          <span className="text-muted-foreground">/</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-transparent outline-none font-medium text-foreground min-w-0 px-1.5 py-0.5 rounded hover:bg-surface-muted focus:bg-surface-muted transition-base"
          />
          <span className="chip">Task · workflow</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost h-9">
            <History size={13} /> v3
          </button>
          <button
            onClick={() => setTestOpen(v => !v)}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              testOpen ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-surface-muted"
            }`}
          >
            <Play size={13} /> Test run
          </button>
          <button className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Save size={13} /> Save
          </button>
          <button className="btn-primary h-9">
            <Rocket size={13} /> Publish
          </button>
        </div>
      </div>

      {/* Body — full-bleed workflow canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodeLibrary />
        <ReactFlowProvider>
          <div className="flex-1 relative flex">
            {!pickedTemplate ? (
              <TemplatePicker onPick={applyTemplate} />
            ) : (
              <Canvas
                nodes={nodes as ToolNode[]}
                edges={edges}
                setNodes={setNodes}
                onNodesChange={onNodesChange}
                setEdges={setEdges}
                onEdgesChange={onEdgesChange}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                rfInstance={rfInstance}
                setRfInstance={setRfInstance}
              />
            )}
            <TestDrawer
              open={testOpen}
              onClose={() => setTestOpen(false)}
              nodes={nodes as ToolNode[]}
              edges={edges}
            />
          </div>
        </ReactFlowProvider>
        <Inspector node={selectedNode as ToolNode | null} onChange={updateNode} onDelete={deleteNode} />
      </div>

      {/* Description footer */}
      <div className="h-10 border-t border-border bg-surface px-4 flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
        <input
          className="bg-transparent outline-none flex-1 text-[12px] placeholder:text-muted-foreground"
          placeholder="Describe what this task does so the agent knows when to run it."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Sparkles size={10} /> tip: describe the user intent and outcome
        </span>
      </div>
    </div>
  );
}

function TemplatePicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-soft p-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
            <Sparkles size={20} />
          </div>
          <h2 className="font-display text-xl font-semibold mb-1">Start your task workflow</h2>
          <p className="text-sm text-muted-foreground">
            Pick a starting point. Drag nodes from the left to build a flow like in n8n / Dify.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {startTemplates.map(t => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="text-left p-4 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-soft transition-base"
            >
              <div className="font-display font-semibold text-sm mb-1">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
