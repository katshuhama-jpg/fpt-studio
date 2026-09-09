import { createContext, useContext } from "react";

export interface WorkforceNodeActions {
  onDelete: (id: string) => void;
  onNoteTextChange: (id: string, text: string) => void;
}

export const WorkforceNodeActionsContext = createContext<WorkforceNodeActions>({
  onDelete: () => {},
  onNoteTextChange: () => {},
});

export const useWorkforceNodeActions = () => useContext(WorkforceNodeActionsContext);
