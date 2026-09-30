// sessionStorage-backed "Nhóm cộng tác" (collaboration group) store. A group is a real, named
// entity with an owner and a roster, meant for a team that reuses the same publish target over
// time — distinct from "Chia sẻ nhanh" (≤ QUICK_SHARE_MAX people, ad-hoc, no approval).
//
// Rules (BA doc "Quản lý trạng thái Agent" §5):
//  - Publishing to a Nhóm cộng tác ALWAYS needs approval.
//  - Who approves is decided by counting the group's members: if one unit (the smallest one)
//    holds ≥ GROUP_REVIEWER_THRESHOLD of them, that unit's Admin reviews; otherwise the Admins of
//    every department that has members in the group can review, and one decision is enough.
//  - After approval, REMOVING members applies immediately; ADDING members opens a re-approval —
//    members already approved keep using the Agent, the new ones only get it once approved.
import { notificationStore } from "@/components/notifications/notificationStore";
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { collectMembers, collectUnits, type OrgUnit } from "@/pages/organization/orgData";
import { agentPublishStore } from "./agentPublishStore";
import { governanceStore, listAgentResourceRefs, agentEmoji } from "@/components/governance/governanceStore";
import { getAgent } from "./agentStore";

/** Chia sẻ nhanh cap — above this, share through a Nhóm cộng tác (always reviewed). */
export const QUICK_SHARE_MAX = 5;
/** ≥ 80% of the group's members in one unit → that unit's Admin is the reviewer. */
export const GROUP_REVIEWER_THRESHOLD = 0.8;
/** @deprecated kept for older imports; same value as GROUP_REVIEWER_THRESHOLD. */
export const GROUP_APPROVAL_THRESHOLD = GROUP_REVIEWER_THRESHOLD;

export interface CollabGroup {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  createdAt: number;
}

const KEY = "collab_group_store_v2";
const SEEDED_KEY = "collab_group_store_seeded_v2";
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
  // Approved for cskh with its first 4 members; 2 more were added since → re-approval.
  const squad: CollabGroup = {
    id: "grp-platform-squad", name: "Platform squad", ownerId: "m-fsoft-ceo", ownerName: "Tran Nam",
    memberIds: ["m-plat-1", "m-plat-2", "m-plat-3", "m-plat-4", "m-plat-5", "m-plat-6"], createdAt: Date.now() - 20 * 86_400_000,
  };
  store.set(squad.id, squad);
  // 50/50 across two departments → no one department holds 80% → either Admin can approve.
  const mixed: CollabGroup = {
    id: "grp-ai-platform", name: "AI x Platform", ownerId: "m-fsoft-ceo", ownerName: "Tran Nam",
    memberIds: ["m-plat-7", "m-plat-8", "m-aiml-1", "m-aiml-2"], createdAt: Date.now() - 3 * 86_400_000,
  };
  store.set(mixed.id, mixed);
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

export interface GroupReviewers {
  mode: "single" | "any";
  units: { id: string; name: string }[];
  /** single: share of the group's members inside that unit (0–1). */
  share?: number;
  memberCount: number;
}

/** Direct unit of each member (the unit whose own `members` list has them; root included). */
function directUnitOf(tree: OrgUnit, memberId: string): OrgUnit | undefined {
  if (tree.members.some(m => m.id === memberId)) return tree;
  for (const u of tree.units) { const f = directUnitOf(u, memberId); if (f) return f; }
  return undefined;
}

/** Who reviews a Nhóm cộng tác publish: count the group's members by their own department (the
 * unit they sit in directly). One department holding ≥ 80% → its Admin; otherwise the Admins of
 * every department with members in the group, and any one decision is enough. */
export function groupReviewers(memberIds: string[], tree: OrgUnit): GroupReviewers {
  const n = memberIds.length;
  const byUnit = new Map<string, { name: string; count: number }>();
  for (const id of memberIds) {
    const u = directUnitOf(tree, id);
    if (!u) continue;
    const cur = byUnit.get(u.id) ?? { name: u.name, count: 0 };
    cur.count++;
    byUnit.set(u.id, cur);
  }
  const ranked = [...byUnit].sort((a, b) => b[1].count - a[1].count);
  const top = ranked[0];
  if (top && n && top[1].count / n >= GROUP_REVIEWER_THRESHOLD) {
    return { mode: "single", units: [{ id: top[0], name: top[1].name }], share: top[1].count / n, memberCount: n };
  }
  return { mode: "any", units: ranked.map(([id, v]) => ({ id, name: v.name })), memberCount: n };
}

export function reviewersLabel(r: GroupReviewers): string {
  if (r.mode === "single") return `Admin ${r.units[0]?.name} (${Math.round((r.share ?? 0) * 100)}% thành viên)`;
  return `Admin của ${r.units.map(u => u.name).join(", ")} — 1 người duyệt là đủ`;
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
 * Re-check for one live group-scoped Agent: members added to the group since the roster that was
 * approved are not covered — open a re-approval request (members already approved keep using the
 * Agent). Removed members need nothing. Callers run this on normal page visits (AgentsList,
 * AgentBuilder, WorkspaceLayout); no-op for anything that isn't a live group publish.
 */
export function recheckAgentGroupPublish(agentId: string, tree: OrgUnit) {
  const publish = agentPublishStore.get(agentId);
  if (publish.audience !== "group" || publish.placement === null || !publish.groupId || !publish.groupMemberIds) return;
  seed(tree);
  const group = store.get(publish.groupId);
  if (!group) return;
  const approved = new Set(publish.groupMemberIds);
  const added = group.memberIds.filter(id => !approved.has(id));
  if (added.length === 0) return;
  if (governanceStore.getOpenRequestForResource("agent", agentId)) return; // already queued
  // Don't re-open the same roster again after an Admin rejected (or the Builder withdrew) it.
  const key = [...group.memberIds].sort().join(",");
  const last = governanceStore.latestForResource("agent", agentId);
  if (last && last.groupMemberIds && [...last.groupMemberIds].sort().join(",") === key && (last.status === "rejected" || last.status === "withdrawn")) return;

  const agent = getAgent(agentId);
  if (!agent) return;
  const addedNames = added.map(id => collectMembers(tree).find(m => m.id === id)?.name ?? id);
  const reviewers = groupReviewers(group.memberIds, tree);
  governanceStore.submit({
    resourceType: "agent", resourceId: agentId, resourceName: agent.name, resourceIcon: agentEmoji(agentId),
    requesterId: group.ownerId, requesterName: group.ownerName,
    audience: "group", version: publish.version,
    note: `Nhóm "${group.name}" có thêm ${added.length} thành viên (${addedNames.join(", ")}). ${approved.size} thành viên đã được duyệt vẫn dùng Agent bình thường; thành viên mới chỉ dùng được khi yêu cầu này được duyệt.`,
    resourceRefs: listAgentResourceRefs(agentId),
    scopeSummary: `Nhóm cộng tác "${group.name}" (${group.memberIds.length} người, +${added.length} mới)`,
    workspaceTargets: [{ kind: "group", name: group.name, members: group.memberIds.length, detail: `Thêm ${added.length} thành viên: ${addedNames.join(", ")}` }],
    channels: publish.channels,
    groupId: group.id, groupMemberIds: [...group.memberIds],
    reviewUnits: reviewers.units, reviewMode: reviewers.mode, addedMemberNames: addedNames,
  });
  const rec = getAgent(agentId) as { ownerId?: string; sharedWith?: string[] } | undefined;
  notificationStore.push({
    kind: "regovern_required", actorId: "system", actorName: "Hệ thống",
    recipients: [rec?.ownerId ?? group.ownerId, ...(rec?.sharedWith ?? []), group.ownerId],
    title: `${agent.name} cần duyệt lại cho ${added.length} thành viên mới của nhóm`,
    segments: [[agent.name, true], [` cần duyệt lại cho ${added.length} thành viên mới của nhóm`]],
    href: `/agents/${agentId}`, resourceId: agentId, resourceIcon: agentEmoji(agentId),
  });
}
