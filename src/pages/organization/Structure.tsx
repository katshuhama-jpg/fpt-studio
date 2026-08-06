import { Building2, Users } from "lucide-react";
import { Card, Row } from "./shared";

const departments = [
  { name: "Engineering", lead: "Tran Nam", members: 18, sub: ["Platform", "AI/ML", "Mobile"] },
  { name: "Product", lead: "Linh Phan", members: 6 },
  { name: "Customer Success", lead: "Duy Nguyen", members: 9 },
  { name: "Sales & Partnerships", lead: "Mai Hoang", members: 12 },
];

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Organization</h1>
        <p className="text-sm text-muted-foreground">Manage how your organization is structured and configured.</p>
      </div>

      <Card title="Workspace identity" desc="How your workspace appears to teammates.">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-gradient-brand flex items-center justify-center text-2xl font-display font-bold text-primary-foreground shadow-soft">
            F
          </div>
          <div>
            <button className="btn-secondary h-9">Upload logo</button>
            <p className="text-xs text-muted-foreground mt-1.5">PNG/SVG, square, ≥ 256×256.</p>
          </div>
        </div>
        <Row label="Workspace name">
          <input className="ds-input max-w-md" defaultValue="FPT Smart Cloud" />
        </Row>
        <Row label="URL slug">
          <div className="flex items-center max-w-md">
            <span className="ds-input rounded-r-none border-r-0 bg-surface-muted text-muted-foreground !w-auto">app.fptai.com/</span>
            <input className="ds-input rounded-l-none flex-1" defaultValue="fpt-smart-cloud" />
          </div>
        </Row>
        <Row label="Default language">
          <select className="ds-input max-w-md"><option>English (US)</option><option>Tiếng Việt</option></select>
        </Row>
      </Card>

      <Card title="Org structure" desc="Departments and teams in this organization.">
        <div className="space-y-3">
          {departments.map(d => (
            <div key={d.name} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Building2 size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground truncate">Led by {d.lead}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-surface-muted border border-border text-muted-foreground shrink-0">
                  <Users size={11} /> {d.members} members
                </span>
              </div>
              {d.sub && (
                <div className="flex flex-wrap gap-1.5 mt-3 pl-[42px]">
                  {d.sub.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-md bg-surface-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Danger zone" desc="Destructive actions. Cannot be undone." danger>
        <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div>
            <div className="text-sm font-semibold text-destructive">Delete workspace</div>
            <div className="text-xs text-muted-foreground mt-0.5">All agents, knowledge and history will be permanently removed.</div>
          </div>
          <button className="h-9 px-3.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-base">
            Delete workspace
          </button>
        </div>
      </Card>
    </div>
  );
}
