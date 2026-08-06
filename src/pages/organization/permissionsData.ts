import { Bot, BookOpen, Puzzle, Shield, Plug, Building2 } from "lucide-react";

export type Permission = { id: string; name: string; desc: string };
export type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

export const featureGroups: FeatureGroup[] = [
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    permissions: [
      { id: "agents.view", name: "View agents", desc: "See agent configuration and conversation history." },
      { id: "agents.chat", name: "Chat with agents", desc: "Send messages to agents and receive responses." },
      { id: "agents.create", name: "Create & edit agents", desc: "Build new agents and modify existing ones." },
      { id: "agents.publish", name: "Publish agents", desc: "Make an agent live and available to end users." },
      { id: "agents.delete", name: "Delete agents", desc: "Permanently remove an agent and its history." },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    permissions: [
      { id: "knowledge.view", name: "View knowledge base", desc: "Browse documents and data sources." },
      { id: "knowledge.manage", name: "Upload & manage documents", desc: "Add, edit, or reorganize knowledge sources." },
      { id: "knowledge.delete", name: "Delete knowledge sources", desc: "Permanently remove documents or data sources." },
    ],
  },
  {
    id: "skills",
    label: "Skills & Tools",
    icon: Puzzle,
    permissions: [
      { id: "skills.view", name: "View skills", desc: "See custom skills and integrations." },
      { id: "skills.create", name: "Create & edit skills", desc: "Define new skills or modify existing ones." },
      { id: "skills.delete", name: "Delete skills", desc: "Permanently remove a skill." },
    ],
  },
  {
    id: "guardrails",
    label: "Guardrails",
    icon: Shield,
    permissions: [
      { id: "guardrails.view", name: "View guardrails", desc: "See active guardrails and their scope." },
      { id: "guardrails.manage", name: "Create & edit guardrails", desc: "Define new guardrails or change existing rules." },
      { id: "guardrails.toggle", name: "Enable / disable guardrails", desc: "Turn a guardrail on or off for assigned agents." },
    ],
  },
  {
    id: "connectors",
    label: "Connectors",
    icon: Plug,
    permissions: [
      { id: "connectors.view", name: "View connectors", desc: "See connected services and their status." },
      { id: "connectors.manage", name: "Connect & configure integrations", desc: "Add new connectors and edit configuration." },
      { id: "connectors.remove", name: "Remove connectors", desc: "Disconnect a service from the workspace." },
    ],
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
