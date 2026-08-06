import { Crown, Users } from "lucide-react";
import { Card } from "./shared";

const roles = [
  { name: "Admin", icon: Crown, color: "text-warning", perms: ["Manage workspace settings", "Manage members & billing", "Full agent access"] },
  { name: "Builder", icon: Users, color: "text-primary", perms: ["Create & edit agents", "Manage knowledge & tools", "Cannot manage members"] },
  { name: "Viewer", icon: Users, color: "text-muted-foreground", perms: ["View agents & analytics", "Chat with agents", "No editing rights"] },
];

export default function Roles() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <Card title="Roles" desc="What each role can do in this workspace.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {roles.map(r => (
            <div key={r.name} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <r.icon size={14} className={r.color} />
                <span className="font-semibold text-sm">{r.name}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {r.perms.map(p => <li key={p} className="flex gap-1.5"><span>•</span>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
