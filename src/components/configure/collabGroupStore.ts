// sessionStorage-backed "Nhóm cộng tác" (collaboration group) store — the anti-bypass half of
// Vấn đề 2 (see the Governance solution note). A group is a real, named entity with an owner and
// a roster of individual people, meant for a team that genuinely reuses the same publish target
// over time — distinct from "Chia sẻ nhanh" (an ungated, hard-capped ≤10-person ad-hoc pick with
// no persisted entity at all, handled inline in AgentBuilder's Publish modal).
//
// The anti-bypass mechanism: a group's roster is compared against every real Org/Unit roster
// (already synced from Azure AD/Entra ID — see organization/orgData.ts). If the group's overlap
// with any one Unit is at or above GROUP_APPROVAL_THRESHOLD, publishing to that group is treated
// exactly like publishing to that Org/Unit — it goes through Org/Unit Admin review, same as
// "Company / department". This is deliberately NOT a snapshot taken once at publish time: overlap
// is recomputed fresh every time it's read, and `recheckGroupPublishes` re-evaluates every
// currently-live group-scoped Agent — call it on a normal navigation (see WorkspaceLayout) rather
// than a real background job, but the effect is the same: there is no safe moment to quietly
// remove one person and dodge review, because the next time anyone is in the app, the check runs
// again against the group's roster as it stands right now.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { collectMembers, collectUnits, type OrgUnit } from "@/pages/organization/orgData";
import { agentPublishStore } from "./agentPublishStore";
import { governanceStore, listAgentResourceRefs, agentEmoji } from "@/components/governance/governanceStore";
import { getAgent } from "./agentStore";

/** 80% — chosen as "for practical purposes, this group IS that Unit". Below this, a group reads
 * as genuinely its own thing even if it happens to share some people with a Unit. */
export const GROUP_APPROVAL_THRESHOLD = 0.8;

export interface CollabGroup {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  createdAt: number;
}

const KEY = "collab_group_store_v1";
const SEEDED_KEY = "collab_group_store_seeded_v1";
const store = loadMap<string, CollabGroup>(KEY);
const persist = () => saveMap(KEY, store);

let seq = 1;
const nextId = () => `grp-${seq++}`;

function seededOnce(): boolean {
  try { return sessionStorage.getItem(SEEDED_KEY) === "1"; } catch { return false; }
}
function markSeeded() {
  try { sessionStorage.setItem(SEEDED_KEY, "1"); } catch { /* ignore */ }
}

/** Seeds one realistic example group so the picker isn't empty on first visit — a small
 * cross-functional group that (deliberately) does NOT overlap heavily with any single Unit, to
 * demonstrate the normal "genuinely ad-hoc, no review needed" case out of the box. */
function seed(tree: OrgUnit) {
  if (seededOnce()) return;
  markSeeded();
  const allMembers = collectMembers(tree);
  if (allMembers.length === 0) return;
  const pick = allMembers.slice(0, Math.min(4, allMembers.length)).map(m => m.id);
  const g: CollabGroup = {
    id: nextId(), name: "Ra mắt sản phẩm Q4", ownerId: "m-fsoft-vn-1", ownerName: "Duy Nguyen",
    memberIds: pick, createdAt: Date.now(),
  };
  store.set(g.id, g);
  persist();
}

export interface OverlapResult { pct: number; unit?: OrgUnit; unitMemberCount?: number }

/** Highest overlap this group's roster has with any single real Org/Unit right now, computed
 * fresh — never cached. `pct` is (members shared with that Unit) / (that Unit's total headcount),
 * so a group can't dodge the check by being a strict subset of a much larger Unit's roster. */
export function overlapForGroup(group: CollabGroup, tree: OrgUnit): OverlapResult {
  const units = collectUnits(tree);
  const memberSet = new Set(group.memberIds);
  let best: OverlapResult = { pct: 0 };
  for (const unit of units) {
    const unitMembers = collectMembers(unit);
    if (unitMembers.length === 0) continue;
    const shared = unitMembers.filter(m => memberSet.has(m.id)).length;
    const pct = shared / unitMembers.length;
    if (pct > best.pct) best = { pct, unit, unitMemberCount: unitMembers.length };
  }
  return best;
}

export function groupNeedsApproval(group: CollabGroup, tree: OrgUnit): boolean {
  return overlapForGroup(group, tree).pct >= GROUP_APPROVAL_THRESHOLD;
}

export const collabGroupStore = {
  list(tree: OrgUnit): CollabGroup[] {
    seed(tree);
    return [...store.values()].sort((a, b) => b.createdAt - a.createdAt);
  },
  get(id: string): CollabGroup | undefined {
    return store.get(id);
  },
  create(input: { name: string; ownerId: string; ownerName: string; memberIds: string[] }): CollabGroup {
    const g: CollabGroup = { id: nextId(), createdAt: Date.now(), ...input };
    store.set(g.id, g);
    persist();
    return g;
  },
  setMembers(id: string, memberIds: string[]) {
    const g = store.get(id);
    if (!g) return;
    g.memberIds = memberIds;
    store.set(id, g);
    persist();
  },
  rename(id: string, name: string) {
    const g = store.get(id);
    if (!g) return;
    g.name = name;
    store.set(id, g);
    persist();
  },
};

/**
 * The continuous re-check, for one Agent: recompute its group's overlap against the real
 * (currently synced) Org/Unit rosters. If it has crossed GROUP_APPROVAL_THRESHOLD since it went
 * live — whether because someone was quietly removed from the group to dodge review, or the
 * Org/Unit itself changed — pull it back out of service and open a fresh Org/Unit Admin
 * governance request automatically, exactly as if the Builder had submitted a "Company /
 * department" publish themselves. No cron/timer in this prototype — callers run this against
 * every agent id they already have on hand (AgentsList's rows, WorkspaceLayout's agent catalog)
 * on a normal page visit, which is enough to demonstrate there is never a safe window to exploit:
 * the check runs again the next time anyone is in the app. Safe to call for an Agent that isn't
 * group-scoped or isn't live — it's a no-op. */
export function recheckAgentGroupPublish(agentId: string, tree: OrgUnit) {
  const publish = agentPublishStore.get(agentId);
  if (publish.audience !== "group" || publish.placement === null || !publish.groupId) return;
  const group = store.get(publish.groupId);
  if (!group) return;
  const overlap = overlapForGroup(group, tree);
  if (overlap.pct < GROUP_APPROVAL_THRESHOLD) return;

  // Crossed the line since it was approved — pull it back and re-open review, same as a fresh
  // Company/department submission (see the module doc comment above).
  const agent = getAgent(agentId);
  if (!agent) return;
  const existingOpen = governanceStore.getOpenRequestForResource("agent", agentId);
  if (existingOpen) return; // already back in the queue, don't double-submit

  const unitName = overlap.unit?.name ?? "một phòng ban";
  const overlapPctLabel = Math.round(overlap.pct * 100);
  agentPublishStore.flagNeedsRegovernance(agentId, {
    reason: `Nhóm cộng tác "${group.name}" hiện trùng ${overlapPctLabel}% với ${unitName} — vượt ngưỡng cho phép nên cần Org/Unit Admin duyệt lại trước khi tiếp tục publish.`,
    unitName, overlapPct: overlap.pct, at: Date.now(),
  });
  governanceStore.submit({
    resourceType: "agent", resourceId: agentId, resourceName: agent.name, resourceIcon: agentEmoji(agentId),
    requesterId: group.ownerId, requesterName: group.ownerName,
    audience: "group",
    note: `Tự động phát hiện: nhóm "${group.name}" hiện trùng ${overlapPctLabel}% với ${unitName}, vượt ngưỡng ${Math.round(GROUP_APPROVAL_THRESHOLD * 100)}% — hệ thống tự động gửi lại để Org/Unit Admin duyệt, đúng như publish theo Company / department.`,
    resourceRefs: listAgentResourceRefs(agentId),
    scopeSummary: `Nhóm cộng tác "${group.name}" (${group.memberIds.length} người, trùng ${overlapPctLabel}% với ${unitName})`,
  });
}
