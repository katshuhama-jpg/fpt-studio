import { createContext, useContext } from "react";

export interface WorkforceNodeActions {
  onDelete: (id: string) => void;
  onNoteTextChange: (id: string, text: string) => void;
  /** Node ids that are wired into a route but unreachable from any Trigger — see
   * `getNodesUnreachableFromTrigger` in graphOps.ts. Computed once per render at the page
   * level (needs the whole graph) and handed down through context so individual node
   * components can render their own warning without threading `edges` through every prop
   * list, the same reason `onDelete` lives here instead of being passed node-by-node. */
  unreachableNodeIds: Set<string>;
}

export const WorkforceNodeActionsContext = createContext<WorkforceNodeActions>({
  onDelete: () => {},
  onNoteTextChange: () => {},
  unreachableNodeIds: new Set(),
});

export const useWorkforceNodeActions = () => useContext(WorkforceNodeActionsContext);
