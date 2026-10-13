// Agent card (A2A) - per Agent, per version. The Builder keeps a draft (on/off, description,
// hidden Skills). The card is generated once at Publish: if the draft is on at that moment the
// published version gets a card, otherwise it has none. Phase 1: only Agents in the same
// enterprise Workspace can hand work to an Agent through its card.
import { useEffect, useState } from "react";
import { loadMap, saveMap } from "@/lib/sessionPersist";

export const AGENT_CARD_DESC_MAX = 300;

export type AgentCardDraft = {
  enabled: boolean;
  /** null = never set, the block fills it from the Agent's info. */
  description: string | null;
  hiddenSkillIds: string[];
};

/** What the Builder currently resolves the card to - snapshot at Publish. */
export type AgentCardResolved = { description: string; skills: { id: string; name: string }[] };

export type LiveAgentCard = AgentCardResolved & { version: string; publishedAt: number };

const DRAFT_KEY = "agent_card_draft_v1";
const LIVE_KEY = "agent_card_live_v1";
const drafts = loadMap<string, AgentCardDraft>(DRAFT_KEY);
const live = loadMap<string, LiveAgentCard>(LIVE_KEY);
const resolvedNow = new Map<string, AgentCardResolved>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

// Demo: the Legal Agent's live v1.1.0 already carries a card.
if (!live.has("legal-review") && typeof sessionStorage !== "undefined" && !sessionStorage.getItem("agent_card_seeded_v1")) {
  sessionStorage.setItem("agent_card_seeded_v1", "1");
  drafts.set("legal-review", { enabled: true, description: null, hiddenSkillIds: ["askill-legal-email"] });
  live.set("legal-review", {
    version: "v1.1.0", publishedAt: Date.now() - 3 * 86400000,
    description: "Rà soát điều khoản hợp đồng và tra cứu văn bản pháp luật. Giao việc khi cần kiểm tra rủi ro pháp lý hoặc tìm căn cứ pháp luật.",
    skills: [{ id: "askill-legal-contract", name: "ra-soat-hop-dong" }, { id: "askill-legal-law", name: "tra-cuu-van-ban-phap-luat" }],
  });
  saveMap(DRAFT_KEY, drafts);
  saveMap(LIVE_KEY, live);
}

const DEFAULT_DRAFT: AgentCardDraft = { enabled: false, description: null, hiddenSkillIds: [] };

export const agentCardStore = {
  getDraft(agentId: string): AgentCardDraft {
    return drafts.get(agentId) ?? DEFAULT_DRAFT;
  },
  updateDraft(agentId: string, patch: Partial<AgentCardDraft>) {
    drafts.set(agentId, { ...this.getDraft(agentId), ...patch });
    saveMap(DRAFT_KEY, drafts);
    emit();
  },
  toggleSkill(agentId: string, skillId: string) {
    const cur = this.getDraft(agentId);
    const hidden = cur.hiddenSkillIds.includes(skillId)
      ? cur.hiddenSkillIds.filter(x => x !== skillId)
      : [...cur.hiddenSkillIds, skillId];
    this.updateDraft(agentId, { hiddenSkillIds: hidden });
  },
  /** The block reports what the card would look like right now, so Publish can snapshot it. */
  setResolved(agentId: string, r: AgentCardResolved) {
    resolvedNow.set(agentId, r);
  },
  getLive(agentId: string): LiveAgentCard | undefined {
    return live.get(agentId);
  },
  /** Called by agentPublishStore on every real release. */
  onPublish(agentId: string, version: string) {
    const d = this.getDraft(agentId);
    const r = resolvedNow.get(agentId);
    if (d.enabled && r && r.description.trim()) {
      live.set(agentId, { ...r, version, publishedAt: Date.now() });
    } else {
      live.delete(agentId);
    }
    saveMap(LIVE_KEY, live);
    emit();
  },
};

export function useAgentCard(agentId: string) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { draft: agentCardStore.getDraft(agentId), live: agentCardStore.getLive(agentId) };
}
