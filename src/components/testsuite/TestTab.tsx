import { testStore, useTestStore, type CaseKind } from "./testSuiteStore";
import { useTestNav } from "./parts";
import SuiteList from "./SuiteList";
import SuiteDetail from "./SuiteDetail";
import AiGenerate from "./AiGenerate";
import RefinePage from "./RefinePage";
import { ManualPage, UploadPage } from "./AddCaseDialogs";
import CreateLanding, { CreateSuitePage } from "./CreateLanding";
import RunView from "./RunView";
import RunHistory, { RunCompare } from "./RunHistory";

/** Evaluate › Test Suites (section "test-sets") and Lịch sử chạy (section "runs"). */
export default function TestTab({ agentId, section, readOnly }: { agentId: string; section: "test-sets" | "runs"; readOnly?: boolean }) {
  useTestStore();
  const { get } = useTestNav();
  testStore.ensure(agentId);
  const item = get("item");
  if (section === "runs") {
    const cmp = get("compare")?.split(",").map(id => testStore.run(id));
    if (cmp?.length === 2 && cmp[0] && cmp[1]) return <RunCompare a={cmp[0]} b={cmp[1]} />;
    const run = testStore.run(item);
    if (run && run.agentId === agentId) return <RunView run={run} readOnly={readOnly} />;
    return <RunHistory agentId={agentId} />;
  }
  const suite = testStore.suite(item);
  if (suite && suite.agentId === agentId) {
    const kind: CaseKind = get("kind") === "scenario" ? "scenario" : "qna";
    const view = readOnly ? null : get("view");
    if (view === "new") return <CreateLanding key={suite.id} agentId={agentId} suite={suite} />;
    if (view === "refine") return <RefinePage key={suite.id} suite={suite} />;
    if (view === "ai") return <AiGenerate key={suite.id} suite={suite} initialKind={kind} />;
    if (view === "manual") return <ManualPage key={suite.id} suite={suite} initialKind={kind} />;
    if (view === "upload") return <UploadPage key={suite.id} suite={suite} />;
    return <SuiteDetail agentId={agentId} suite={suite} readOnly={readOnly} />;
  }
  if (get("view") === "new" && !readOnly) return <CreateSuitePage agentId={agentId} />;
  return <SuiteList agentId={agentId} readOnly={readOnly} />;
}

export { testStore };
