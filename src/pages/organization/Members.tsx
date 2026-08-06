import { Plus, Search, Mail, Crown, Trash2, MoreVertical } from "lucide-react";
import { Card } from "./shared";

const members = [
  { name: "Tran Nam", email: "nam.tran@fpt.com", role: "Admin", joined: "Jan 2025", initials: "TN", bg: "bg-primary-soft text-primary", isYou: true },
  { name: "Linh Phan", email: "linh.phan@fpt.com", role: "Builder", joined: "Feb 2025", initials: "LP", bg: "bg-accent-soft text-accent" },
  { name: "Duy Nguyen", email: "duy.nguyen@fpt.com", role: "Builder", joined: "Mar 2025", initials: "DN", bg: "bg-info/15 text-info" },
  { name: "Mai Hoang", email: "mai.hoang@partner.com", role: "Viewer", joined: "Apr 2025", initials: "MH", bg: "bg-surface-muted text-foreground" },
  { name: "—", email: "huy.le@fpt.com", role: "Builder", joined: "—", initials: "HL", bg: "bg-warning-soft text-warning", pending: true },
];

export default function Members() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
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
    </div>
  );
}
