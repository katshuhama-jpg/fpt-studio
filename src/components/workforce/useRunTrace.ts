import { useCallback, useEffect, useRef, useState } from "react";
import type { ApprovalMode, WorkforceNode, WorkforceEdge } from "./types";

/** On-canvas run trace / test-run mode (S-gap-7) — simulates a run starting from a chosen
 * Trigger and walks the graph one meaningful hop at a time, the same shape of feature every
 * benchmarked competitor's canvas has in some form (n8n's manual execution highlighting each
 * node as it fires, Dify's workflow debug run, Copilot Studio's test chat tracing the topic/node
 * path). This is a UI-layer simulation, not a real execution — there's no backend to actually
 * run an LLM condition — so at any point where a source node has MORE THAN ONE outgoing route,
 * the run pauses and asks which branch to take rather than guessing; a source with exactly one
 * outgoing route auto-advances through it after a short pause, so the trace still visibly steps
 * through the graph instead of jumping straight to the first decision.
 *
 * Approval (a Condition with `data.approval` set) is the one exception that DOES pause for a
 * real interactive decision rather than just narrating one: reaching such a Condition — whether
 * by auto-advance or by a picked branch — stops the run in `status: "approval"` until
 * `resolveApproval("approve" | "reject")` is called. "agent-decide" mode still shows the same
 * pause (so a tester can see and override it) but auto-resolves to "approve" after a short delay
 * if left alone, standing in for the agent's own confidence-based decision. This is still a
 * client-side simulation, not a real backend — a real "Let Agent Decide" needs the actual agent
 * reasoning and a durable run state, which this prototype doesn't have — but it's enough to make
 * the approval gate an actual decision point instead of a node that silently passed through. */

export type RunNodeStatus = "current" | "done";

/** What node/edge components read from context (see nodeActionsContext.ts) to render themselves
 * — deliberately just the Maps/Sets a render needs, not the whole state machine below.
 * `travelingEdgeIds` is the "packet in flight" phase (see PACKET_TRAVEL_MS below): an edge sits
 * here for a beat BEFORE it's added to `edgeIds`, so DeletableEdge can animate a dot travelling
 * along its exact path rather than the line just instantly flipping color. */
export interface RunTraceHighlight {
  nodeStatus: Map<string, RunNodeStatus>;
  edgeIds: Set<string>;
  travelingEdgeIds: Set<string>;
}

export interface RunRouteOption {
  conditionId: string;
  targetId: string;
  sourceEdgeId: string;
  destEdgeId: string;
}

export interface PendingApproval {
  option: RunRouteOption;
  mode: ApprovalMode;
  assigneeId: string | null;
}

type StepResult =
  | { kind: "auto"; nextNodeId: string; touchedNodeIds: string[]; touchedEdgeIds: string[] }
  | { kind: "choice"; options: RunRouteOption[] }
  | { kind: "approval"; option: RunRouteOption; mode: ApprovalMode; assigneeId: string | null }
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
    const condNode = nodes.find(n => n.id === o.conditionId);
    const approval = condNode?.data.kind === "condition" ? condNode.data.approval : null;
    if (approval) return { kind: "approval", option: o, mode: approval.mode, assigneeId: approval.assigneeId };
    return { kind: "auto", nextNodeId: o.targetId, touchedNodeIds: [o.conditionId, o.targetId], touchedEdgeIds: [o.sourceEdgeId, o.destEdgeId] };
  }
  return { kind: "choice", options };
}

/** Same lookup `computeStep` uses for the single-route case, reused by `choose()` for the
 * multi-route case — a picked branch can be gated by approval too. */
function findApproval(conditionId: string, nodes: WorkforceNode[]) {
  const condNode = nodes.find(n => n.id === conditionId);
  return condNode?.data.kind === "condition" ? condNode.data.approval : null;
}

export interface RunTraceState {
  status: "idle" | "running" | "choice" | "approval" | "done";
  /** Meaningful (non-Condition) node ids reached so far, in order, starting with the Trigger.
   * A step is only appended here once its packet finishes travelling (see `travelingEdgeIds`) —
   * the side panel and the canvas commit to a new "current" node at the same moment. */
  steps: string[];
  currentNodeId: string | null;
  nodeStatus: Map<string, RunNodeStatus>;
  edgeIds: Set<string>;
  /** Edge(s) a packet is currently travelling across, mid-hop — not yet "done". Cleared and
   * folded into `edgeIds` once `PendingAdvance` commits. At most one hop's worth of edges at a
   * time (1 for a Trigger's first hop, 2 for a routable node's auto-advance through its
   * always-inserted Condition, which is treated as a single atomic hop just like the instant
   * version of this state machine did). */
  travelingEdgeIds: Set<string>;
  choiceOptions: RunRouteOption[] | null;
  /** Set while `status === "approval"` — cleared on "approve" (superseded by the run moving on)
   * but deliberately KEPT on "reject" so the caller can still read who rejected (e.g. to record
   * it in Run History) once `status` has already flipped to "done". */
  pendingApproval: PendingApproval | null;
  endReason: "terminal" | "unwired" | "stopped" | "rejected" | null;
}

const IDLE_STATE: RunTraceState = {
  status: "idle",
  steps: [],
  currentNodeId: null,
  nodeStatus: new Map(),
  edgeIds: new Set(),
  travelingEdgeIds: new Set(),
  choiceOptions: null,
  pendingApproval: null,
  endReason: null,
};

// Long enough to read as a deliberate step-by-step trace, short enough not to feel sluggish
// when a chain auto-advances through several single-route hops in a row.
const STEP_DELAY_MS = 650;
// How long the travelling-packet animation takes to cross an edge (DeletableEdge.tsx's
// <animateMotion dur="…">) — kept in one place so the state machine's commit timer and the
// edge's own SVG animation duration can never drift apart.
export const PACKET_TRAVEL_MS = 700;
// How long an "agent-decide" approval sits visibly paused before auto-resolving to "approve" if
// nobody clicks — long enough to read as a real pause, short enough not to stall the trace.
const AGENT_DECIDE_MS = 1600;

/** What the deferred "commit" (after the packet finishes travelling) needs to apply — computed
 * once when the packet starts, stashed in a ref (not state — nothing renders off this directly)
 * and read back by the commit effect. Covers both an auto-advance hop and a user-picked branch,
 * so a single commit effect can handle either. */
interface PendingAdvance {
  touchedNodeIds: string[];
  touchedEdgeIds: string[];
  nextNodeId: string;
}

export function useRunTrace(nodes: WorkforceNode[], edges: WorkforceEdge[]) {
  const [state, setState] = useState<RunTraceState>(IDLE_STATE);
  // Refs so the delayed auto-advance effect always reads the CURRENT graph, not the one that
  // was in scope when the timer was scheduled — the user can keep editing the canvas mid-run.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const pendingRef = useRef<PendingAdvance | null>(null);

  const start = useCallback((triggerId: string) => {
    pendingRef.current = null;
    setState({
      status: "running",
      steps: [triggerId],
      currentNodeId: triggerId,
      nodeStatus: new Map([[triggerId, "current"]]),
      edgeIds: new Set(),
      travelingEdgeIds: new Set(),
      choiceOptions: null,
      pendingApproval: null,
      endReason: null,
    });
  }, []);

  const stop = useCallback(() => {
    setState(s => {
      if (s.status === "idle" || s.status === "done") return s;
      // Stopped mid-flight: snap the in-progress hop straight to "done" (not "current" — the run
      // is over) rather than leaving a packet frozen mid-edge with nothing to finish the trip.
      const pending = pendingRef.current;
      if (s.travelingEdgeIds.size > 0 && pending && s.currentNodeId) {
        const nodeStatus = new Map(s.nodeStatus);
        nodeStatus.set(s.currentNodeId, "done");
        for (const id of pending.touchedNodeIds) nodeStatus.set(id, "done");
        nodeStatus.set(pending.nextNodeId, "done");
        const edgeIds = new Set(s.edgeIds);
        for (const id of pending.touchedEdgeIds) edgeIds.add(id);
        pendingRef.current = null;
        return {
          ...s,
          status: "done",
          endReason: "stopped",
          currentNodeId: pending.nextNodeId,
          steps: [...s.steps, pending.nextNodeId],
          nodeStatus,
          edgeIds,
          travelingEdgeIds: new Set(),
        };
      }
      return { ...s, status: "done", endReason: "stopped" };
    });
  }, []);

  const reset = useCallback(() => {
    pendingRef.current = null;
    setState(IDLE_STATE);
  }, []);

  // Picking a branch starts that hop's packet travelling immediately (status flips back to
  // "running" and the choice buttons disappear right away) — the actual node/edge commit is
  // deferred to the same PACKET_TRAVEL_MS timer an auto-advance uses, below. Unless the picked
  // branch's Condition has approval configured, in which case it pauses in "approval" instead —
  // same as the single-route case computeStep already handles, but a chosen branch can be gated
  // just as much as an auto-advanced one.
  const choose = useCallback((conditionId: string, targetId: string) => {
    setState(s => {
      if (s.status !== "choice" || !s.choiceOptions || !s.currentNodeId) return s;
      const option = s.choiceOptions.find(o => o.conditionId === conditionId && o.targetId === targetId);
      if (!option) return s;
      const approval = findApproval(conditionId, nodesRef.current);
      if (approval) {
        return { ...s, status: "approval", choiceOptions: null, pendingApproval: { option, mode: approval.mode, assigneeId: approval.assigneeId } };
      }
      pendingRef.current = {
        touchedNodeIds: [option.conditionId],
        touchedEdgeIds: [option.sourceEdgeId, option.destEdgeId],
        nextNodeId: option.targetId,
      };
      return {
        ...s,
        status: "running",
        choiceOptions: null,
        travelingEdgeIds: new Set([option.sourceEdgeId, option.destEdgeId]),
      };
    });
  }, []);

  // Approve: proceed exactly like an ordinary auto-advance/choice commit (start the packet
  // travelling; the phase-2 effect below applies it once it "arrives"). Reject: end the run
  // right here — the branch is never taken, so nothing about it is touched — and deliberately
  // keep `pendingApproval` around (unlike approve) so the caller can still read who rejected.
  const resolveApproval = useCallback((decision: "approve" | "reject") => {
    setState(s => {
      if (s.status !== "approval" || !s.pendingApproval || !s.currentNodeId) return s;
      const { option } = s.pendingApproval;
      if (decision === "reject") {
        const nodeStatus = new Map(s.nodeStatus);
        nodeStatus.set(s.currentNodeId, "done");
        return { ...s, status: "done", endReason: "rejected", nodeStatus };
      }
      pendingRef.current = {
        touchedNodeIds: [option.conditionId],
        touchedEdgeIds: [option.sourceEdgeId, option.destEdgeId],
        nextNodeId: option.targetId,
      };
      return {
        ...s,
        status: "running",
        pendingApproval: null,
        travelingEdgeIds: new Set([option.sourceEdgeId, option.destEdgeId]),
      };
    });
  }, []);

  // "agent-decide" approvals auto-resolve to "approve" after a short visible pause unless the
  // tester clicks "Từ chối" first — standing in for the agent's own confidence-based decision.
  useEffect(() => {
    if (state.status !== "approval" || state.pendingApproval?.mode !== "agent-decide") return;
    const t = setTimeout(() => resolveApproval("approve"), AGENT_DECIDE_MS);
    return () => clearTimeout(t);
  }, [state.status, state.pendingApproval, resolveApproval]);

  // Phase 1 — after the "thinking" pause, resolve what happens next. An auto-advance doesn't
  // commit yet: it stashes the result and starts the packet travelling (`travelingEdgeIds`),
  // letting phase 2 below apply it once the packet actually arrives.
  useEffect(() => {
    if (state.status !== "running" || !state.currentNodeId || state.travelingEdgeIds.size > 0) return;
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
        if (result.kind === "approval") {
          return { ...s, status: "approval", pendingApproval: { option: result.option, mode: result.mode, assigneeId: result.assigneeId } };
        }
        pendingRef.current = {
          touchedNodeIds: result.touchedNodeIds,
          touchedEdgeIds: result.touchedEdgeIds,
          nextNodeId: result.nextNodeId,
        };
        return { ...s, travelingEdgeIds: new Set(result.touchedEdgeIds) };
      });
    }, STEP_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.status, state.currentNodeId, state.travelingEdgeIds]);

  // Phase 2 — once the packet has had time to cross the edge(s), commit: the node it left
  // becomes "done", the node it arrives at becomes "current", and the travelled edge(s) move
  // from `travelingEdgeIds` into the permanent `edgeIds` set. Shared by both the auto-advance
  // path above and `choose()`.
  useEffect(() => {
    if (state.status !== "running" || state.travelingEdgeIds.size === 0 || !state.currentNodeId) return;
    const fromNodeId = state.currentNodeId;
    const travelingIds = state.travelingEdgeIds;
    const t = setTimeout(() => {
      setState(s => {
        const pending = pendingRef.current;
        if (s.status !== "running" || s.travelingEdgeIds !== travelingIds || !pending) return s;
        const nodeStatus = new Map(s.nodeStatus);
        nodeStatus.set(fromNodeId, "done");
        for (const id of pending.touchedNodeIds) nodeStatus.set(id, "done");
        nodeStatus.set(pending.nextNodeId, "current");
        const edgeIds = new Set(s.edgeIds);
        for (const id of pending.touchedEdgeIds) edgeIds.add(id);
        pendingRef.current = null;
        return {
          ...s,
          steps: [...s.steps, pending.nextNodeId],
          currentNodeId: pending.nextNodeId,
          nodeStatus,
          edgeIds,
          travelingEdgeIds: new Set(),
        };
      });
    }, PACKET_TRAVEL_MS);
    return () => clearTimeout(t);
  }, [state.status, state.currentNodeId, state.travelingEdgeIds]);

  const highlight: RunTraceHighlight | null =
    state.status === "idle" ? null : { nodeStatus: state.nodeStatus, edgeIds: state.edgeIds, travelingEdgeIds: state.travelingEdgeIds };

  return { state, highlight, start, stop, reset, choose, resolveApproval };
}
