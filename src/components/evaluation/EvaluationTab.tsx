import { evaluationStore } from "./evaluationStore";
import { TestSetsSection } from "./TestSetsSection";
import { RunsSection } from "./RunsSection";
import { MetricsSection } from "./MetricsSection";
import { PublishGateSection } from "./PublishGateSection";
import { MonitorSection } from "./MonitorSection";
import type { EvalSection } from "./shared";

export { EVAL_SUBTABS } from "./shared";
export type { EvalSection } from "./shared";
export { evaluationStore } from "./evaluationStore";

/** Agent details → tab Evaluate. Section comes from ?section=, detail item from ?item=. */
export default function EvaluationTab({ agentId, agentName, section, onRefineWithAI }: {
  agentId: string; agentName: string; section: EvalSection; onRefineWithAI: () => void;
}) {
  // Seed synchronously so deep links (?item=run-…) resolve on first render.
  evaluationStore.ensure(agentId);
  if (section === "runs") return <RunsSection agentId={agentId} onRefineWithAI={onRefineWithAI} />;
  if (section === "metrics") return <MetricsSection agentId={agentId} />;
  if (section === "publish") return <PublishGateSection agentId={agentId} />;
  if (section === "monitor") return <MonitorSection agentId={agentId} />;
  return <TestSetsSection agentId={agentId} agentName={agentName} />;
}
