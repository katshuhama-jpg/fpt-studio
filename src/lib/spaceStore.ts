// Which Space (internally: "tenant" — PM/Dev term only, never shown in the product) the
// person is currently working in. Space is where an Agent + its resources are built/owned:
// either someone's personal Space ("Personal Sandbox" here) or an enterprise Space (FPT Smart
// Cloud, FPT Telecom, FPT Software, or one created on the fly below). This is distinct from
// "Agent Workspace" (agentPublishStore.ts / governanceStore.ts), which is where a published
// Agent is shared TO.
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
   * Department/Group structure). Omitted (undefined) means "yes" — every pre-existing seed
   * Space below already has its Organization configured. Only a brand-new Space created via
   * "Create new Space" starts at `false`, until its Tenant Admin completes the Organization
   * setup wizard (see orgStore.tsx's `completeOrgSetup`) — this is what drives the wizard
   * gate in App.tsx (`RequireOrgConfigured`).
   */
  orgConfigured?: boolean;
};

export const TENANTS: Tenant[] = [
  { id: "fpt-smart-cloud", name: "FPT Smart Cloud", plan: "Enterprise", initial: "FS" },
  { id: "fpt-telecom",     name: "FPT Telecom",     plan: "Business",   initial: "FT" },
  { id: "fpt-software",    name: "FPT Software",    plan: "Enterprise", initial: "FW" },
  { id: "sandbox",         name: "Personal Sandbox",plan: "Free",       initial: "PS" },
];

const TENANT_KEY = "current_tenant_id";
const CUSTOM_TENANTS_KEY = "custom_tenants_v1";

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

function readCustomTenants(): Tenant[] {
  try {
    const raw = sessionStorage.getItem(CUSTOM_TENANTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomTenants(list: Tenant[]) {
  try {
    sessionStorage.setItem(CUSTOM_TENANTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** First letter of the first word + first letter of the last word, uppercased — same scheme
 * as the seed Tenants' `initial` above (e.g. "FPT Smart Cloud" -> "FS"). */
function deriveInitial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** Seed Spaces + any Spaces created this session via "Create new Space". Call this instead of
 * reading `TENANTS` directly anywhere the list needs to reflect newly-created Spaces. */
export function getAllTenants(): Tenant[] {
  return [...TENANTS, ...readCustomTenants()];
}

/**
 * Creates a brand-new enterprise Space with an empty Organization (`orgConfigured: false`) —
 * this is the "Create new Space" action. Its Organization stays empty until the Tenant Admin
 * (here: whoever is using the demo) completes the Organization setup wizard, which is gated in
 * automatically the next time this Space is active (see `RequireOrgConfigured` in App.tsx).
 * Does not touch any existing Space's data — in particular the FPT Spaces' Organization is
 * untouched.
 */
export function addTenant(name: string): Tenant {
  const trimmed = name.trim() || "Doanh nghiệp mới";
  const tenant: Tenant = {
    id: `space-${Date.now()}`,
    name: trimmed,
    plan: "Enterprise",
    initial: deriveInitial(trimmed),
    orgConfigured: false,
  };
  const custom = readCustomTenants();
  custom.push(tenant);
  writeCustomTenants(custom);
  return tenant;
}

export function isOrgConfigured(tenantId: string): boolean {
  const t = getAllTenants().find(t => t.id === tenantId);
  return t?.orgConfigured !== false;
}

export function markOrgConfigured(tenantId: string) {
  const custom = readCustomTenants();
  const idx = custom.findIndex(t => t.id === tenantId);
  if (idx >= 0) {
    custom[idx] = { ...custom[idx], orgConfigured: true };
    writeCustomTenants(custom);
  }
}

/** A "Free"-plan Space is a person's own personal Space, not an enterprise one — it has no
 * company/department org structure to publish an Agent into. Enterprise/Business-plan Spaces
 * do. Drives the Agent Publish modal's Space-based gating (see PublishModal in AgentBuilder.tsx). */
export function isPersonalSpace(tenantId: string): boolean {
  const t = getAllTenants().find(t => t.id === tenantId);
  return (t ?? TENANTS[0]).plan === "Free";
}
