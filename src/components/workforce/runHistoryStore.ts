// In-memory run-history store for a Workforce's "Lịch sử chạy" tab (Observability, S-gap-8) —
// one record per completed run of `useRunTrace`, mirroring the Map-based mutable pattern
// `workforceStore.ts` already uses (unlike `historyStore.ts`'s read-only conversation seed,
// this one grows live: WorkforceCanvasPage calls `record()` itself the moment a "Chạy thử" or
// "Chạy Workforce" run finishes, so real runs from this session show up here immediately).

import type { WorkforceNode, WorkforceEdge, ConditionNodeData } from "./types";

export type RunSource = "test" | "trigger";
export type RunStatus = "success" | "stopped" | "error";

/** One Condition the run actually passed through, whether it auto-advanced (only one route out)
 * or a person picked a branch mid-run — both are worth showing in a trace log, not just the
 * ones with a real decision, since "which route did this run take" is the whole point. */
export interface RunConditionChoice {
  conditionId: string;
  conditionLabel: string;
  targetLabel: string;
}

export interface WorkforceRunRecord {
  id: string;
  workforceId: string;
  source: RunSource;
  /** The Trigger's own name — "Chạy thử" for a test run (no real Trigger record backs it),
   * the resolved TriggerRecord name for a real "Chạy Workforce" run. */
  triggerLabel: string;
  /** The free-text request typed into ManualRunDialog, only ever set for `source: "trigger"`. */
  contextMessage?: string | null;
  startedAt: number;
  endedAt: number;
  status: RunStatus;
  /** Meaningful (non-Condition) node ids reached, in order — same shape as RunTraceState.steps. */
  steps: string[];
  edgeIds: string[];
  conditionChoices: RunConditionChoice[];
  /** Set only when `status === "error"` — why the run couldn't proceed (e.g. an unwired Trigger). */
  errorReason?: string | null;
}

/** Same three-line summary ConditionNode.tsx and RunTracePanel.tsx already duplicate — kept as
 * a third copy for the same reason they give: presentation-only, not worth a shared import. */
function conditionSummary(node: WorkforceNode | undefined): string {
  if (!node || node.data.kind !== "condition") return "—";
  const data = node.data as ConditionNodeData;
  if (data.type === "llm") return data.llmText.trim() || "Chưa cấu hình điều kiện";
  return data.rules.length > 0 ? `${data.rules.length} điều kiện` : "Chưa cấu hình điều kiện";
}

/** Builds the `conditionChoices` a finished run passed through, from the same `nodeStatus`
 * map `useRunTrace` already tracked — every Condition id it touched, resolved to its one
 * outgoing route's destination. Exported so WorkforceCanvasPage can call it right when a run
 * finishes, without duplicating the nodeStatus → Condition-ids-touched scan itself. */
export function buildConditionChoices(
  touchedNodeIds: Iterable<string>,
  nodes: WorkforceNode[],
  edges: WorkforceEdge[],
  describeNode: (nodeId: string) => string,
): RunConditionChoice[] {
  const out: RunConditionChoice[] = [];
  for (const id of touchedNodeIds) {
    const node = nodes.find(n => n.id === id);
    if (!node || node.data.kind !== "condition") continue;
    const destEdge = edges.find(e => e.source === id);
    out.push({
      conditionId: id,
      conditionLabel: conditionSummary(node),
      targetLabel: destEdge ? describeNode(destEdge.target) : "—",
    });
  }
  return out;
}

const HOUR = 3_600_000;
let nextSeedId = 1;

function seedRun(partial: Omit<WorkforceRunRecord, "id">): WorkforceRunRecord {
  return { id: `run-seed-${nextSeedId++}`, ...partial };
}

/** A few past runs for the demo workforce ("Điều phối Banking ABC" / wf-cskh-orchestration) so
 * the tab isn't empty on first load — every id below is a real node/edge from that workforce's
 * seed graph in workforceStore.ts, so "Xem trace" replays a path that actually exists on its
 * canvas. Covers all three statuses and both sources on purpose. */
function seedRuns(): WorkforceRunRecord[] {
  const wfId = "wf-cskh-orchestration";
  const triggerLabel = "Nhận tin nhắn từ khách hàng";

  return [
    // Real trigger fire → auto-routes through cond-1 (single outgoing route) → Omni Supports.
    seedRun({
      workforceId: wfId,
      source: "trigger",
      triggerLabel,
      startedAt: Date.now() - 2 * HOUR,
      endedAt: Date.now() - 2 * HOUR + 3_400,
      status: "success",
      steps: ["trigger-cskh", "src-cskh", "dest-omni-1"],
      edgeIds: ["e-trigger-cskh", "e-src-cskh-cond-1", "e-cond-1-omni-1"],
      conditionChoices: [{
        conditionId: "cond-1",
        conditionLabel: "Khách hàng yêu cầu rõ ràng được nói chuyện với người thật, hoặc hỏi ngoài phạm vi sản phẩm ngân hàng.",
        targetLabel: "Omni Supports",
      }],
    }),
    // "Chạy thử" while building — picked the other branch at src-cskh (2 routes out, a real
    // choice), landing on the Human-in-the-loop approval step.
    seedRun({
      workforceId: wfId,
      source: "test",
      triggerLabel: "Chạy thử",
      startedAt: Date.now() - 22 * 60_000,
      endedAt: Date.now() - 22 * 60_000 + 2_800,
      status: "success",
      steps: ["trigger-cskh", "src-cskh", "dest-person-1"],
      edgeIds: ["e-trigger-cskh", "e-src-cskh-cond-3", "e-cond-3-person-1"],
      conditionChoices: [{
        conditionId: "cond-3",
        conditionLabel: "Chưa cấu hình điều kiện",
        targetLabel: "Người trong tổ chức",
      }],
    }),
    // Stopped mid-flight — someone hit "Dừng" right after the run reached the first Agent.
    seedRun({
      workforceId: wfId,
      source: "test",
      triggerLabel: "Chạy thử",
      startedAt: Date.now() - 5 * HOUR,
      endedAt: Date.now() - 5 * HOUR + 1_100,
      status: "stopped",
      steps: ["trigger-cskh", "src-cskh"],
      edgeIds: ["e-trigger-cskh"],
      conditionChoices: [],
    }),
    // Older failed attempt — the Trigger wasn't wired to an Agent yet at the time.
    seedRun({
      workforceId: wfId,
      source: "trigger",
      triggerLabel,
      startedAt: Date.now() - 19 * HOUR,
      endedAt: Date.now() - 19 * HOUR + 200,
      status: "error",
      steps: ["trigger-cskh"],
      edgeIds: [],
      conditionChoices: [],
      errorReason: "Trigger này chưa kết nối tới Agent nào — dừng ngay từ bước đầu.",
    }),
  ];
}

const store = new Map<string, WorkforceRunRecord>();
for (const r of seedRuns()) store.set(r.id, r);

export const runHistoryStore = {
  list(workforceId: string): WorkforceRunRecord[] {
    return [...store.values()]
      .filter(r => r.workforceId === workforceId)
      .sort((a, b) => b.startedAt - a.startedAt);
  },
  get(runId: string): WorkforceRunRecord | undefined {
    return store.get(runId);
  },
  record(run: Omit<WorkforceRunRecord, "id">): WorkforceRunRecord {
    const id = `run-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const full: WorkforceRunRecord = { id, ...run };
    store.set(id, full);
    return full;
  },
};
