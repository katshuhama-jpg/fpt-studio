import { Bot, BookOpen, Puzzle, Shield, Plug, Users, Network } from "lucide-react";

export type Permission = { id: string; name: string; desc: string; implies?: string[] };
export type Section = "console" | "governance" | "org-management";
export type FeatureGroup = { id: string; label: string; icon: any; section: Section; permissions: Permission[] };

export const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: "console", label: "Console", desc: "Publishing, managing, pausing, and deleting agents, knowledge, skills, guardrails, and connectors in the shared workspace." },
  { id: "governance", label: "Governance", desc: "Managing roles and members across the organization." },
  { id: "org-management", label: "Organization Management", desc: "Managing the unit structure and unit admins." },
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
  // ── Console: per-feature publish/manage/(pause)/delete ──────────────────
  ...FEATURES.map(({ id, label, icon, thing }) => {
    const singular = singularOf(thing);
    const permissions: Permission[] = [
      { id: `${id}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${singular} available to the whole workspace, or share it with specific teammates.` },
      { id: `${id}.manage`, name: `Manage ${thing}`, desc: `Edit the configuration of a live ${singular} in the workspace.` },
    ];
    if (id === "agents") {
      permissions.push({ id: "agents.pause", name: "Pause agents", desc: "Pause or resume a live agent in the workspace, taking it temporarily offline without deleting it." });
    }
    permissions.push({ id: `${id}.delete`, name: `Delete ${thing}`, desc: `Permanently delete a live ${singular} from the workspace.` });
    return { id, label, icon, section: "console" as Section, permissions };
  }),

  // ── Governance: Roles, Members ───────────────────────────────────────────
  {
    id: "roles",
    label: "Roles",
    icon: Shield,
    section: "governance",
    permissions: [
      { id: "roles.create", name: "Create roles", desc: "Create a new custom role." },
      { id: "roles.edit", name: "Edit roles", desc: "Change an existing role's name or the permissions it grants." },
      { id: "roles.delete", name: "Delete roles", desc: "Delete a custom role that's no longer needed." },
    ],
  },
  {
    id: "members",
    label: "Members",
    icon: Users,
    section: "governance",
    permissions: [
      { id: "members.invite", name: "Invite members", desc: "Invite a new person to join the organization." },
      { id: "members.manage", name: "Manage members", desc: "Reassign a member's role, or move them between units." },
      { id: "members.remove", name: "Remove members", desc: "Remove a member from the organization." },
    ],
  },

  // ── Organization Management: Structure ───────────────────────────────────
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
];

export const ALL_PERMISSION_IDS: string[] = featureGroups.flatMap(g => g.permissions.map(p => p.id));
