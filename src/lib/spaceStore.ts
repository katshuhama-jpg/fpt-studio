// Which Space (internally: "tenant" — PM/Dev term only, never shown in the product) the
// person is currently working in. Space is where an Agent + its resources are built/owned:
// either someone's personal Space ("Personal Sandbox" here) or an enterprise Space (FPT Smart
// Cloud, FPT Telecom, FPT Software, or a newly-onboarded customer — see PENDING_TENANT below).
// This is distinct from "Agent Workspace" (agentPublishStore.ts / governanceStore.ts), which
// is where a published Agent is shared TO.
//
// sessionStorage-backed so any route can read "what Space am I in right now" without prop-
// drilling through the router — same pattern as agentPublishStore.ts / triggerStore.ts.
export type Tenant = {
  id: string;
  name: string;
  plan: string;
  initial: string;
  /**
   * Whether this Space's Organization has already been set up (Org profile + Company/
   * Department/Group structure). Omitted (undefined) means "yes". Only `PENDING_TENANT`
   * below starts at `false`, until its Tenant Admin completes the Organization setup wizard
   * (see orgStore.tsx's `completeOrgSetup`) — this is what drives the wizard gate in App.tsx
   * (`RequireOrgConfigured`).
   */
  orgConfigured?: boolean;
};

export const TENANTS: Tenant[] = [
  { id: "fpt-smart-cloud", name: "FPT Smart Cloud", plan: "Enterprise", initial: "FS" },
  { id: "fpt-telecom",     name: "FPT Telecom",     plan: "Business",   initial: "FT" },
  { id: "fpt-software",    name: "FPT Software",    plan: "Enterprise", initial: "FW" },
  { id: "sandbox",         name: "Personal Sandbox",plan: "Free",       initial: "PS" },
];

/**
 * A Space is provisioned by a Super Admin (creating the Tenant and inviting its Tenant Admin)
 * — a Tenant Admin never creates their own Space. That provisioning step is out of scope for
 * this round (see BRAINSTORM_Governance_OrgTenantPublishScope.md), so this fixed entry stands
 * in for "Super Admin already provisioned this Space for a newly-onboarded customer and
 * invited you as its Tenant Admin." Its Organization starts empty (`orgConfigured: false`)
 * until the Organization setup wizard is completed from inside it.
 *
 * Deliberately kept OUT of `TENANTS` above: orgStore.tsx only gives the 4 original Spaces
 * FPT's seeded Organization tree, so this one correctly starts with an empty tree instead.
 */
const PENDING_TENANT: Tenant = { id: "acme-pending", name: "Ngân hàng ABC", plan: "Enterprise", initial: "AB", orgConfigured: false };

const TENANT_KEY = "current_tenant_id";
const PENDING_CONFIGURED_KEY = "pending_tenant_org_configured";

export function getCurrentTenantId(): string {
  try {
    return sessionStorage.getItem(TENANT_KEY) ?? TENANTS[0].id;
  } catch {
    return TENANTS[0].id;
  }
}

/** In-tab subscription so parts of the app mounted outside the component that calls
 * `setCurrentTenantId` (notably `OrgProvider`, mounted above the router) can react to a Space
 * switch immediately — sessionStorage alone doesn't fire same-tab storage events. */
type TenantChangeListener = () => void;
const tenantChangeListeners = new Set<TenantChangeListener>();

export function subscribeTenantChange(fn: TenantChangeListener): () => void {
  tenantChangeListeners.add(fn);
  return () => tenantChangeListeners.delete(fn);
}

export function setCurrentTenantId(id: string) {
  try {
    sessionStorage.setItem(TENANT_KEY, id);
  } catch {
    /* ignore (e.g. private-browsing quota) */
  }
  tenantChangeListeners.forEach(fn => fn());
}

/** Every Space a Tenant Admin can switch into — the 4 seed Spaces plus the pending one above.
 * Call this instead of reading `TENANTS` directly anywhere the full switcher list is needed. */
export function getAllTenants(): Tenant[] {
  return [...TENANTS, PENDING_TENANT];
}

/** Whether `tenantId`'s Organization is set up — always true except for `PENDING_TENANT`
 * before its setup wizard completes (persisted across reloads via sessionStorage). */
export function isOrgConfigured(tenantId: string): boolean {
  if (tenantId !== PENDING_TENANT.id) return true;
  try {
    return sessionStorage.getItem(PENDING_CONFIGURED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOrgConfigured(tenantId: string) {
  if (tenantId !== PENDING_TENANT.id) return;
  try {
    sessionStorage.setItem(PENDING_CONFIGURED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** A "Free"-plan Space is a person's own personal Space, not an enterprise one — it has no
 * company/department org structure to publish an Agent into. Enterprise/Business-plan Spaces
 * do. Drives the Agent Publish modal's Space-based gating (see PublishModal in AgentBuilder.tsx). */
export function isPersonalSpace(tenantId: string): boolean {
  const t = getAllTenants().find(t => t.id === tenantId);
  return (t ?? TENANTS[0]).plan === "Free";
}
