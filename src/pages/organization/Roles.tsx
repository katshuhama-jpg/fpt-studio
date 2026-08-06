import { Card, PageHeader } from "./shared";
import { ROLES } from "./roleMeta";

const perms: Record<string, string[]> = {
  admin: ["Manage workspace settings", "Manage members & billing", "Full agent access"],
  builder: ["Create & edit agents", "Manage knowledge & tools", "Cannot manage members"],
  viewer: ["View agents & analytics", "Chat with agents", "No editing rights"],
};

export default function Roles() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Roles" desc="What each role can do in this workspace." />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLES.map(r => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <r.icon size={14} className={r.color} />
                <span className="font-semibold text-sm">{r.name}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {perms[r.id].map(p => <li key={p} className="flex gap-1.5"><span>•</span>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
