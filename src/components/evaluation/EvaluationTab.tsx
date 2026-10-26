import { evaluationStore } from "./evaluationStore";
import TestTab from "@/components/testsuite/TestTab";
import { MetricsSection } from "./MetricsSection";
import { PublishGateSection } from "./PublishGateSection";
import type { EvalSection } from "./shared";

export { EVAL_SUBTABS } from "./shared";
export type { EvalSection } from "./shared";
export { evaluationStore } from "./evaluationStore";

/** Agent details → tab Evaluate. Section comes from ?section=, detail item from ?item=.
 * The older TestSetsSection/RunsSection stay in the repo but are no longer shown. */
export default function EvaluationTab({ agentId, section, readOnly }: {
  agentId: string; agentName: string; section: EvalSection; onRefineWithAI: () => void; readOnly?: boolean;
}) {
  // Seed synchronously so deep links (?item=run-…) resolve on first render.
  evaluationStore.ensure(agentId);
  // Test Suites / Lịch sử chạy: the Generate Testcase flow (Màn 1–6).
  if (section === "runs" || section === "test-sets") return <TestTab agentId={agentId} section={section} readOnly={readOnly} />;
  if (section === "metrics") return <MetricsSection agentId={agentId} />;
  if (section === "publish") return <PublishGateSection agentId={agentId} />;
  return <TestTab agentId={agentId} section="test-sets" readOnly={readOnly} />;
}
