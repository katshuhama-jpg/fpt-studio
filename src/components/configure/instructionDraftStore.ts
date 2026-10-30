// sessionStorage-backed latest text of each Agent's Instructions. The editor lives in the
// Instructions screen but the Publish button lives in the page header, so Publish needs a place
// to read what the Builder has typed (to check its references) — and switching tabs no longer
// throws the edits away either.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { getAgent } from "./agentStore";
import { currentPersona } from "@/lib/demoPersona";

const KEY = "agent_instruction_draft_v1";
const drafts = loadMap<string, string>(KEY);
// Listeners so a screen showing the Instructions (editor, Refine với AI panel) updates when
// another screen changes them - e.g. Áp dụng in Refine với AI writes here (22/10).
const listeners = new Set<(agentId: string) => void>();
// Who last changed each Agent's Instructions and when - Refine với AI uses it to tell the person
// "Mai Hoang vừa sửa..." when someone else changed the text under the assistant (30/10).
export interface InstructionEdit { byId: string; byName: string; at: number }
const META_KEY = "agent_instruction_meta_v1";
const meta = loadMap<string, InstructionEdit>(META_KEY);

export const instructionDraftStore = {
  get(agentId: string): string | undefined {
    return drafts.get(agentId);
  },
  set(agentId: string, text: string) {
    if (drafts.get(agentId) === text) return;
    drafts.set(agentId, text);
    saveMap(KEY, drafts);
    const p = currentPersona();
    meta.set(agentId, { byId: p.id, byName: p.name, at: Date.now() });
    saveMap(META_KEY, meta);
    listeners.forEach(fn => fn(agentId));
  },
  lastEdit(agentId: string): InstructionEdit | undefined {
    return meta.get(agentId);
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
