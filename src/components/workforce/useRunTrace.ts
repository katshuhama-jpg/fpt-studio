import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkforceNode, WorkforceEdge } from "./types";

/** On-canvas run trace / test-run mode (S-gap-7) — simulates a run starting from a chosen
 * Trigger and walks the graph one meaningful hop at a time, the same shape of feature every
 * benchmarked competitor's canvas has in some form (n8n's manual execution highlighting each
 * node as it fires, Dify's workflow debug run, Copilot Studio's test chat tracing the topic/node
 * path). This is a UI-layer simulation, not a real execution — there's no backend to actually
 * run an LLM condition or an approval — so at any point where a source node has MORE THAN ONE
 * outgoing route, the run pauses and asks which branch to take rather than guessing; a source
 * with exactly one outgoing route auto-advances through it after a short pause, so the trace
 * still visibly steps through the graph instead of jumping straight to the first decision. */

export type RunNodeStatus = "current" | "done";

/** What node/edge components read from context (see nodeActionsContext.ts) to render themselves
 * — deliberately just the two Maps/Sets a render needs, not the whole state machine below. */
export interface RunTraceHighlight {
  nodeStatus: Map<string, RunNodeStatus>;
  edgeIds: Set<string>;
}

export interface RunRouteOption {
  conditionId: string;
  targetId: string;
  sourceEdgeId: string;
  destEdgeId: string;
}

type StepResult =
  | { kind: "auto"; nextNodeId: string; touchedNodeIds: string[]; touchedEdgeIds: string[] }
  | { kind: "choice"; options: RunRouteOption[] }
  | { kind: "end"; reason: "terminal" | "unwired" };

/** Same routing shape as `isRoutableSource` in Canvas.tsx and `getNodesUnreachableFromTrigger`
 * in graphOps.ts — kept as a local copy rather than imported since this one needs to reason
 * about a single node's data, not decide whether a *connection* is legal. */
function computeStep(nodeId: string, nodes: WorkforceNode[], edges: WorkforceEdge[]): StepResult {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { kind: "end", reason: "terminal" };

  if (node.data.kind === "trigger") {
    const out = edges.find(e => e.source === nodeId);
    if (!out) return { kind: "end", reason: "unwired" };
    return { kind: "auto", nextNodeId: out.target, touchedNodeIds: [out.target], touchedEdgeIds: [out.id] };
  }

  const isRoutable =
    node.data.kind === "agent" ||
    node.data.kind === "subprocess" ||
    (node.data.kind === "person" && node.data.taskKind !== "notify");
  if (!isRoutable) return { kind: "end", reason: "terminal" };

  // Every outgoing edge from a routable node targets a Condition node (the [source] -> Condition
  // -> [destination] invariant from graphOps.ts) — one candidate route per Condition reached.
  const options: RunRouteOption[] = [];
  for (const e of edges.filter(ed => ed.source === nodeId)) {
    const cond = nodes.find(n => n.id === e.target && n.data.kind === "condition");
    if (!cond) continue;
    const destEdge = edges.find(de => de.source === cond.id);
    if (!destEdge) continue;
    options.push({ conditionId: cond.id, targetId: destEdge.target, sourceEdgeId: e.id, destEdgeId: destEdge.id });
  }
  if (options.length === 0) return { kind: "end", reason: "terminal" };
  if (options.length === 1) {
    const o = options[0];
    return { kind: "auto", nextNodeId: o.targetId, touchedNodeIds: [o.conditionId, o.targetId], touchedEdgeIds: [o.sourceEdgeId, o.destEdgeId] };
  }
  return { kind: "choice", options };
}

export interface RunTraceState {
  status: "idle" | "running" | "choice" | "done";
  /** Meaningful (non-Condition) node ids reached so far, in order, starting with the Trigger. */
  steps: string[];
  currentNodeId: string | null;
  nodeStatus: Map<string, RunNodeStatus>;
  edgeIds: Set<string>;
  choiceOptions: RunRouteOption[] | null;
  endReason: "terminal" | "unwired" | "stopped" | null;
}

const IDLE_STATE: RunTraceState = {
  status: "idle",
  steps: [],
  currentNodeId: null,
  nodeStatus: new Map(),
  edgeIds: new Set(),
  choiceOptions: null,
  endReason: null,
};

// Long enough to read as a deliberate step-by-step trace, short enough not to feel sluggish
// when a chain auto-advances through several single-route hops in a row.
const STEP_DELAY_MS = 650;

export function useRunTrace(nodes: WorkforceNode[], edges: WorkforceEdge[]) {
  const [state, setState] = useState<RunTraceState>(IDLE_STATE);
  // Refs so the delayed auto-advance effect always reads the CURRENT graph, not the one that
  // was in scope when the timer was scheduled — the user can keep editing the canvas mid-run.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const start = useCallback((triggerId: string) => {
    setState({
      status: "running",
      steps: [triggerId],
      currentNodeId: triggerId,
      nodeStatus: new Map([[triggerId, "current"]]),
      edgeIds: new Set(),
      choiceOptions: null,
      endReason: null,
    });
  }, []);

  const stop = useCallback(() => {
    setState(s => (s.status === "idle" || s.status === "done" ? s : { ...s, status: "done", endReason: "stopped" }));
  }, []);

  const reset = useCallback(() => setState(IDLE_STATE), []);

  const choose = useCallback((conditionId: string, targetId: string) => {
    setState(s => {
      if (s.status !== "choice" || !s.choiceOptions || !s.currentNodeId) return s;
      const option = s.choiceOptions.find(o => o.conditionId === conditionId && o.targetId === targetId);
      if (!option) return s;
      const nodeStatus = new Map(s.nodeStatus);
      nodeStatus.set(s.currentNodeId, "done");
      nodeStatus.set(option.conditionId, "done");
      nodeStatus.set(option.targetId, "current");
      const edgeIds = new Set(s.edgeIds);
      edgeIds.add(option.sourceEdgeId);
      edgeIds.add(option.destEdgeId);
      return {
        ...s,
        status: "running",
        steps: [...s.steps, option.targetId],
        currentNodeId: option.targetId,
        nodeStatus,
        edgeIds,
        choiceOptions: null,
      };
    });
  }, []);

  useEffect(() => {
    if (state.status !== "running" || !state.currentNodeId) return;
    const nodeId = state.currentNodeId;
    const t = setTimeout(() => {
      const result = computeStep(nodeId, nodesRef.current, edgesRef.current);
      setState(s => {
        // The run may have been stopped, or moved on already, while this timer was pending.
        if (s.status !== "running" || s.currentNodeId !== nodeId) return s;
        if (result.kind === "end") {
          const nodeStatus = new Map(s.nodeStatus);
          nodeStatus.set(nodeId, "done");
          return { ...s, status: "done", nodeStatus, endReason: result.reason };
        }
        if (result.kind === "choice") {
          return { ...s, status: "choice", choiceOptions: result.options };
        }
        const nodeStatus = new Map(s.nodeStatus);
        nodeStatus.set(nodeId, "done");
        for (const id of result.touchedNodeIds) nodeStatus.set(id, "done");
        nodeStatus.set(result.nextNodeId, "current");
        const edgeIds = new Set(s.edgeIds);
        for (const id of result.touchedEdgeIds) edgeIds.add(id);
        return { ...s, steps: [...s.steps, result.nextNodeId], currentNodeId: result.nextNodeId, nodeStatus, edgeIds };
      });
    }, STEP_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.status, state.currentNodeId]);

  const highlight: RunTraceHighlight | null =
    state.status === "idle" ? null : { nodeStatus: state.nodeStatus, edgeIds: state.edgeIds };

  return { state, highlight, start, stop, reset, choose };
}
