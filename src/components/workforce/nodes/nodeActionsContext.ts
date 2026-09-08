import { createContext, useContext } from "react";

export interface WorkforceNodeActions {
  onConfigure: (id: string) => void;
  onDelete: (id: string) => void;
  onNoteTextChange: (id: string, text: string) => void;
  onDeleteEdge: (id: string) => void;
}

export const WorkforceNodeActionsContext = createContext<WorkforceNodeActions>({
  onConfigure: () => {},
  onDelete: () => {},
  onNoteTextChange: () => {},
  onDeleteEdge: () => {},
});

export const useWorkforceNodeActions = () => useContext(WorkforceNodeActionsContext);
