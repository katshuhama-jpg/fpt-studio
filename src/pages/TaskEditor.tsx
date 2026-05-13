import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Save, Play, History, Rocket, Sparkles, AlertTriangle,
  CheckCircle2, X, RotateCcw, ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlowProvider, useNodesState, useEdgesState, type ReactFlowInstance,
} from "reactflow";

import NodeLibrary from "@/components/tool-builder/NodeLibrary";
import Canvas from "@/components/tool-builder/Canvas";
import Inspector from "@/components/tool-builder/Inspector";
import TestDrawer from "@/components/tool-builder/TestDrawer";
import type { NodeData, ToolNode, ToolEdge } from "@/components/tool-builder/types";
import { taskStore, type TaskRecord } from "@/components/tasks/taskStore";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

function defaultStartEnd(): { nodes: ToolNode[]; edges: ToolEdge[] } {
  return {
    nodes: [
      { id: "start", type: "flow", position: { x: 120, y: 200 }, data: { kind: "trigger", label: "Start", config: {} } },
      { id: "end", type: "flow", position: { x: 520, y: 200 }, data: { kind: "output", label: "End", config: {} } },
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
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Issue { nodeId: string; message: string; }

function computeIssues(nodes: ToolNode[], edges: ToolEdge[]): Issue[] {
  const out: Issue[] = [];
  const hasStart = nodes.some(n => n.data.kind === "trigger");
  const hasEnd = nodes.some(n => n.data.kind === "output");
  if (!hasStart) out.push({ nodeId: "_global", message: "Workflow is missing a Start node" });
  if (!hasEnd) out.push({ nodeId: "_global", message: "Workflow is missing an End node" });

  for (const n of nodes) {
    const cfg = n.data.config || {};
    if (n.data.kind === "http" && !cfg.url) out.push({ nodeId: n.id, message: `"${n.data.label}" is missing a URL` });
    if (n.data.kind === "if" && !cfg.condition) out.push({ nodeId: n.id, message: `"${n.data.label}" has no condition` });
    if (n.data.kind === "knowledge" && !cfg.topK) out.push({ nodeId: n.id, message: `"${n.data.label}" has no Top-K set` });

    const isolated = !edges.some(e => e.source === n.id || e.target === n.id);
    if (isolated && n.id !== "start" && n.id !== "end" && nodes.length > 1) {
      out.push({ nodeId: n.id, message: `"${n.data.label}" is not connected to any node` });
    }
  }
  return out;
}

export default function TaskEditor() {
  const { id: agentId = "cskh", taskId = "lock-card" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isViewMode = params.get("role") === "tester";

  const taskRecord = useMemo<TaskRecord | undefined>(
    () => taskStore.get(agentId, taskId),
    [agentId, taskId],
  );

  const [name, setName] = useState(taskRecord?.name ?? "Untitled task");
  const [description, setDescription] = useState(taskRecord?.purpose ?? "");
  const [status, setStatus] = useState<"Published" | "Unpublished">(taskRecord?.status ?? "Published");
  const [publishedAt, setPublishedAt] = useState<number | null>(taskRecord?.publishedAt ?? Date.now());
  const [history, setHistory] = useState(taskRecord?.history ?? [{ id: "v1", commit: "Initial", at: Date.now(), active: true }]);

  const initial = useMemo(defaultStartEnd, []);
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [testOpen, setTestOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; commit: string } | null>(null);

  // Mark as Unpublished whenever nodes/edges change after initial mount
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (dirty) setStatus("Unpublished");
  }, [dirty]);
  const wrapChange = (fn: any) => (...args: any[]) => { setDirty(true); fn(...args); };

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedId) || null,
    [nodes, selectedId],
  );

  const issues = useMemo(() => computeIssues(nodes as ToolNode[], edges), [nodes, edges]);
  const canPublish = issues.length === 0 && status === "Unpublished";

  const updateNode = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    setDirty(true);
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
    setDirty(true);
  }, [setNodes, setEdges]);

  const focusNode = (nodeId: string) => {
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return;
    setSelectedId(nodeId);
    rfInstance?.setCenter(n.position.x + 80, n.position.y + 40, { zoom: 1.1, duration: 400 });
  };

  const doPublish = () => {
    if (!commitMsg.trim()) {
      toast.error("Commit message is required");
      return;
    }
    taskStore.publish(agentId, taskId, commitMsg.trim());
    const now = Date.now();
    const nextNum = history.length + 1;
    setHistory([
      { id: `v${nextNum}`, commit: commitMsg.trim(), at: now, active: true },
      ...history.map(h => ({ ...h, active: false })),
    ]);
    setStatus("Published");
    setPublishedAt(now);
    setDirty(false);
    setPublishOpen(false);
    setCommitMsg("");
    toast.success("Workflow published");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
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
          <Link to={`/agents/${agentId}?tab=develop&section=task`} className="text-muted-foreground hover:text-foreground">Tasks</Link>
          <span className="text-muted-foreground">/</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isViewMode}
            className="bg-transparent outline-none font-medium text-foreground min-w-0 px-1.5 py-0.5 rounded hover:bg-surface-muted focus:bg-surface-muted transition-base disabled:hover:bg-transparent"
          />
          {status === "Published" ? (
            <span className="chip chip-accent text-[10px]">
              <CheckCircle2 size={10} /> Published {publishedAt ? relativeTime(publishedAt) : ""}
            </span>
          ) : (
            <span className="chip text-[10px] bg-warning-soft text-warning border border-warning/20">
              <AlertTriangle size={10} /> Unpublished
            </span>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Checklist */}
          <button
            onClick={() => setChecklistOpen(o => !o)}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              issues.length > 0
                ? "border-warning/40 bg-warning-soft text-warning hover:bg-warning-soft/70"
                : "border-border bg-surface hover:bg-surface-muted text-muted-foreground"
            }`}
          >
            <AlertTriangle size={13} /> Checklist
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              issues.length > 0 ? "bg-warning text-warning-foreground" : "bg-surface-muted"
            }`}>
              {issues.length}
            </span>
          </button>

          {/* History */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn-ghost h-9">
                <History size={13} /> {history.find(h => h.active)?.id ?? "v1"} <ChevronDown size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Version history
              </div>
              {history.map(h => (
                <DropdownMenuItem
                  key={h.id}
                  className="flex flex-col items-start gap-0.5 py-2 cursor-default"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-semibold">{h.id}</span>
                    {h.active ? (
                      <span className="chip chip-accent text-[9px]">Active</span>
                    ) : (
                      <button
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        onClick={() => setRestoreTarget({ id: h.id, commit: h.commit })}
                      >
                        <RotateCcw size={10} /> Restore
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate w-full">{h.commit}</span>
                  <span className="text-[10px] text-muted-foreground">{relativeTime(h.at)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setTestOpen(v => !v)}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              testOpen ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-surface-muted"
            }`}
          >
            <Play size={13} /> Test run
          </button>

          {!isViewMode && (
            <>
              <button
                onClick={() => { setDirty(false); toast.success("Draft saved"); }}
                className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base"
              >
                <Save size={13} /> Save
              </button>
              <button
                onClick={() => setPublishOpen(true)}
                disabled={!canPublish}
                className="btn-primary h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                title={issues.length > 0 ? "Resolve checklist issues to publish" : status === "Published" ? "Already published" : "Publish workflow"}
              >
                <Rocket size={13} /> Publish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {!isViewMode && <NodeLibrary />}
        <ReactFlowProvider>
          <div className="flex-1 relative flex">
            <Canvas
              nodes={nodes as ToolNode[]}
              edges={edges}
              setNodes={setNodes}
              onNodesChange={wrapChange(onNodesChange)}
              setEdges={setEdges}
              onEdgesChange={wrapChange(onEdgesChange)}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              rfInstance={rfInstance}
              setRfInstance={setRfInstance}
            />
            <TestDrawer
              open={testOpen}
              onClose={() => setTestOpen(false)}
              nodes={nodes as ToolNode[]}
              edges={edges}
            />

            {/* Node Detail Panel (view mode, bottom-right) */}
            {isViewMode && selectedNode && (
              <div className="absolute bottom-4 right-4 w-[320px] rounded-xl bg-surface border border-border shadow-xl p-4 z-10">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{selectedNode.data.kind}</div>
                    <div className="font-semibold text-sm">{selectedNode.data.label}</div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(selectedNode.data.config || {}).length === 0 ? (
                    <p className="text-muted-foreground italic">No configuration set.</p>
                  ) : (
                    Object.entries(selectedNode.data.config || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-mono text-[11px] truncate max-w-[180px]">{String(v)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Checklist Panel */}
            {checklistOpen && (
              <div className="absolute top-3 right-3 w-[340px] max-h-[70%] rounded-xl bg-surface border border-border shadow-xl flex flex-col overflow-hidden z-10">
                <div className="px-4 h-11 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-warning" />
                    <span className="font-semibold text-sm">Checklist</span>
                    <span className="chip text-[10px]">{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
                  </div>
                  <button onClick={() => setChecklistOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {issues.length === 0 ? (
                    <div className="p-4 text-center">
                      <CheckCircle2 size={28} className="mx-auto text-accent mb-2" />
                      <p className="text-sm font-medium">All clear</p>
                      <p className="text-xs text-muted-foreground mt-0.5">No issues found in this workflow.</p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {issues.map((iss, i) => (
                        <li key={i}>
                          <button
                            onClick={() => iss.nodeId !== "_global" && focusNode(iss.nodeId)}
                            disabled={iss.nodeId === "_global"}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-muted text-xs flex items-start gap-2 disabled:cursor-default transition-base"
                          >
                            <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" />
                            <span>{iss.message}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </ReactFlowProvider>
        {!isViewMode && (
          <Inspector node={selectedNode as ToolNode | null} onChange={updateNode} onDelete={deleteNode} />
        )}
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

      {/* Publish dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display">Publish workflow</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium mb-1.5 block">
              Commit message <span className="text-destructive">*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="What changed in this version?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              This message will be saved to the version history for rollback.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setPublishOpen(false)}
              className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
            >
              Cancel
            </button>
            <button onClick={doPublish} className="btn-primary h-9 px-4">
              <Rocket size={13} /> Update
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirm */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {restoreTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current workflow will be replaced with "{restoreTarget?.commit}". Your unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreTarget) {
                  setHistory(h => h.map(v => ({ ...v, active: v.id === restoreTarget.id })));
                  toast.success(`Restored to ${restoreTarget.id}`);
                  setRestoreTarget(null);
                }
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
