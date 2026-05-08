import { ChevronLeft, Play, Rocket, Save, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance } from "reactflow";

import NodeLibrary, { specByKind } from "@/components/tool-builder/NodeLibrary";
import Canvas from "@/components/tool-builder/Canvas";
import Inspector from "@/components/tool-builder/Inspector";
import TestDrawer from "@/components/tool-builder/TestDrawer";
import { toolStore, type NodeData, type ToolDefinition, type ToolNode } from "@/components/tool-builder/types";

const startTemplates: { id: string; name: string; desc: string; build: () => { nodes: ToolNode[]; edges: any[] } }[] = [
  {
    id: "blank",
    name: "Blank canvas",
    desc: "Start from scratch with a single trigger.",
    build: () => ({
      nodes: [{
        id: "n1", type: "flow", position: { x: 80, y: 160 },
        data: { kind: "trigger", label: "Agent call", config: {} },
      }],
      edges: [],
    }),
  },
  {
    id: "http",
    name: "HTTP API call",
    desc: "Trigger → HTTP request → Return.",
    build: () => ({
      nodes: [
        { id: "n1", type: "flow", position: { x: 60, y: 160 }, data: { kind: "trigger", label: "Agent call", config: {} } },
        { id: "n2", type: "flow", position: { x: 320, y: 160 }, data: { kind: "http", label: "Call API", config: { method: "GET" } } },
        { id: "n3", type: "flow", position: { x: 600, y: 160 }, data: { kind: "output", label: "Return", config: {} } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { strokeWidth: 2 } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { strokeWidth: 2 } },
      ],
    }),
  },
  {
    id: "ai",
    name: "AI workflow",
    desc: "Trigger → Knowledge → LLM → Return.",
    build: () => ({
      nodes: [
        { id: "n1", type: "flow", position: { x: 40, y: 180 }, data: { kind: "trigger", label: "Agent call", config: {} } },
        { id: "n2", type: "flow", position: { x: 280, y: 180 }, data: { kind: "knowledge", label: "Lookup KB", config: { topK: 4 } } },
        { id: "n3", type: "flow", position: { x: 540, y: 180 }, data: { kind: "llm", label: "Compose answer", config: {} } },
        { id: "n4", type: "flow", position: { x: 820, y: 180 }, data: { kind: "output", label: "Return", config: {} } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", animated: true, style: { strokeWidth: 2 } },
        { id: "e2", source: "n2", target: "n3", animated: true, style: { strokeWidth: 2 } },
        { id: "e3", source: "n3", target: "n4", animated: true, style: { strokeWidth: 2 } },
      ],
    }),
  },
];

export default function ToolBuilder() {
  const { id: agentId = "cskh", toolId } = useParams();
  const navigate = useNavigate();
  const isNew = !toolId || toolId === "new";

  const existing = !isNew ? toolStore.get(agentId, toolId!) : undefined;

  const [name, setName] = useState(existing?.name || "untitled_tool");
  const [description, setDescription] = useState(existing?.description || "");
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(existing?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(existing?.edges || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState(!isNew || (existing?.nodes.length ?? 0) > 0);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId) || null, [nodes, selectedId]);

  const updateNode = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const handleSave = () => {
    const id = isNew ? `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}` : toolId!;
    const def: ToolDefinition = {
      id, name, description, nodes, edges, updatedAt: Date.now(),
      status: "draft",
    };
    toolStore.save(agentId, def);
    navigate(`/agents/${agentId}?tab=develop&section=tool`);
  };

  const applyTemplate = (tplId: string) => {
    const t = startTemplates.find(s => s.id === tplId)!;
    const built = t.build();
    setNodes(built.nodes);
    setEdges(built.edges);
    setPickedTemplate(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Topbar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate(`/agents/${agentId}?tab=develop&section=tool`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base">
          <ChevronLeft size={15} /> Back to agent
        </button>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-md bg-accent-soft text-accent flex items-center justify-center text-xs font-bold">⚙</div>
          <input
            className="bg-transparent outline-none text-sm font-semibold min-w-0 flex-1 px-2 py-1 rounded hover:bg-surface-muted focus:bg-surface-muted transition-base"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <span className="chip">Tool · workflow</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestOpen(v => !v)}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              testOpen ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-surface-muted"
            }`}
          >
            <Play size={13} /> Test
          </button>
          <button onClick={handleSave} className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Save size={13} /> Save
          </button>
          <button onClick={handleSave} className="btn-primary h-9">
            <Rocket size={13} /> Publish
          </button>
        </div>
      </div>

      {/* Body */}
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
            <TestDrawer open={testOpen} onClose={() => setTestOpen(false)} nodes={nodes as ToolNode[]} edges={edges} />
          </div>
        </ReactFlowProvider>
        <Inspector node={selectedNode as ToolNode | null} onChange={updateNode} onDelete={deleteNode} />
      </div>

      {/* Description footer */}
      <div className="h-10 border-t border-border bg-surface px-4 flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
        <input
          className="bg-transparent outline-none flex-1 text-[12px] placeholder:text-muted-foreground"
          placeholder="Short description shown to the agent so it knows when to call this tool."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Sparkles size={10} /> tip: describe inputs/outputs clearly
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
          <h2 className="font-display text-xl font-semibold mb-1">Start your tool</h2>
          <p className="text-sm text-muted-foreground">Pick a starting point. You can fully customize the workflow afterwards.</p>
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
