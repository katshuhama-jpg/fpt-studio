import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Play, History, Rocket, Sparkles, CheckCircle2, RotateCcw, ChevronDown, Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance,
} from "reactflow";

import Canvas from "@/components/tool-builder/Canvas";
import type { NodeData, ToolNode, ToolEdge } from "@/components/tool-builder/types";
import { taskStore, type TaskRecord } from "@/components/tasks/taskStore";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import AddNodePopup from "@/components/task-editor/AddNodePopup";
import NodeDetailPanel from "@/components/task-editor/NodeDetailPanel";
import AssistantPanel from "@/components/task-editor/AssistantPanel";
import TestPanel from "@/components/task-editor/TestPanel";
import PublishDialog from "@/components/task-editor/PublishDialog";
import { blockByKind, type BlockSpec } from "@/components/task-editor/blockCatalog";

function defaultStartEnd(): { nodes: ToolNode[]; edges: ToolEdge[] } {
  return {
    nodes: [
      { id: "start", type: "flow", position: { x: 120, y: 200 }, data: { kind: "trigger", label: "Start", config: { variables: [] } } },
      { id: "end", type: "flow", position: { x: 560, y: 200 }, data: { kind: "output", label: "End", config: { outputs: [{ name: "final_answer", from: "" }] } } },
    ],
    edges: [
      { id: "e-start-end", source: "start", target: "end", animated: true, style: { strokeWidth: 2 } },
    ],
  };
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STORAGE_KEY = (a: string, t: string) => `task:${a}:${t}`;

export default function TaskEditor() {
  const { id: agentId = "cskh", taskId = "lock-card" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isViewMode = params.get("role") === "tester";

  const taskRecord = useMemo<TaskRecord | undefined>(
    () => taskStore.get(agentId, taskId),
    [agentId, taskId],
  );

  // Hydrate from localStorage if present
  const hydrated = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(agentId, taskId));
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  }, [agentId, taskId]);

  const [name, setName] = useState<string>(hydrated?.name ?? taskRecord?.name ?? "Untitled task");
  const [description, setDescription] = useState<string>(hydrated?.description ?? taskRecord?.purpose ?? "");
  const [history, setHistory] = useState(hydrated?.history ?? taskRecord?.history ?? [{ id: "v1", commit: "Initial", at: Date.now(), active: true }]);

  const initial = useMemo(() => {
    if (hydrated?.nodes && hydrated?.edges) return { nodes: hydrated.nodes, edges: hydrated.edges };
    return defaultStartEnd();
  }, [hydrated]);

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(!isViewMode);
  const [publishOpen, setPublishOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; commit: string } | null>(null);

  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const saveTimer = useRef<number | null>(null);

  // Autosave (debounced)
  useEffect(() => {
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY(agentId, taskId), JSON.stringify({
          name, description, history, nodes, edges,
        }));
      } catch { /* ignore */ }
      setSaveState("saved");
    }, 400);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [agentId, taskId, name, description, history, nodes, edges]);

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedId) || null,
    [nodes, selectedId],
  );

  // When user opens assistant, close detail; and vice versa
  const openAssistant = () => { setAssistantOpen(true); setSelectedId(null); };
  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (id) setAssistantOpen(false);
  };

  const updateNode = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const duplicateNode = useCallback((id: string) => {
    const src = nodes.find(n => n.id === id);
    if (!src) return;
    const newId = `${src.data.kind}-${Date.now()}`;
    setNodes(ns => ns.concat({
      ...src, id: newId,
      position: { x: src.position.x + 40, y: src.position.y + 40 },
      data: { ...src.data, label: `${src.data.label} (copy)` },
      selected: false,
    }));
    setSelectedId(newId);
  }, [nodes, setNodes]);

  const addBlock = (spec: BlockSpec) => {
    const id = `${spec.kind}-${Date.now()}`;
    const pos = rfInstance
      ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      : { x: 320, y: 240 };
    setNodes(ns => ns.concat({
      id, type: "flow", position: pos,
      data: { kind: spec.kind, label: spec.label, config: { ...spec.defaults } },
    }));
    setSelectedId(id);
  };

  const addToolNode = (tool: any) => {
    const block = blockByKind("tool_call")!;
    const id = `tool_call-${Date.now()}`;
    const pos = rfInstance ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) : { x: 320, y: 240 };
    setNodes(ns => ns.concat({
      id, type: "flow", position: pos,
      data: { kind: "tool_call", label: tool.name, config: { ...block.defaults, toolId: tool.id, toolName: tool.name } },
    }));
    setSelectedId(id);
  };

  const addTaskNode = (task: TaskRecord) => {
    const block = blockByKind("task_call")!;
    const id = `task_call-${Date.now()}`;
    const pos = rfInstance ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) : { x: 320, y: 240 };
    setNodes(ns => ns.concat({
      id, type: "flow", position: pos,
      data: { kind: "task_call", label: task.name, config: { ...block.defaults, taskId: task.id, taskName: task.name } },
    }));
    setSelectedId(id);
  };

  const doPublish = (vname: string, note: string) => {
    const now = Date.now();
    setHistory([
      { id: vname, commit: note || "Published", at: now, active: true },
      ...history.map((h: any) => ({ ...h, active: false })),
    ]);
  };

  const setGraph = (g: { nodes: ToolNode[]; edges: ToolEdge[] }) => {
    setNodes(g.nodes);
    setEdges(g.edges);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <button
          onClick={() => navigate(`/agents/${agentId}?tab=develop&section=task`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <div className="w-px h-5 bg-border" />
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Link to="/agents" className="text-muted-foreground hover:text-foreground">Agents</Link>
          <span className="text-muted-foreground">/</span>
          <Link to={`/agents/${agentId}?tab=develop&section=task`} className="text-muted-foreground hover:text-foreground">Tasks</Link>
          <span className="text-muted-foreground">/</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isViewMode}
            className="bg-transparent outline-none font-medium text-foreground min-w-0 px-1.5 py-0.5 rounded hover:bg-surface-muted focus:bg-surface-muted transition-base disabled:hover:bg-transparent"
          />
          <span className={`chip text-[10px] ${saveState === "saved" ? "chip-accent" : ""}`}>
            {saveState === "saved" ? <><CheckCircle2 size={10} /> Auto-saved</> : "Saving…"}
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={openAssistant}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              assistantOpen ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-surface-muted"
            }`}>
            <Sparkles size={13} /> Assistant
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5">
                <History size={13} /> {history.find((h: any) => h.active)?.id ?? "v1"} <ChevronDown size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-1">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Version history</div>
              {history.map((h: any) => (
                <DropdownMenuItem key={h.id} className="flex flex-col items-start gap-0.5 py-2 cursor-default" onSelect={(e) => e.preventDefault()}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-semibold">{h.id}</span>
                    {h.active ? (
                      <span className="chip chip-accent text-[9px]">Latest</span>
                    ) : (
                      <button className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        onClick={() => setRestoreTarget({ id: h.id, commit: h.commit })}>
                        <RotateCcw size={10} /> Restore
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate w-full">{h.commit}</span>
                  <span className="text-[10px] text-muted-foreground">{relativeTime(h.at)} · by you</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={() => { setTestOpen(true); setAssistantOpen(false); setSelectedId(null); }}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              testOpen ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-surface-muted"
            }`}>
            <Play size={13} /> Test
          </button>

          {!isViewMode && (
            <button onClick={() => setPublishOpen(true)} className="btn-primary h-9">
              <Rocket size={13} /> Publish
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        <ReactFlowProvider>
          <div className="flex-1 relative flex">
            <Canvas
              nodes={nodes as ToolNode[]}
              edges={edges}
              setNodes={setNodes}
              onNodesChange={onNodesChange}
              setEdges={setEdges}
              onEdgesChange={onEdgesChange}
              selectedId={selectedId}
              setSelectedId={handleSelect}
              rfInstance={rfInstance}
              setRfInstance={setRfInstance}
            />

            {!isViewMode && (
              <button
                onClick={() => setAddOpen(true)}
                className="absolute top-3 left-3 z-10 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 shadow-soft hover:bg-primary-strong"
              >
                <Plus size={14} /> Add node
              </button>
            )}
          </div>
        </ReactFlowProvider>

        {selectedNode && !isViewMode && (
          <NodeDetailPanel
            node={selectedNode as ToolNode}
            onChange={updateNode}
            onDelete={deleteNode}
            onDuplicate={duplicateNode}
            onClose={() => setSelectedId(null)}
          />
        )}

        <AssistantPanel
          open={assistantOpen && !selectedNode}
          onClose={() => setAssistantOpen(false)}
          nodes={nodes as ToolNode[]}
          edges={edges}
          setGraph={setGraph}
        />

        <TestPanel
          open={testOpen}
          onClose={() => setTestOpen(false)}
          nodes={nodes as ToolNode[]}
          edges={edges}
        />
      </div>

      {/* Description footer */}
      <div className="h-10 border-t border-border bg-surface px-4 flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Purpose</span>
        <input
          className="bg-transparent outline-none flex-1 text-[12px] placeholder:text-muted-foreground"
          placeholder="Expected outcome of executing this task"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={isViewMode}
        />
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Sparkles size={10} /> tip: describe the user intent and outcome
        </span>
      </div>

      <AddNodePopup
        open={addOpen}
        onClose={() => setAddOpen(false)}
        agentId={agentId}
        currentTaskId={taskId}
        onPickBlock={addBlock}
        onPickTool={addToolNode}
        onPickTask={addTaskNode}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        agentId={agentId}
        taskId={taskId}
        taskName={name}
        existingNames={history.map((h: any) => h.id)}
        defaultVersionName={`Version ${history.length + 1}`}
        onPublish={doPublish}
      />

      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {restoreTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Restoring this version will overwrite the current draft. Your unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (restoreTarget) {
                setHistory((h: any) => h.map((v: any) => ({ ...v, active: v.id === restoreTarget.id })));
                toast.success(`Restored to ${restoreTarget.id}`);
                setRestoreTarget(null);
              }
            }}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
