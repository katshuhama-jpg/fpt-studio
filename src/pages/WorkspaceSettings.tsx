import { useState } from "react";
import {
  Building2, Users, CreditCard, Shield, Bell, Plug, Globe, Plus, MoreVertical,
  Search, Mail, Crown, Trash2,
} from "lucide-react";

type TabId = "general" | "members" | "billing" | "security" | "notifications" | "integrations" | "domains";

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "members", label: "Members", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "domains", label: "Domains", icon: Globe },
];

export default function WorkspaceSettings() {
  const [tab, setTab] = useState<TabId>("general");

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">Configure your workspace, manage members and billing — all in one place.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-8">
        {/* Vertical tabs (Linear-style) */}
        <nav className="space-y-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-base ${
                tab === t.id
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === "general" && <GeneralPanel />}
          {tab === "members" && <MembersPanel />}
          {tab !== "general" && tab !== "members" && <SoonPanel title={tabs.find(t => t.id === tab)!.label} />}
        </div>
      </div>
    </div>
  );
}

function GeneralPanel() {
  return (
    <div className="space-y-6">
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

function MembersPanel() {
  return (
    <div className="space-y-6">
      <Card
        title="Members"
        desc="Invite teammates and assign workspace-level roles. Agent-level access is managed per agent."
        action={
          <button className="btn-primary h-9">
            <Plus size={14} /> Invite member
          </button>
        }
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search members…" className="ds-input pl-8 h-9" />
          </div>
          <div className="flex items-center gap-1 text-xs">
            {["All", "Admin", "Builder", "Viewer", "Pending"].map((f, i) => (
              <button
                key={f}
                className={`px-2.5 h-7 rounded-md font-medium transition-base ${
                  i === 0 ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-border">
          <div className="grid grid-cols-[1fr,140px,140px,40px] gap-3 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Member</div><div>Role</div><div>Joined</div><div></div>
          </div>
          {members.map(m => (
            <div key={m.email} className="grid grid-cols-[1fr,140px,140px,40px] gap-3 px-4 py-3 border-t border-border items-center hover:bg-surface-muted/50 transition-base group">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full ${m.bg} flex items-center justify-center text-xs font-semibold shrink-0`}>
                  {m.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {m.name}
                    {m.isYou && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-soft text-primary font-semibold">You</span>}
                    {m.pending && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-soft text-warning font-semibold">Pending</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail size={10} /> {m.email}
                  </div>
                </div>
              </div>
              <div>
                <button className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-surface-muted hover:bg-surface border border-border">
                  {m.role === "Admin" && <Crown size={11} className="text-warning" />}
                  {m.role}
                </button>
              </div>
              <div className="text-xs text-muted-foreground">{m.joined}</div>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base">
                {m.pending ? <Trash2 size={13} /> : <MoreVertical size={13} />}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Roles & permissions" desc="What each role can do in this workspace.">
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

function SoonPanel({ title }: { title: string }) {
  return (
    <Card title={title} desc="This panel is part of the v2 expansion.">
      <div className="py-12 text-center text-sm text-muted-foreground">Coming soon.</div>
    </Card>
  );
}

function Card({ title, desc, children, action, danger }: any) {
  return (
    <section className={`rounded-xl bg-surface border ${danger ? "border-destructive/30" : "border-border"} p-6`}>
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className={`font-display text-base font-semibold ${danger ? "text-destructive" : ""}`}>{title}</h2>
          {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-3 mb-4 last:mb-0 items-center">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div>{children}</div>
    </div>
  );
}

const members = [
  { name: "Tran Nam", email: "nam.tran@fpt.com", role: "Admin", joined: "Jan 2025", initials: "TN", bg: "bg-primary-soft text-primary", isYou: true },
  { name: "Linh Phan", email: "linh.phan@fpt.com", role: "Builder", joined: "Feb 2025", initials: "LP", bg: "bg-accent-soft text-accent" },
  { name: "Duy Nguyen", email: "duy.nguyen@fpt.com", role: "Builder", joined: "Mar 2025", initials: "DN", bg: "bg-info/15 text-info" },
  { name: "Mai Hoang", email: "mai.hoang@partner.com", role: "Viewer", joined: "Apr 2025", initials: "MH", bg: "bg-surface-muted text-foreground" },
  { name: "—", email: "huy.le@fpt.com", role: "Builder", joined: "—", initials: "HL", bg: "bg-warning-soft text-warning", pending: true },
];

const roles = [
  { name: "Admin", icon: Crown, color: "text-warning", perms: ["Manage workspace settings", "Manage members & billing", "Full agent access"] },
  { name: "Builder", icon: Users, color: "text-primary", perms: ["Create & edit agents", "Manage knowledge & tools", "Cannot manage members"] },
  { name: "Viewer", icon: Users, color: "text-muted-foreground", perms: ["View agents & analytics", "Chat with agents", "No editing rights"] },
];
