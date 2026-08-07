import { Bot, BookOpen, Puzzle, Shield, Plug, Building2, ClipboardCheck } from "lucide-react";

export type Permission = { id: string; name: string; desc: string; implies?: string[] };
export type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

/**
 * Creating and using Agents, Knowledge, Skills, Guardrails, and Connectors for
 * personal use is always available to every member — no permission required,
 * and anyone can already see what's live. Publishing, approving, editing, or
 * removing something from the workspace is what these permissions control.
 */
const FEATURES = [
  { id: "agents", label: "Agents", icon: Bot, thing: "agents" },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, thing: "knowledge sources" },
  { id: "skills", label: "Skills & Tools", icon: Puzzle, thing: "skills" },
  { id: "guardrails", label: "Guardrails", icon: Shield, thing: "guardrails" },
  { id: "connectors", label: "Connectors", icon: Plug, thing: "connectors" },
];

function singularOf(thing: string) {
  return thing.replace(/s$/, "");
}

function article(singular: string) {
  return /^[aeiou]/i.test(singular) ? "an" : "a";
}

export const featureGroups: FeatureGroup[] = [
  ...FEATURES.map(({ id, label, icon, thing }) => {
    const singular = singularOf(thing);
    return {
      id,
      label,
      icon,
      permissions: [
        { id: `${id}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${singular} available to the whole workspace, or share it with specific teammates.` },
        { id: `${id}.manage`, name: `Manage ${thing}`, desc: `Edit the configuration of a live ${singular} in the workspace.` },
        { id: `${id}.delete`, name: `Delete ${thing}`, desc: `Permanently delete a live ${singular} from the workspace.` },
      ],
    };
  }),
  {
    id: "approvals",
    label: "Publish approvals",
    icon: ClipboardCheck,
    permissions: FEATURES.map(({ id, thing }) => {
      const singular = singularOf(thing);
      return {
        id: `${id}.approve`,
        name: `Approve ${thing}`,
        desc: `Review and approve another member's request to publish ${article(singular)} ${singular} — separate from publishing your own.`,
      };
    }),
  },
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    permissions: [
      { id: "organization.view", name: "View organization structure", desc: "See units, members, and reporting lines." },
      { id: "organization.members", name: "Manage members & roles", desc: "Invite, remove, or change member roles." },
      { id: "organization.settings", name: "Manage organization settings", desc: "Edit org identity, structure, and danger zone actions." },
    ],
  },
];

export const ALL_PERMISSION_IDS: string[] = featureGroups.flatMap(g => g.permissions.map(p => p.id));
