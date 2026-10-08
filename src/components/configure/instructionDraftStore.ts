// sessionStorage-backed latest text of each Agent's Instructions. The editor lives in the
// Instructions screen but the Publish button lives in the page header, so Publish needs a place
// to read what the Builder has typed (to check its references) — and switching tabs no longer
// throws the edits away either.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { getAgent } from "./agentStore";

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
  /** Points this Agent's Instructions references at a resource's new id (a skill moved between
   * the Agent's own list and the Space library keeps working in the text). */
  remapRef(agentId: string, kind: string, oldId: string, newId: string) {
    const text = drafts.get(agentId) ?? getAgent(agentId).instructions ?? "";
    const from = `{{ref:${kind}:${oldId}`;
    if (!text.includes(from)) return;
    this.set(agentId, text.split(from).join(`{{ref:${kind}:${newId}`));
  },
};
