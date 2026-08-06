import { Card, Row } from "./shared";
import OrgStructureExplorer from "./OrgStructureExplorer";

export default function Structure() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Organization</h1>
        <p className="text-sm text-muted-foreground">Manage how your organization is structured and configured.</p>
      </div>

      <Card title="Org Info" desc="How your organization appears to teammates.">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-gradient-brand flex items-center justify-center text-2xl font-display font-bold text-primary-foreground shadow-soft">
            F
          </div>
          <div>
            <button className="btn-secondary h-9">Upload logo</button>
            <p className="text-xs text-muted-foreground mt-1.5">PNG/SVG, square, ≥ 256×256.</p>
          </div>
        </div>
        <Row label="Organization name">
          <input className="ds-input max-w-md" defaultValue="FPT Corporation" />
        </Row>
        <Row label="URL slug">
          <div className="flex items-center max-w-md">
            <span className="ds-input rounded-r-none border-r-0 bg-surface-muted text-muted-foreground !w-auto">app.fptai.com/</span>
            <input className="ds-input rounded-l-none flex-1" defaultValue="fpt-corp" />
          </div>
        </Row>
        <Row label="Default language">
          <select className="ds-input max-w-md"><option>English (US)</option><option>Tiếng Việt</option></select>
        </Row>
      </Card>

      <Card title="Org structure" desc="Units can contain members and nested sub-units, to any depth. Pick a unit to see who's in it.">
        <OrgStructureExplorer />
      </Card>

      <Card title="Danger zone" desc="Destructive actions. Cannot be undone." danger>
        <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div>
            <div className="text-sm font-semibold text-destructive">Delete organization</div>
            <div className="text-xs text-muted-foreground mt-0.5">All agents, knowledge and history will be permanently removed.</div>
          </div>
          <button className="h-9 px-3.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-base">
            Delete organization
          </button>
        </div>
      </Card>
    </div>
  );
}
