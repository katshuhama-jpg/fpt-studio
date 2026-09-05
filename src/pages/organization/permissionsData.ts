import { Bot, BookOpen, Puzzle, Shield, Plug, Users, Network } from "lucide-react";

export type Permission = { id: string; name: string; desc: string; implies?: string[] };
export type Section = "console" | "governance" | "org-management";
export type FeatureGroup = { id: string; label: string; icon: any; section: Section; permissions: Permission[] };

export const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: "console", label: "Console", desc: "Viewing, publishing, managing, pausing, and deleting agents, knowledge, skills, guardrails, and connectors in the shared workspace." },
  { id: "governance", label: "Governance", desc: "Managing roles and members across the organization." },
  { id: "org-management", label: "Organization Management", desc: "Managing the unit structure and unit admins." },
];

/**
 * Using an already-created Agent, Knowledge source, Skill, Guardrail, or Connector
 * is always free — no permission required, and anyone can already see what's live.
 * Creating a new one (even for personal use only) requires the Create permission;
 * publishing, building, or removing something from the workspace is what the rest
 * of these permissions control.
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

/** Resource wording per publishable group, keyed by group id — reused wherever copy needs to
 * name "the resource" generically (e.g. the View Permissions reference's Scope-neutral copy)
 * without hand-writing it per group. */
export const RESOURCE_WORDS: Record<string, { thing: string; singular: string }> = Object.fromEntries(
  FEATURES.map(f => [f.id, { thing: f.thing, singular: singularOf(f.thing) }]),
);

export const featureGroups: FeatureGroup[] = [
  // ── Console: per-feature publish/manage/(pause)/delete ──────────────────
  ...FEATURES.map(({ id, label, icon, thing }) => {
    const singular = singularOf(thing);
    const permissions: Permission[] = [
      { id: `${id}.view`, name: `View ${thing}`, desc: `See every live ${singular} across the whole workspace, including ones not shared with you. Not required to publish or manage your own ${thing}.` },
      { id: `${id}.create`, name: `Create ${thing}`, desc: `Create a new ${singular}, including one only for personal use.` },
      { id: `${id}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${singular} available to the whole workspace, or share it with specific teammates. Doesn't require "View ${thing}" — you can always publish your own.` },
      { id: `${id}.manage`, name: `Build ${thing}`, desc: `Edit a live ${singular}'s configuration in the workspace. Doesn't require "View ${thing}" — you can always manage your own.` },
      { id: `${id}.pause`, name: `Pause ${thing}`, desc: `Pause or resume a live ${singular} in the workspace without deleting it.` },
    ];
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
      { id: "roles.view", name: "View roles", desc: "See the list of roles and what each one grants." },
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
      { id: "members.view", name: "View members", desc: "See the list of members and the role each one has." },
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
