import { createContext, useContext } from "react";
import type { RunTraceHighlight } from "../useRunTrace";

export interface WorkforceNodeActions {
  onDelete: (id: string) => void;
  onNoteTextChange: (id: string, text: string) => void;
  /** Node ids that are wired into a route but unreachable from any Trigger — see
   * `getNodesUnreachableFromTrigger` in graphOps.ts. Computed once per render at the page
   * level (needs the whole graph) and handed down through context so individual node
   * components can render their own warning without threading `edges` through every prop
   * list, the same reason `onDelete` lives here instead of being passed node-by-node. */
  unreachableNodeIds: Set<string>;
  /** For each Trigger node id, the agentId of the Agent it's connected to — a Trigger always
   * connects straight to exactly one Agent with no Condition in between (see isValidConnection
   * in Canvas.tsx), and triggers themselves are scoped to an Agent in triggerStore, so both the
   * Trigger node and its drawer need this to know which agent's trigger list applies. `null`
   * when the Trigger isn't connected to an Agent yet; a Trigger id absent from the map hasn't
   * been computed (not a "trigger" kind node). Computed fresh from edges each render, same as
   * `unreachableNodeIds`, rather than stored on the node — so it can never go stale when the
   * connected Agent node is deleted or the connection is rewired to a different Agent. */
  triggerAgentIds: Map<string, string | null>;
  /** Live highlight state from a simulated "Chạy thử" run (S-gap-7, `useRunTrace`) — `null`
   * whenever no run is in progress, so every node/edge falls back to its normal styling with a
   * single cheap null check. Handed down through context for the same reason as the two fields
   * above: reactflow renders node AND edge components as siblings deep inside `<ReactFlow>`, so
   * this is the only way DeletableEdge (an edge, not a node) can see it without the page having
   * to thread it through reactflow's own edge-data prop on every edge object. */
  runTrace: RunTraceHighlight | null;
}

export const WorkforceNodeActionsContext = createContext<WorkforceNodeActions>({
  onDelete: () => {},
  onNoteTextChange: () => {},
  unreachableNodeIds: new Set(),
  triggerAgentIds: new Map(),
  runTrace: null,
});

export const useWorkforceNodeActions = () => useContext(WorkforceNodeActionsContext);
