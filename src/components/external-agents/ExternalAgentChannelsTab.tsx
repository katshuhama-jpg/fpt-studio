import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon } from "@hugeicons/core-free-icons";
import { CHANNEL_CATALOG, ChannelIcon } from "@/components/configure/channelCatalog";
import { externalAgentStore, type ExternalAgent } from "./externalAgentStore";
import { StatusBadge } from "./statusMeta";

/** Same shape as the internal Agent's Deploy tab: a version/live-channel summary bar, then the
 * shared CHANNEL_CATALOG grid — one list with the "Lưu phiên bản" modal's channel picker, so
 * the two screens can never show different channels. There's no Workspace/Automation split
 * here (External Agent has no Trigger/Automation concept), so this is just the flat channel
 * grid. A channel can be toggled live/not-connected in place once the agent is published,
 * exactly like the internal Agent's setChannels — before that, and while awaiting approval, the
 * grid stays disabled since there's nothing live to toggle yet. */
export default function ExternalAgentChannelsTab({ agent, onRefresh }: { agent: ExternalAgent; onRefresh: () => void }) {
  const isLive = agent.status === "published";
  const liveCount = isLive ? agent.channels.length : 0;

  const toggleChannel = (id: string) => {
    if (!isLive) return;
    const set = new Set(agent.channels);
    set.has(id) ? set.delete(id) : set.add(id);
    externalAgentStore.setChannels(agent.id, [...set]);
    onRefresh();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1040px] mx-auto px-8 py-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={GridViewIcon} size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Deploy channels</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Where this agent is live, and which version it's running.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface flex items-center justify-between px-5 py-4 mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-10 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <StatusBadge status={agent.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Serving version</p>
              <p className="text-base font-semibold font-mono">{agent.version}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Live channels</p>
              <p className="text-base font-semibold">{liveCount}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">External channels</h2>
          <div className="grid grid-cols-3 gap-3">
            {CHANNEL_CATALOG.map(ch => {
              const live = isLive && agent.channels.includes(ch.id);
              const disabled = !isLive || ch.available === false;
              return (
                <button
                  key={ch.id}
                  onClick={() => { if (!disabled) toggleChannel(ch.id); }}
                  disabled={disabled}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-base ${
                    !disabled
                      ? "border-border bg-surface hover:border-primary/30 hover:shadow-soft cursor-pointer"
                      : "border-border bg-surface-muted/40 opacity-70 cursor-not-allowed"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                    <ChannelIcon ch={ch} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ch.name}</p>
                    <p className={`text-sm truncate ${live ? "text-success" : "text-muted-foreground"}`}>
                      {ch.available === false
                        ? "Coming soon"
                        : !isLive
                          ? "Publish agent để bật kênh này"
                          : live ? `Live · ${agent.version}` : "Not connected"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
