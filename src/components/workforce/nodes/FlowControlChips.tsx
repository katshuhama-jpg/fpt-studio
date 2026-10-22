import { GitFork, GitMerge } from "lucide-react";
import type { FlowControl } from "../types";

/** Small chips under a routing node's body that show its fork/join setting at a glance -
 * "Chạy song song các tuyến ra" (fanOut all) and "Chờ đủ các nhánh vào" (joinAll). */
export default function FlowControlChips({ data }: { data: FlowControl }) {
  if (data.fanOut !== "all" && !data.joinAll) return null;
  return (
    <div className="flex flex-wrap gap-1.5" style={{ padding: "0 14px 12px" }}>
      {data.joinAll && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-[6px] px-2 py-[3px]" style={{ background: "#EEF0F3", color: "var(--wf-text)" }}>
          <GitMerge size={11} /> Chờ đủ các nhánh vào
        </span>
      )}
      {data.fanOut === "all" && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-[6px] px-2 py-[3px]" style={{ background: "#EEF0F3", color: "var(--wf-text)" }}>
          <GitFork size={11} /> Chạy song song các tuyến ra
        </span>
      )}
    </div>
  );
}
