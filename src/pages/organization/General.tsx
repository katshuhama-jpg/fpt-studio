import { Card, Row, PageHeader } from "./shared";

export default function General() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="General" desc="How your organization appears to teammates." />

      <Card>
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
    </div>
  );
}
