import { Bot, BookOpen, Puzzle, Shield, Plug, Building2 } from "lucide-react";

export type Permission = { id: string; name: string; desc: string };
export type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

/**
 * Creating and using Agents, Knowledge, Skills, Guardrails, and Connectors for
 * personal use is always available to every member — no permission required.
 * Everything below only applies once an item moves from "just mine" to
 * "shared with the workspace" (publish) or handed to specific people (share) —
 * from that point on, viewing, editing, and removing the shared copy is a
 * workspace-impacting action and needs a permission like any other CRUD action.
 */
function crud(prefix: string, thing: string) {
  return [
    { id: `${prefix}.view`, name: `View shared ${thing}`, desc: `See ${thing} that other people have published to the workspace.` },
    { id: `${prefix}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${thing.replace(/s$/, "")} available to the whole workspace, or share it with specific teammates.` },
    { id: `${prefix}.manage`, name: `Manage shared ${thing}`, desc: `Edit the configuration of ${thing} that are already shared.` },
    { id: `${prefix}.delete`, name: `Remove shared ${thing}`, desc: `Unpublish or permanently delete ${thing} from the workspace.` },
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
