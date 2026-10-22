// sessionStorage-backed latest text of each Agent's Instructions. The editor lives in the
// Instructions screen but the Publish button lives in the page header, so Publish needs a place
// to read what the Builder has typed (to check its references) — and switching tabs no longer
// throws the edits away either.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { getAgent } from "./agentStore";

const KEY = "agent_instruction_draft_v1";
const drafts = loadMap<string, string>(KEY);
// Listeners so a screen showing the Instructions (editor, Refine với AI panel) updates when
// another screen changes them - e.g. Áp dụng in Refine với AI writes here (22/10).
const listeners = new Set<(agentId: string) => void>();

export const instructionDraftStore = {
  get(agentId: string): string | undefined {
    return drafts.get(agentId);
  },
  set(agentId: string, text: string) {
    if (drafts.get(agentId) === text) return;
    drafts.set(agentId, text);
    saveMap(KEY, drafts);
    listeners.forEach(fn => fn(agentId));
  },
  subscribe(fn: (agentId: string) => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
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
