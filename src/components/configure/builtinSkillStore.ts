// sessionStorage-backed per-Agent on/off state for BUILT-IN (default) skills — the skills the
// platform ships with every Agent, as opposed to agentSkillStore.ts (this Agent's own skills)
// and skillStore.ts (shareable Console skills). The catalog itself is a hard-coded constant
// because built-ins ship with the platform: an Agent can only turn one off, never create,
// rename or delete one, so the only per-Agent state worth persisting is the off-switch.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export interface BuiltinSkill {
  id: string;
  name: string;
  /** One-line summary shown on the card — deliberately shorter than the full capability list. */
  description: string;
  version: string;
  icon: string;
  /** Core built-ins run the Agent's own self-configuration and are never shown to users or
   * turned off; only `visible` ones reach the Agent Details UI. */
  visible: boolean;
}

/** The platform's built-in skill catalog. The five visible entries are the document-I/O and
 * design skills a user can reasonably decide they don't want an Agent using; the five hidden
 * ones are the Core group that drives self-configuration (tools, sub-agents, skills), which the
 * spec keeps out of the UI entirely since turning them off would break the Agent. */
export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    id: "pptx", name: "pptx", version: "1.0.0", icon: "📊", visible: true,
    description: "Work with PowerPoint files (.pptx, .potx): build decks, read and extract slide text, edit existing presentations, merge or split files, and handle templates, layouts, speaker notes and comments.",
  },
  {
    id: "xlsx", name: "xlsx", version: "1.0.0", icon: "📗", visible: true,
    description: "Work with spreadsheets (.xlsx, .xls, .csv): read and extract data, create files, manage sheets, format cells, build charts, apply formulas, and convert between CSV and XLSX.",
  },
  {
    id: "pdf", name: "pdf", version: "1.0.0", icon: "📕", visible: true,
    description: "Work with PDF files: read and extract text or tables, merge and split, rotate pages, add watermarks, create PDFs, fill forms, encrypt or decrypt, extract images, and OCR scanned files.",
  },
  {
    id: "docx", name: "docx", version: "1.0.0", icon: "📘", visible: true,
    description: "Work with Word files (.docx, .doc): read and extract text, tables and images, create documents, apply styles and page layout, and generate reports from templates.",
  },
  {
    id: "frontend-design", name: "frontend-design", version: "1.0.0", icon: "🎨", visible: true,
    description: "Design guidance when building new UI, generating HTML or reworking an existing interface — direction on aesthetics, typography and layout.",
  },

  // Core group — hidden from the UI, always on.
  { id: "manage-tools", name: "manage-tools", version: "1.0.0", icon: "🔧", visible: false, description: "Add or remove tools in the Agent's tool configuration." },
  { id: "manage-subagents", name: "manage-subagents", version: "1.0.0", icon: "🤖", visible: false, description: "Create and manage sub-agents." },
  { id: "manage-skills", name: "manage-skills", version: "1.0.0", icon: "🧩", visible: false, description: "Decide what to store as a skill and create, update or share skills." },
  { id: "generate-skill", name: "generate-skill", version: "1.0.0", icon: "✨", visible: false, description: "Create a new skill or edit an existing one." },
  { id: "generate-agent", name: "generate-agent", version: "1.0.0", icon: "⚙️", visible: false, description: "Run the Agent's full self-configuration flow." },
];

/** The five a user actually sees and can toggle in Agent Details. */
export const VISIBLE_BUILTIN_SKILLS = BUILTIN_SKILLS.filter(s => s.visible);

// Only OFF states are stored, keyed `${agentId}:${skillId}` — every built-in ships enabled, so
// an absent key means "on". That keeps a brand-new Agent (and any Agent created before this
// feature existed) at the correct default without needing a seed step.
const OFF_KEY = "agent_builtin_skill_off_v1";
const off = loadMap<string, boolean>(OFF_KEY);
const k = (agentId: string, skillId: string) => `${agentId}:${skillId}`;
const persist = () => saveMap(OFF_KEY, off);

export const builtinSkillStore = {
  /** Built-ins visible in Agent Details, in catalog order. */
  list(): BuiltinSkill[] {
    return VISIBLE_BUILTIN_SKILLS;
  },
  isOn(agentId: string, skillId: string): boolean {
    return off.get(k(agentId, skillId)) !== true;
  },
  setOn(agentId: string, skillId: string, on: boolean) {
    if (on) off.delete(k(agentId, skillId));
    else off.set(k(agentId, skillId), true);
    persist();
  },
  /** True when every visible built-in is still on — the original state, so "Restore defaults"
   * has nothing to do and stays disabled. */
  isAtDefault(agentId: string): boolean {
    return VISIBLE_BUILTIN_SKILLS.every(s => this.isOn(agentId, s.id));
  },
  /** How many are currently switched off — drives the section's summary line. */
  offCount(agentId: string): number {
    return VISIBLE_BUILTIN_SKILLS.filter(s => !this.isOn(agentId, s.id)).length;
  },
  restoreDefaults(agentId: string) {
    for (const s of VISIBLE_BUILTIN_SKILLS) off.delete(k(agentId, s.id));
    persist();
  },
};
