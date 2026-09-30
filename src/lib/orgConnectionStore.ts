// Org as an independent entity, connected to a Space only through an explicit Super Admin
// action — the model chốt ở BRAINSTORM_Governance_OrgTenantPublishScope.md §10 (30/09/2026):
// Space and Org are two separate entities with NO inherent relationship in either direction.
// A Space's Publish modal only offers "Công ty / phòng ban" for the Org a Super Admin has
// connected it to; an unconnected Space (Personal Space always included, §10.3 #2) can only
// publish "Chỉ mình tôi" / "Cộng đồng". This is prototype state (sessionStorage, same pattern
// as spaceStore.ts) — not a real backend.
//
// Cardinality (§10.3 #1): 1 Space connects to exactly 1 Org; 1 Org can connect to many Spaces.
// The data model here already supports the "many Spaces" direction (several tenantIds can map
// to the same orgId) — Tyler's note: the UI to manage that fan-out isn't built yet, it's
// backlog, not P0.
import { isPersonalSpace, getAllTenants } from "./spaceStore";

export type Org = { id: string; name: string };

const ORGS_KEY = "fpt_orgs_v1";
const CONNECTIONS_KEY = "fpt_org_connections_v1";

/** One Org per pre-existing enterprise/pending Space (§10.3 #4: auto-connect 1-1, giữ nguyên
 * dữ liệu hiện có). Each Org's id equals the Space's own tenantId, so orgStore.tsx's existing
 * tree storage — already keyed by that same id — keeps holding exactly the same content it
 * always has; no data migration needed. Personal Sandbox is deliberately excluded: a Personal
 * Space never has (or needs) an Org, §10.3 #2. */
const DEFAULT_ORGS: Org[] = [
  { id: "fpt-smart-cloud", name: "FPT Smart Cloud" },
  { id: "fpt-telecom", name: "FPT Telecom" },
  { id: "fpt-software", name: "FPT Software" },
  { id: "acme-pending", name: "Ngân hàng ABC" },
];

/** tenantId -> orgId. A Personal Space is never a key here — isConnectedToOrg()/
 * getConnectedOrgId() short-circuit to "not connected" for it below, regardless of this map. */
const DEFAULT_CONNECTIONS: Record<string, string> = {
  "fpt-smart-cloud": "fpt-smart-cloud",
  "fpt-telecom": "fpt-telecom",
  "fpt-software": "fpt-software",
  "acme-pending": "acme-pending",
};

function readOrgs(): Org[] {
  try {
    const raw = sessionStorage.getItem(ORGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore (e.g. private-browsing quota) */
  }
  return DEFAULT_ORGS;
}

function readConnections(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(CONNECTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONNECTIONS };
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** In-tab subscription so OrgProvider (mounted above the router) can react immediately when a
 * Super Admin connects/disconnects a Space — sessionStorage alone doesn't fire same-tab
 * storage events, same reasoning as spaceStore.ts's subscribeTenantChange. */
export function subscribeOrgConnectionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function writeOrgs(orgs: Org[]) {
  try {
    sessionStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
  } catch {
    /* ignore */
  }
  listeners.forEach(fn => fn());
}

function writeConnections(conns: Record<string, string>) {
  try {
    sessionStorage.setItem(CONNECTIONS_KEY, JSON.stringify(conns));
  } catch {
    /* ignore */
  }
  listeners.forEach(fn => fn());
}

export function getAllOrgs(): Org[] {
  return readOrgs();
}

let orgIdCounter = 0;

/** Super Admin action: creates a brand-new, empty Org — not connected to any Space yet. */
export function createOrg(name: string): Org {
  const trimmed = name.trim() || "Tổ chức mới";
  orgIdCounter += 1;
  const org: Org = { id: `org-${Date.now()}-${orgIdCounter}`, name: trimmed };
  writeOrgs([...readOrgs(), org]);
  return org;
}

/** Which Org (if any) `tenantId`'s Space is connected to, for Publish "Công ty / phòng ban".
 * Always null for a Personal Space — never connectable, no exception (§10.3 #2). */
export function getConnectedOrgId(tenantId: string): string | null {
  if (isPersonalSpace(tenantId)) return null;
  return readConnections()[tenantId] ?? null;
}

export function isConnectedToOrg(tenantId: string): boolean {
  return getConnectedOrgId(tenantId) !== null;
}

/** Every Space currently connected to `orgId` — supports Org:Space = 1:N (§10.3 #1). */
export function getConnectedSpaceIds(orgId: string): string[] {
  const conns = readConnections();
  return Object.keys(conns).filter(t => conns[t] === orgId);
}

/**
 * Super Admin action: connects `tenantId`'s Space to `orgId`. A Space connects to exactly one
 * Org at a time (§10.3 #1) — connecting replaces any prior connection for that Space. Refuses
 * a Personal Space outright (§10.3 #2) and an unknown Org id.
 */
export function connectSpaceToOrg(tenantId: string, orgId: string): { ok: boolean; reason?: "personal_space" | "org_not_found" } {
  if (isPersonalSpace(tenantId)) return { ok: false, reason: "personal_space" };
  if (!readOrgs().some(o => o.id === orgId)) return { ok: false, reason: "org_not_found" };
  writeConnections({ ...readConnections(), [tenantId]: orgId });
  return { ok: true };
}

/** Super Admin action: disconnects `tenantId`'s Space from whichever Org it's connected to. */
export function disconnectSpace(tenantId: string): void {
  const conns = readConnections();
  if (!(tenantId in conns)) return;
  const next = { ...conns };
  delete next[tenantId];
  writeConnections(next);
}

/** Every enterprise Space (Personal Space excluded, §10.3 #2) with its current connection
 * state — feeds the Super Admin screen's Space list. */
export function listConnectableSpaces(): { tenantId: string; name: string; connectedOrgId: string | null }[] {
  return getAllTenants()
    .filter(t => !isPersonalSpace(t.id))
    .map(t => ({ tenantId: t.id, name: t.name, connectedOrgId: getConnectedOrgId(t.id) }));
}
