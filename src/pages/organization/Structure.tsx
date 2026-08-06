import { useState } from "react";
import { Building2, Users, ChevronRight, ChevronDown } from "lucide-react";
import { Card, Row } from "./shared";

type OrgMember = { id: string; name: string; role: string; initials: string };
type OrgUnit = { id: string; name: string; lead?: string; members: OrgMember[]; units: OrgUnit[] };

const orgTree: OrgUnit = {
  id: "fpt",
  name: "FPT Corporation",
  lead: "Truong Gia Binh",
  members: [
    { id: "m-chair", name: "Truong Gia Binh", role: "Chairman", initials: "TB" },
  ],
  units: [
    {
      id: "fsoft",
      name: "FPT Software",
      lead: "Tran Nam",
      members: [
        { id: "m-fsoft-ceo", name: "Tran Nam", role: "CEO", initials: "TN" },
        { id: "m-fsoft-coo", name: "Linh Phan", role: "COO", initials: "LP" },
      ],
      units: [
        {
          id: "fsoft-vn",
          name: "Vietnam Delivery",
          lead: "Duy Nguyen",
          members: [{ id: "m-fsoft-vn-1", name: "Duy Nguyen", role: "Delivery Director", initials: "DN" }],
          units: [
            {
              id: "fsoft-vn-platform",
              name: "Platform Engineering",
              lead: "Mai Hoang",
              members: [
                { id: "m-plat-1", name: "Mai Hoang", role: "Engineering Manager", initials: "MH" },
                { id: "m-plat-2", name: "Huy Le", role: "Senior Engineer", initials: "HL" },
                { id: "m-plat-3", name: "Bao Tran", role: "Engineer", initials: "BT" },
              ],
              units: [],
            },
            {
              id: "fsoft-vn-aiml",
              name: "AI/ML",
              lead: "Quang Vu",
              members: [
                { id: "m-aiml-1", name: "Quang Vu", role: "AI Lead", initials: "QV" },
                { id: "m-aiml-2", name: "Thao Nguyen", role: "ML Engineer", initials: "TN2" },
              ],
              units: [],
            },
          ],
        },
        {
          id: "fsoft-jp",
          name: "Japan Delivery",
          lead: "Kenji Sato",
          members: [{ id: "m-fsoft-jp-1", name: "Kenji Sato", role: "Country Director", initials: "KS" }],
          units: [],
        },
      ],
    },
    {
      id: "ftel",
      name: "FPT Telecom",
      lead: "Hoang Anh",
      members: [{ id: "m-ftel-1", name: "Hoang Anh", role: "CEO", initials: "HA" }],
      units: [
        {
          id: "ftel-noc",
          name: "Network Operations",
          lead: "Minh Duc",
          members: [
            { id: "m-noc-1", name: "Minh Duc", role: "NOC Manager", initials: "MD" },
            { id: "m-noc-2", name: "Thu Ha", role: "Network Engineer", initials: "TH" },
          ],
          units: [],
        },
        {
          id: "ftel-cs",
          name: "Customer Service",
          lead: "Kim Ngan",
          members: [{ id: "m-cs-1", name: "Kim Ngan", role: "CS Manager", initials: "KN" }],
          units: [],
        },
      ],
    },
    {
      id: "fsc",
      name: "FPT Smart Cloud",
      lead: "Le Hong Viet",
      members: [{ id: "m-fsc-1", name: "Le Hong Viet", role: "CEO", initials: "LV" }],
      units: [
        {
          id: "fsc-agents",
          name: "AI Agents Platform",
          lead: "Tran Nam",
          members: [
            { id: "m-agents-1", name: "Tran Nam", role: "Product Owner", initials: "TN" },
            { id: "m-agents-2", name: "Linh Phan", role: "Builder", initials: "LP" },
            { id: "m-agents-3", name: "Mai Hoang", role: "Viewer", initials: "MH" },
          ],
          units: [],
        },
        {
          id: "fsc-infra",
          name: "Cloud Infrastructure",
          lead: "Van Anh",
          members: [{ id: "m-infra-1", name: "Van Anh", role: "Infra Lead", initials: "VA" }],
          units: [],
        },
      ],
    },
    {
      id: "fe",
      name: "FPT Education",
      lead: "Nguyen Khai",
      members: [{ id: "m-fe-1", name: "Nguyen Khai", role: "Director", initials: "NK" }],
      units: [],
    },
  ],
};

function countAll(unit: OrgUnit): number {
  return unit.members.length + unit.units.reduce((sum, u) => sum + countAll(u), 0);
}

function MemberRow({ member }: { member: OrgMember }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-surface-muted/60 transition-base">
      <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
        {member.initials}
      </div>
      <span className="text-sm truncate">{member.name}</span>
      <span className="text-xs text-muted-foreground truncate">{member.role}</span>
    </div>
  );
}

function UnitNode({ unit, depth = 0 }: { unit: OrgUnit; depth?: number }) {
  const hasChildren = unit.members.length > 0 || unit.units.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);
  const total = countAll(unit);

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(v => !v)}
        aria-expanded={expanded}
        className={`w-full flex items-center gap-2.5 py-2 px-2 rounded-lg text-left hover:bg-surface-muted transition-base ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
      >
        {hasChildren ? (
          expanded
            ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            : <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Building2 size={13} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{unit.name}</div>
          {unit.lead && <div className="text-xs text-muted-foreground truncate">Led by {unit.lead}</div>}
        </div>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-surface-muted border border-border text-muted-foreground shrink-0">
          <Users size={11} /> {total}
        </span>
      </button>

      {expanded && hasChildren && (
        <div className="ml-[14px] pl-4 border-l border-border space-y-0.5 py-0.5">
          {unit.members.map(m => <MemberRow key={m.id} member={m} />)}
          {unit.units.map(u => <UnitNode key={u.id} unit={u} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

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

      <Card title="Org structure" desc="Units can contain members and nested sub-units, to any depth.">
        <UnitNode unit={orgTree} />
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
