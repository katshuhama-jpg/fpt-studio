// Who may decide an Agent publish request (confirmed with Tyler 14/10):
//   - Space Admin — the role holds `requests.review-agents` (Roles → Publish requests). Decides
//     EVERY Agent request in the Space, whatever its target (any unit, the whole company,
//     Community).
//   - Unit Admin — a grant on an org unit (Organization → Structure). Inherited downward only: an
//     Admin of a unit decides requests published to that unit or any unit nested below it, never
//     to a unit above. "Org Admin" is not a separate role — it's simply the Unit Admin of the
//     root unit, which by inheritance covers every unit.
//   - One decision from anyone eligible is enough (no multi-level approval).
//   - External channel requests (turn a channel on, move channels to a newer version, approve a
//     version for channels) - Space Admin only (confirmed with Tyler 19/10).
// A request outside the viewer's scope is hidden from their Agent Requests queue entirely (not
// shown with disabled buttons). Community requests have no unit, so only Space Admins see them.
import { useCallback, useMemo } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useOrg } from "@/pages/organization/orgStore";
import { collectUnits, findPath, type OrgUnit } from "@/pages/organization/orgData";
import { requestKind, workspaceTargetsOf, type GovRequest } from "./governanceStore";

/** Seeded requests name their target departments in Vietnamese; the synced org tree names its
 * units in English. Maps those seed names to the org unit they stand for. Requests created in the
 * prototype carry real unit ids in `reviewUnits`, so this is only a fallback for the seed. */
const TARGET_NAME_TO_UNIT_ID: Record<string, string> = {
  "Phòng Nhân sự": "corp-hr",
  "Phòng Tài chính": "corp-finance",
  "Ban Pháp chế": "corp-legal",
  "Phòng Kinh doanh": "fsoft-sales",
  "Phòng Chăm sóc khách hàng": "fsc-cs",
};

/** Org units a request is published to — the units whose Admins (direct or inherited) may decide it. */
export function reviewUnitIdsOf(req: GovRequest, tree: OrgUnit): string[] {
  if (req.audience === "community") return [];
  if (req.reviewUnits?.length) return req.reviewUnits.map(u => u.id);
  const byName = new Map([tree, ...collectUnits(tree)].map(u => [u.name.toLowerCase(), u.id]));
  const ids = workspaceTargetsOf(req)
    .filter(t => t.kind === "department" || t.kind === "company")
    .map(t => TARGET_NAME_TO_UNIT_ID[t.name] ?? byName.get(t.name.toLowerCase()))
    .filter((id): id is string => !!id);
  return [...new Set(ids)];
}

/** True when `userId` is a Unit Admin of `unitId` itself or of any unit above it. */
export function isUnitAdminOf(tree: OrgUnit, unitId: string, userId: string): boolean {
  const path = findPath(tree, unitId) ?? [];
  return path.some(u => (u.unitAdmins ?? []).some(a => a.memberId === userId));
}

/** Units where `userId` holds a direct Unit Admin grant. */
export function unitsAdminedBy(tree: OrgUnit, userId: string): OrgUnit[] {
  return [tree, ...collectUnits(tree)].filter(u => (u.unitAdmins ?? []).some(a => a.memberId === userId));
}

/** Phiên bản đầu (Tyler 28/10): chỉ Space Admin duyệt Nhân sự số. Luật Unit Admin (duyệt theo
 * đơn vị, kế thừa xuống) là LATER - logic sẽ được thiết kế lại, nên tắt ở đây chứ không xoá. */
export const UNIT_ADMIN_REVIEW_ENABLED = false;

export function useAgentReviewScope() {
  const { tree } = useOrg();
  const { can, userId } = useMyPermissions();
  const isSpaceAdmin = can("requests.review-agents");
  const adminedUnits = useMemo(() => unitsAdminedBy(tree, userId), [tree, userId]);
  const isUnitAdmin = UNIT_ADMIN_REVIEW_ENABLED && adminedUnits.length > 0;

  /** Whether this viewer may see and decide this Agent request. */
  const inScope = useCallback((req: GovRequest): boolean => {
    if (req.resourceType !== "agent") return false;
    if (isSpaceAdmin) return true;
    // External channels reach people outside every unit, so only a Space Admin decides them (19/10).
    if (requestKind(req) === "channels") return false;
    if (!isUnitAdmin) return false;
    return reviewUnitIdsOf(req, tree).some(id => isUnitAdminOf(tree, id, userId));
  }, [isSpaceAdmin, isUnitAdmin, tree, userId]);

  return { isSpaceAdmin, isUnitAdmin, canOpenQueue: isSpaceAdmin || isUnitAdmin, inScope };
}

/** Who may take a live Nhân sự số down as an Admin ("Gỡ publish" by Admin) - any live version,
 * including direct publishes (Chỉ mình tôi, 1-4 người) that never went through a request. Only a
 * Space Admin (confirmed with Tyler 19/10, answering QC Q-C): they see every live Nhân sự số in the
 * list and can open it read-only. A Unit Admin never opens someone else's Nhân sự số this way - they
 * revoke through an approved request to their unit (Agent Requests › Thu hồi). */
export function useCanAdminUnpublish(agentId: string | undefined): boolean {
  const { isSpaceAdmin } = useAgentReviewScope();
  if (!agentId || agentId === "new") return false;
  return isSpaceAdmin;
}
