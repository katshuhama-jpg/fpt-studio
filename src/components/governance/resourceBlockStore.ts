// sessionStorage-backed "policy gate" for Governance (simplified version of item #10 — a toggle
// per resource, not a full policy engine). Workspace admins can block a specific Guardrail or
// Connector from being used in any NEW agent — this is a hard block enforced at submit time in
// AgentBuilder's Publish flow (see PublishModal.doPublish), not a review step: a bundle that
// references a blocked resource never becomes a governance request in the first place.
//
// Deliberately narrow scope (confirmed with PO): per-resource toggle, agent-publish-time only.
// Does not touch resources already in use by an already-approved/published agent — blocking is
// forward-looking ("don't let anyone build on this going forward"), not retroactive revocation
// (that's what Requests > revoke, item #8, is for).
import { loadSet, saveSet } from "@/lib/sessionPersist";

export type BlockableResourceType = "guardrail" | "connector";

const KEY = "governance_blocked_resources_v1";
const blocked = loadSet<string>(KEY);
const persist = () => saveSet(KEY, blocked);

const key = (type: BlockableResourceType, id: string) => `${type}:${id}`;

export const resourceBlockStore = {
  isBlocked(type: BlockableResourceType, id: string): boolean {
    return blocked.has(key(type, id));
  },
  setBlocked(type: BlockableResourceType, id: string, value: boolean) {
    if (value) blocked.add(key(type, id));
    else blocked.delete(key(type, id));
    persist();
  },
  listBlocked(): string[] {
    return [...blocked];
  },
};
