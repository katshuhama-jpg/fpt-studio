import { Bot, BookOpen, Puzzle, Shield, Plug, Building2 } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { ROLES, RoleId } from "./roleMeta";

type Permission = { name: string; desc: string; roles: RoleId[] };
type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

const featureGroups: FeatureGroup[] = [
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    permissions: [
      { name: "View agents", desc: "See agent configuration and conversation history.", roles: ["admin", "builder", "viewer"] },
      { name: "Chat with agents", desc: "Send messages to agents and receive responses.", roles: ["admin", "builder", "viewer"] },
      { name: "Create & edit agents", desc: "Build new agents and modify existing ones.", roles: ["admin", "builder"] },
      { name: "Publish agents", desc: "Make an agent live and available to end users.", roles: ["admin", "builder"] },
      { name: "Delete agents", desc: "Permanently remove an agent and its history.", roles: ["admin"] },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    permissions: [
      { name: "View knowledge base", desc: "Browse documents and data sources.", roles: ["admin", "builder", "viewer"] },
      { name: "Upload & manage documents", desc: "Add, edit, or reorganize knowledge sources.", roles: ["admin", "builder"] },
      { name: "Delete knowledge sources", desc: "Permanently remove documents or data sources.", roles: ["admin"] },
    ],
  },
  {
    id: "skills",
    label: "Skills & Tools",
    icon: Puzzle,
    permissions: [
      { name: "View skills", desc: "See custom skills and integrations.", roles: ["admin", "builder", "viewer"] },
      { name: "Create & edit skills", desc: "Define new skills or modify existing ones.", roles: ["admin", "builder"] },
      { name: "Delete skills", desc: "Permanently remove a skill.", roles: ["admin"] },
    ],
  },
  {
    id: "guardrails",
    label: "Guardrails",
    icon: Shield,
    permissions: [
      { name: "View guardrails", desc: "See active guardrails and their scope.", roles: ["admin", "builder", "viewer"] },
      { name: "Create & edit guardrails", desc: "Define new guardrails or change existing rules.", roles: ["admin"] },
      { name: "Enable / disable guardrails", desc: "Turn a guardrail on or off for assigned agents.", roles: ["admin"] },
    ],
  },
  {
    id: "connectors",
    label: "Connectors",
    icon: Plug,
    permissions: [
      { name: "View connectors", desc: "See connected services and their status.", roles: ["admin", "builder", "viewer"] },
      { name: "Connect & configure integrations", desc: "Add new connectors and edit configuration.", roles: ["admin", "builder"] },
      { name: "Remove connectors", desc: "Disconnect a service from the workspace.", roles: ["admin"] },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    permissions: [
      { name: "View organization structure", desc: "See units, members, and reporting lines.", roles: ["admin", "builder", "viewer"] },
      { name: "Manage members & roles", desc: "Invite, remove, or change member roles.", roles: ["admin"] },
      { name: "Manage organization settings", desc: "Edit org identity, structure, and danger zone actions.", roles: ["admin"] },
    ],
  },
];

function RoleBadge({ roleId }: { roleId: RoleId }) {
  const role = ROLES.find(r => r.id === roleId)!;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${role.bg} ${role.color}`}>
      <role.icon size={11} /> {role.name}
    </span>
  );
}

export default function Permissions() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Permissions" desc="Every permission, grouped by feature, and which roles are granted it." />

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
              <div key={p.name} className="grid grid-cols-1 sm:grid-cols-[1fr,260px] gap-2 sm:gap-6 py-4">
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                </div>
                <div className="flex flex-wrap content-start gap-1.5">
                  {p.roles.map(roleId => <RoleBadge key={roleId} roleId={roleId} />)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
