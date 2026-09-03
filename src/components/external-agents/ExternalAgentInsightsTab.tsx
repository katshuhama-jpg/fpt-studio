import { useSearchParams } from "react-router-dom";
import { externalAgentConversationStore } from "./externalAgentConversationStore";
import ExternalAgentHistoryTab from "./ExternalAgentHistoryTab";
import ExternalAgentActivityTab from "./ExternalAgentActivityTab";

const SUBTABS = [
  { id: "performance", label: "Performance" },
  { id: "history", label: "History" },
  { id: "activity", label: "Activity" },
];

/** Performance — same stat-card + bar-chart layout as the internal Agent's Insights, but every
 * number here is computed from this agent's own seeded conversations. Only two stat cards
 * (Total conversations, Avg. response time) because those are the only metrics with a real
 * underlying data field — External Agents don't carry a resolved/handoff outcome per
 * conversation, so Resolution rate and Human handoff are left out rather than invented. */
function PerformanceSubTab({ agentId }: { agentId: string }) {
  const stats = externalAgentConversationStore.stats(agentId);
  const maxCount = Math.max(1, ...stats.byDay.map(d => d.count));
  const lastIndex = stats.byDay.length - 1;

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Performance</h2>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {["7d", "30d", "Custom"].map((t, i) => (
            <button key={t} className={`px-3 h-7 rounded text-xs font-medium transition-base ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="surface-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Total conversations</div>
          <div className="font-display text-2xl font-semibold tracking-tight">{stats.total}</div>
        </div>
        <div className="surface-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Avg. response time</div>
          <div className="font-display text-2xl font-semibold tracking-tight">
            {stats.avgResponseMs != null ? `${(stats.avgResponseMs / 1000).toFixed(1)}s` : "—"}
          </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold">Conversations by day</h3>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <div className="flex items-end gap-2 h-40 mb-2">
          {stats.byDay.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer" title={`${d.count} conversation${d.count === 1 ? "" : "s"}`}>
              <div
                className={`rounded-t-md transition-base ${i === lastIndex ? "bg-accent" : "bg-primary"} ${i !== lastIndex ? "opacity-70" : ""}`}
                style={{ height: `${d.count === 0 ? 2 : Math.max(6, (d.count / maxCount) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {stats.byDay.map((d, i) => (
            <div key={i} className="flex-1 text-center text-xs text-muted-foreground">{d.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Insights — Performance / History / Activity, mirroring the internal Agent's Insights
 * sub-tab pattern. Sub-tab state lives in the same `section` query param the parent page
 * already uses, so it's self-contained and still deep-linkable. */
export default function ExternalAgentInsightsTab({ agentId }: { agentId: string }) {
  const [params, setParams] = useSearchParams();
  const rawSub = params.get("section");
  const sub = SUBTABS.some(s => s.id === rawSub) ? rawSub! : "performance";

  const setSub = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("section", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-5 pb-3 border-b border-border shrink-0 flex items-center gap-1">
        {SUBTABS.map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`px-3 h-8 rounded-lg text-sm font-medium transition-base ${
              sub === s.id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {sub === "performance" && (
          <div className="flex-1 overflow-y-auto bg-background">
            <PerformanceSubTab agentId={agentId} />
          </div>
        )}
        {sub === "history" && <ExternalAgentHistoryTab agentId={agentId} />}
        {sub === "activity" && <ExternalAgentActivityTab agentId={agentId} />}
      </div>
    </div>
  );
}
