import { LayoutGrid, Building2 } from "lucide-react";
import type { ExternalAgent } from "./externalAgentStore";
import { StatusBadge } from "./statusMeta";

/** Single-audience version of this tab — this round narrows publishing to the Workspace
 * audience only, so the old 7-channel grid is replaced with one read-only row showing whether
 * the agent is live there. There's nothing to toggle here anymore: Publish/Pause/Resume on the
 * Build tab are the only ways to change this. */
export default function ExternalAgentChannelsTab({ agent }: { agent: ExternalAgent }) {
  const isLive = agent.status === "published";

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1040px] mx-auto px-8 py-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <LayoutGrid size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Deploy channels</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Where this agent is published, and whether it's live.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface flex items-center justify-between px-5 py-4 mb-8">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3">Channels</h2>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-surface max-w-sm">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">Workspace</p>
              <p className={`text-xs truncate ${isLive ? "text-success" : "text-muted-foreground"}`}>{isLive ? "Live" : "Not live"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
