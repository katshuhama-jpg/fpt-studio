import { useState } from "react";
import { LayoutGrid, Globe, MessageCircle, Facebook, Slack, Users, Webhook, Building2 } from "lucide-react";
import { externalAgentStore, PUBLISH_CHANNELS, type ExternalAgent } from "./externalAgentStore";
import { StatusBadge } from "./statusMeta";
import { UnpublishExternalAgentDialog } from "./ExternalAgentDialogs";

const CHANNEL_ICONS: Record<string, any> = {
  web: Globe, zalo: MessageCircle, messenger: Facebook, slack: Slack, teams: Users, api: Webhook, workspace: Building2,
};

/** Deploy-channels-style page for an External Agent — mirrors the internal Agent's Channels
 * tab (icon+title header, a status/live-count summary bar, a channel grid) but scoped to what
 * External Agents actually have: no serving-version concept, so that part of the summary bar
 * is simply omitted rather than invented. This is what the detail page's old "Manage channels"
 * button used to open as a modal — now it's the tab itself. */
export default function ExternalAgentChannelsTab({ agent, onChanged }: {
  agent: ExternalAgent;
  onChanged: () => void;
}) {
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const isPublished = agent.status === "published";
  const isPaused = agent.status === "paused";
  const liveCount = isPublished ? agent.channels.length : 0;

  const toggleChannel = (id: string) => {
    if (!isPublished) return;
    const set = new Set(agent.channels);
    set.has(id) ? set.delete(id) : set.add(id);
    const next = [...set];
    if (next.length === 0) {
      setShowUnpublishConfirm(true);
      return;
    }
    externalAgentStore.publish(agent.id, next);
    onChanged();
  };

  const confirmUnpublish = () => {
    externalAgentStore.publish(agent.id, []);
    setShowUnpublishConfirm(false);
    onChanged();
  };

  const hintFor = (id: string): { text: string; live: boolean } => {
    const wasLive = agent.channels.includes(id);
    if (isPublished) return wasLive ? { text: "Live", live: true } : { text: "Not connected", live: false };
    if (isPaused) return wasLive ? { text: "Live · Paused", live: false } : { text: "Not connected", live: false };
    if (agent.status === "pending_approval") return { text: "Waiting for approval", live: false };
    if (agent.status === "rejected") return { text: "Fix and resubmit to enable", live: false };
    // draft
    return { text: agent.approved ? "Use Publish to go live" : "Submit for approval to enable", live: false };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1040px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <LayoutGrid size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Deploy channels</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Where this agent is published, and which channels are live.</p>
          </div>
        </div>

        {/* Status / live-count summary bar — no serving-version row, since External Agents
            don't have a release-version concept to show. */}
        <div className="rounded-xl border border-border bg-surface flex items-center justify-between px-5 py-4 mb-8">
          <div className="flex items-center gap-10">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <StatusBadge status={agent.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Live channels</p>
              <p className="text-base font-semibold">{liveCount}</p>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-sm font-semibold">Channels</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {PUBLISH_CHANNELS.map(c => {
              const Icon = CHANNEL_ICONS[c.id];
              const hint = hintFor(c.id);
              const disabled = !isPublished;
              return (
                <button
                  key={c.id}
                  onClick={() => toggleChannel(c.id)}
                  disabled={disabled}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-base ${
                    !disabled
                      ? "border-border bg-surface hover:border-primary/30 hover:shadow-soft cursor-pointer"
                      : "border-border bg-surface-muted/40 opacity-70 cursor-not-allowed"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className={`text-xs truncate ${hint.live ? "text-success" : "text-muted-foreground"}`}>{hint.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <UnpublishExternalAgentDialog
        name={agent.name}
        open={showUnpublishConfirm}
        onOpenChange={setShowUnpublishConfirm}
        onConfirm={confirmUnpublish}
      />
    </div>
  );
}
