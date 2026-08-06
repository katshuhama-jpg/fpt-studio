import { Card, PageHeader } from "./shared";
import { featureGroups } from "./permissionsData";

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
              <div key={p.id} className="py-4">
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
