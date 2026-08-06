import { Bot, BookOpen, Puzzle, Shield, Plug, Building2 } from "lucide-react";

export type Permission = { id: string; name: string; desc: string };
export type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

/**
 * Creating and using Agents, Knowledge, Skills, Guardrails, and Connectors for
 * personal use is always available to every member — no permission required,
 * and anyone can already see what's been published. Everything below only
 * applies to the act of publishing itself: requesting it, approving it,
 * editing something already live, or taking it back down.
 */
function crud(prefix: string, thing: string) {
  const singular = thing.replace(/s$/, "");
  return [
    { id: `${prefix}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${singular} available to the whole workspace, or share it with specific teammates.` },
    { id: `${prefix}.approve`, name: `Approve ${singular} publishing`, desc: `Review and approve another member's request to publish a ${singular} before it goes live — separate from publishing your own.` },
    { id: `${prefix}.manage`, name: `Manage published ${thing}`, desc: `Edit the configuration of a ${singular} that's already published.` },
    { id: `${prefix}.delete`, name: `Remove published ${thing}`, desc: `Unpublish or permanently delete a published ${singular}.` },
  ];
}

export const featureGroups: FeatureGroup[] = [
  { id: "agents", label: "Agents", icon: Bot, permissions: crud("agents", "agents") },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, permissions: crud("knowledge", "knowledge sources") },
  { id: "skills", label: "Skills & Tools", icon: Puzzle, permissions: crud("skills", "skills") },
  { id: "guardrails", label: "Guardrails", icon: Shield, permissions: crud("guardrails", "guardrails") },
  { id: "connectors", label: "Connectors", icon: Plug, permissions: crud("connectors", "connectors") },
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
