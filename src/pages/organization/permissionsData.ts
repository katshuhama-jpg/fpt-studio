import { Bot, BookOpen, Puzzle, Shield, Plug, Building2, ClipboardCheck, Users, Network } from "lucide-react";

export type Permission = { id: string; name: string; desc: string; implies?: string[] };
export type Section = "console" | "governance" | "org-management";
export type FeatureGroup = { id: string; label: string; icon: any; section: Section; permissions: Permission[] };

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "console", label: "Console" },
  { id: "governance", label: "Governance" },
  { id: "org-management", label: "Organization Management" },
];

/**
 * Creating and using Agents, Knowledge, Skills, Guardrails, and Connectors for
 * personal use is always available to every member — no permission required,
 * and anyone can already see what's live. Publishing, approving, editing, or
 * removing something from the workspace is what these permissions control.
 */
const FEATURES = [
  { id: "agents", label: "Agents", icon: Bot, thing: "agents" },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, thing: "knowledge sources" },
  { id: "skills", label: "Skills", icon: Puzzle, thing: "skills" },
  { id: "guardrails", label: "Guardrails", icon: Shield, thing: "guardrails" },
  { id: "connectors", label: "Connectors", icon: Plug, thing: "connectors" },
];

function singularOf(thing: string) {
  return thing.replace(/s$/, "");
}

export const featureGroups: FeatureGroup[] = [
  // ── Console: per-feature publish/manage/delete ──────────────────────────
  ...FEATURES.map(({ id, label, icon, thing }) => {
    const singular = singularOf(thing);
    return {
      id,
      label,
      icon,
      section: "console" as Section,
      permissions: [
        { id: `${id}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${singular} available to the whole workspace, or share it with specific teammates.` },
        { id: `${id}.manage`, name: `Manage ${thing}`, desc: `Edit the configuration of a live ${singular} in the workspace.` },
        { id: `${id}.delete`, name: `Delete ${thing}`, desc: `Permanently delete a live ${singular} from the workspace.` },
      ],
    };
  }),

  // ── Governance: Roles, Members, Approvals ───────────────────────────────
  {
    id: "roles",
    label: "Roles",
    icon: Shield,
    section: "governance",
    permissions: [
      { id: "roles.manage", name: "Manage roles", desc: "Create, edit, and delete custom roles, and control which permissions each one grants." },
    ],
  },
  {
    id: "members",
    label: "Members",
    icon: Users,
    section: "governance",
    permissions: [
      { id: "members.manage", name: "Manage members", desc: "Invite, remove, and reassign the role of members across the organization." },
    ],
  },
  {
    id: "approvals",
    label: "Publish Approvals",
    icon: ClipboardCheck,
    section: "governance",
    permissions: FEATURES.map(({ id, thing }) => {
      const singular = singularOf(thing);
      const isAgents = id === "agents";
      return {
        id: `${id}.approve`,
        name: `Approve ${thing}`,
        desc: isAgents
          ? "Review and approve another member's request to publish an agent — including any knowledge, skills, guardrails, or connectors bundled with it."
          : `Review and approve another member's request to publish a ${singular} on its own, outside of an agent.`,
        implies: isAgents ? FEATURES.filter(f => f.id !== "agents").map(f => `${f.id}.approve`) : undefined,
      };
    }),
  },

  // ── Organization Management: Structure, General ─────────────────────────
  {
    id: "structure",
    label: "Structure",
    icon: Network,
    section: "org-management",
    permissions: [
      { id: "structure.view", name: "View organization structure", desc: "See units, members, and reporting lines." },
      { id: "structure.unit-admins", name: "Manage unit admins", desc: "Assign or remove Unit Admins, who can approve publishes within their unit and every unit nested below it." },
    ],
  },
  {
    id: "general",
    label: "General",
    icon: Building2,
    section: "org-management",
    permissions: [
      { id: "settings.manage", name: "Manage organization settings", desc: "Edit the organization's name, logo, URL slug, and default language." },
    ],
  },
];

export const ALL_PERMISSION_IDS: string[] = featureGroups.flatMap(g => g.permissions.map(p => p.id));
