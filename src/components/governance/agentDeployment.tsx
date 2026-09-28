// "Kênh triển khai" block on an Agent request's detail page — where this Agent will be available
// if the request is approved. Mirrors the Agent's own Deploy tab (Agent Workspace audiences +
// external channels) so the reviewer sees the same structure they'd see after approval, instead
// of one flat "Publish to" label: an Agent can reach several Workspace audiences (company,
// departments, collaboration groups, individual people, the community) AND several external
// channels at once, and each of those widens the blast radius differently.
import { Building2, Network, UsersRound, User, Globe, Mail, LayoutGrid } from "lucide-react";
import { CHANNEL_CATALOG, ChannelIcon } from "../configure/channelCatalog";
import { getAgent } from "../configure/agentStore";
import { workspaceTargetsOf, type GovRequest, type WorkspaceTargetKind } from "./governanceStore";

const KIND_META: Record<WorkspaceTargetKind, { label: string; icon: typeof Building2 }> = {
  company: { label: "Công ty", icon: Building2 },
  department: { label: "Phòng ban", icon: Network },
  group: { label: "Nhóm cộng tác", icon: UsersRound },
  people: { label: "Cá nhân", icon: User },
  community: { label: "Cộng đồng", icon: Globe },
};

/** Channels the shared catalog doesn't carry (yet) but requests can name. */
const EXTRA_CHANNELS: Record<string, { name: string; mark: JSX.Element }> = {
  teams: { name: "Microsoft Teams", mark: <img src="https://upload.wikimedia.org/wikipedia/commons/9/94/Microsoft_Office_Teams_%282019%E2%80%932025%29.svg" alt="" className="w-4 h-4 object-contain" /> },
  email: { name: "Email", mark: <Mail size={15} className="text-muted-foreground" /> },
};

function channelInfo(id: string): { name: string; mark: JSX.Element } {
  const key = id.toLowerCase();
  const ch = CHANNEL_CATALOG.find(c => c.id === key);
  if (ch) return { name: ch.name, mark: <ChannelIcon ch={ch} size={16} /> };
  return EXTRA_CHANNELS[key] ?? { name: id, mark: <span className="text-[11px] font-bold text-muted-foreground">{id[0]?.toUpperCase()}</span> };
}

export function AgentDeploymentSection({ req }: { req: GovRequest }) {
  const targets = workspaceTargetsOf(req);
  const channels = [...new Set((req.channels ?? getAgent(req.resourceId).channels).map(c => c.toLowerCase()))];
  const people = targets.reduce((n, t) => n + (t.members ?? 0), 0);

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <LayoutGrid size={14} className="text-muted-foreground" /> Kênh triển khai ({channels.length + 1})
      </p>
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {/* Agent Workspace — always part of an Agent publish request. */}
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-sm font-semibold">Agent Workspace</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {targets.length} phạm vi{people > 0 ? ` · khoảng ${people.toLocaleString("vi-VN")} người` : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {targets.map((t, i) => {
              const meta = KIND_META[t.kind];
              const Icon = meta.icon;
              return (
                <div key={i} className="rounded-lg border border-border bg-white px-3 py-2.5 flex items-start gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={t.name}>{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta.label}{t.members ? ` · ${t.members.toLocaleString("vi-VN")} người` : ""}
                    </p>
                    {t.detail && <p className="text-xs text-warning mt-1 leading-snug">{t.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* External channels */}
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-sm font-semibold">Kênh ngoài</p>
            <p className="text-xs text-muted-foreground tabular-nums">{channels.length} kênh</p>
          </div>
          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không publish ra kênh ngoài — chỉ dùng trong Agent Workspace.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {channels.map(id => {
                const c = channelInfo(id);
                return (
                  <div key={id} className="rounded-lg border border-border bg-white px-3 py-2.5 flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center shrink-0">{c.mark}</span>
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
