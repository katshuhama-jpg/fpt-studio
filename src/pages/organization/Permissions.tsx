import { Bot, BookOpen, Puzzle, Shield, Plug, Building2 } from "lucide-react";
import { Card, PageHeader } from "./shared";

type Permission = { name: string; desc: string };
type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

const featureGroups: FeatureGroup[] = [
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    permissions: [
      { name: "View agents", desc: "See agent configuration and conversation history." },
      { name: "Chat with agents", desc: "Send messages to agents and receive responses." },
      { name: "Create & edit agents", desc: "Build new agents and modify existing ones." },
      { name: "Publish agents", desc: "Make an agent live and available to end users." },
      { name: "Delete agents", desc: "Permanently remove an agent and its history." },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    permissions: [
      { name: "View knowledge base", desc: "Browse documents and data sources." },
      { name: "Upload & manage documents", desc: "Add, edit, or reorganize knowledge sources." },
      { name: "Delete knowledge sources", desc: "Permanently remove documents or data sources." },
    ],
  },
  {
    id: "skills",
    label: "Skills & Tools",
    icon: Puzzle,
    permissions: [
      { name: "View skills", desc: "See custom skills and integrations." },
      { name: "Create & edit skills", desc: "Define new skills or modify existing ones." },
      { name: "Delete skills", desc: "Permanently remove a skill." },
    ],
  },
  {
    id: "guardrails",
    label: "Guardrails",
    icon: Shield,
    permissions: [
      { name: "View guardrails", desc: "See active guardrails and their scope." },
      { name: "Create & edit guardrails", desc: "Define new guardrails or change existing rules." },
      { name: "Enable / disable guardrails", desc: "Turn a guardrail on or off for assigned agents." },
    ],
  },
  {
    id: "connectors",
    label: "Connectors",
    icon: Plug,
    permissions: [
      { name: "View connectors", desc: "See connected services and their status." },
      { name: "Connect & configure integrations", desc: "Add new connectors and edit configuration." },
      { name: "Remove connectors", desc: "Disconnect a service from the workspace." },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    permissions: [
      { name: "View organization structure", desc: "See units, members, and reporting lines." },
      { name: "Manage members & roles", desc: "Invite, remove, or change member roles." },
      { name: "Manage organization settings", desc: "Edit org identity, structure, and danger zone actions." },
    ],
  },
];

export default function Permissions() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Permissions" desc="Every permission in the workspace, grouped by feature." />

      {featureGroups.map(group => (
        <Card key={group.id}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <group.icon size={15} />
            </div>
            <h2 className="font-display text-base font-semibold">{group.label}</h2>
          </div>

          <div className="divide-y divide-border border-t border-border">
            {group.permissions.map(p => (
              <div key={p.name} className="py-4">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
