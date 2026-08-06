import { Info } from "lucide-react";
import { Card, PageHeader } from "./shared";
import { featureGroups } from "./permissionsData";

export default function Permissions() {
  const orgGroup = featureGroups.find(g => g.id === "organization")!;
  const shareGroups = featureGroups.filter(g => g.id !== "organization");

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Permissions" desc="Personal use is always free. These permissions only control publishing and sharing to the workspace." />

      <div className="rounded-xl border border-info/20 bg-info/5 p-4 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
          <Info size={15} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Everyone can build and use — privately</div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Every member can already create and use agents, knowledge, skills, guardrails, and connectors for their own personal use — no permission needed.
            A role only needs a permission below once someone <span className="text-foreground font-medium">publishes</span> that item to the shared workspace,
            or <span className="text-foreground font-medium">shares</span> it directly with other people.
          </p>
        </div>
      </div>

      <Card title="Publish & share to workspace" desc="One gate per feature — required only when something personal becomes shared.">
        <div className="divide-y divide-border border-t border-border">
          {shareGroups.map(group => (
            <div key={group.id} className="flex items-center gap-3 py-4">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <group.icon size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{group.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{group.permissions[0].desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Organization" desc="Managing the shared workspace itself is always permission-gated.">
        <div className="divide-y divide-border border-t border-border">
          {orgGroup.permissions.map(p => (
            <div key={p.id} className="py-4">
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
