// Which Space (internally: "tenant" — PM/Dev term only, never shown in the product) the
// person is currently working in. Space is where an Agent + its resources are built/owned:
// either someone's personal Space ("Personal Sandbox" here) or an enterprise Space (FPT Smart
// Cloud, FPT Telecom, FPT Software). This is distinct from "Agent Workspace" (agentPublishStore.ts
// / governanceStore.ts), which is where a published Agent is shared TO.
//
// sessionStorage-backed so any route can read "what Space am I in right now" without prop-
// drilling through the router — same pattern as agentPublishStore.ts / triggerStore.ts.
export type Tenant = { id: string; name: string; plan: string; initial: string };

export const TENANTS: Tenant[] = [
  { id: "fpt-smart-cloud", name: "FPT Smart Cloud", plan: "Enterprise", initial: "FS" },
  { id: "fpt-telecom",     name: "FPT Telecom",     plan: "Business",   initial: "FT" },
  { id: "fpt-software",    name: "FPT Software",    plan: "Enterprise", initial: "FW" },
  { id: "sandbox",         name: "Personal Sandbox",plan: "Free",       initial: "PS" },
];

const TENANT_KEY = "current_tenant_id";

export function getCurrentTenantId(): string {
  try {
    return sessionStorage.getItem(TENANT_KEY) ?? TENANTS[0].id;
  } catch {
    return TENANTS[0].id;
  }
}

export function setCurrentTenantId(id: string) {
  try {
    sessionStorage.setItem(TENANT_KEY, id);
  } catch {
    /* ignore (e.g. private-browsing quota) */
  }
}

/** A "Free"-plan Space is a person's own personal Space, not an enterprise one — it has no
 * company/department org structure to publish an Agent into. Enterprise/Business-plan Spaces
 * do. Drives the Agent Publish modal's Space-based gating (see PublishModal in AgentBuilder.tsx). */
export function isPersonalSpace(tenantId: string): boolean {
  const t = TENANTS.find(t => t.id === tenantId);
  return (t ?? TENANTS[0]).plan === "Free";
}
