// sessionStorage-backed latest text of each Agent's Instructions. The editor lives in the
// Instructions screen but the Publish button lives in the page header, so Publish needs a place
// to read what the Builder has typed (to check its references) — and switching tabs no longer
// throws the edits away either.
import { loadMap, saveMap } from "@/lib/sessionPersist";

const KEY = "agent_instruction_draft_v1";
const drafts = loadMap<string, string>(KEY);

export const instructionDraftStore = {
  get(agentId: string): string | undefined {
    return drafts.get(agentId);
  },
  set(agentId: string, text: string) {
    drafts.set(agentId, text);
    saveMap(KEY, drafts);
  },
};
