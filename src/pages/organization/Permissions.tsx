import { Check, X } from "lucide-react";
import { Card } from "./shared";

const capabilities = [
  { name: "Manage workspace settings", admin: true, builder: false, viewer: false },
  { name: "Manage members & billing", admin: true, builder: false, viewer: false },
  { name: "Create & edit agents", admin: true, builder: true, viewer: false },
  { name: "Manage knowledge & tools", admin: true, builder: true, viewer: false },
  { name: "View agents & analytics", admin: true, builder: true, viewer: true },
  { name: "Chat with agents", admin: true, builder: true, viewer: true },
];

function Mark({ on }: { on: boolean }) {
  return on
    ? <Check size={15} className="text-primary mx-auto" />
    : <X size={15} className="text-muted-foreground/40 mx-auto" />;
}

export default function Permissions() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Organization</h1>
        <p className="text-sm text-muted-foreground">Manage how your organization is structured and configured.</p>
      </div>

      <Card title="Permissions" desc="What each role can access, at a glance.">
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="grid grid-cols-[1fr,90px,90px,90px] gap-3 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Capability</div>
            <div className="text-center">Admin</div>
            <div className="text-center">Builder</div>
            <div className="text-center">Viewer</div>
          </div>
          {capabilities.map(c => (
            <div key={c.name} className="grid grid-cols-[1fr,90px,90px,90px] gap-3 px-4 py-3 border-t border-border items-center">
              <div className="text-sm">{c.name}</div>
              <Mark on={c.admin} />
              <Mark on={c.builder} />
              <Mark on={c.viewer} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
