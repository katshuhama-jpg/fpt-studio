import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronUp, ChevronDown, Check } from "lucide-react";
import type { WorkforceNode, WorkforceEdge, WorkforceStatus } from "./types";
import { isConditionInvalid } from "./types";

interface Step {
  label: string;
  done: boolean;
  href?: string;
}

export default function GettingStartedChecklist({ nodes, edges, name, status }: {
  nodes: WorkforceNode[];
  edges: WorkforceEdge[];
  name: string;
  status: WorkforceStatus;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const hasAgent = nodes.some(n => n.data.kind === "agent");
  const hasRoute = nodes.some(n => n.data.kind === "condition");
  const hasConfiguredCondition = nodes.some(n => n.data.kind === "condition" && !isConditionInvalid(n.data));
  const isNamed = name.trim().length > 0 && name.trim() !== "Untitled workforce";
  const isPublished = status === "published";

  const steps: Step[] = [
    { label: "Thêm Agent nguồn", done: hasAgent },
    { label: "Kết nối Agent tới đích", done: hasRoute },
    { label: "Cấu hình điều kiện chuyển giao", done: hasConfiguredCondition },
    { label: "Đặt tên cho Workforce", done: isNamed },
    { label: "Publish Workforce", done: isPublished },
    { label: "Xem lại trong danh sách Workforce", done: false, href: "/workforce" },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const currentIndex = steps.findIndex(s => !s.done);
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="absolute top-4 left-4 z-10 w-[320px] bg-white rounded-xl border border-border shadow-elev overflow-hidden animate-fade-up">
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 pt-4 pb-3 text-left"
      >
        <span className="font-display text-sm font-semibold">Getting started checklist</span>
        {collapsed ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronUp size={16} className="text-muted-foreground" />}
      </button>
      <div className="px-4 pb-3">
        <div className="h-1 rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          {steps.map((step, i) => {
            const isCurrent = i === currentIndex;
            const content = (
              <div className="flex items-center gap-2.5 py-1.5">
                <div
                  className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 ${
                    step.done ? "bg-success border-success text-white" :
                    isCurrent ? "border-primary bg-primary-soft" :
                    "border-border"
                  }`}
                >
                  {step.done && <Check size={11} strokeWidth={3} />}
                </div>
                <span className={`text-sm leading-5 ${isCurrent ? "font-semibold text-foreground" : step.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
            return step.href
              ? <Link key={step.label} to={step.href} className="block hover:bg-surface-muted -mx-2 px-2 rounded-lg transition-base">{content}</Link>
              : <div key={step.label}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
