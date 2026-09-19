import { Bot, Headset, User, Zap, MessageSquare, GitBranch, AlertTriangle, StickyNote, ArrowDown } from "lucide-react";
import { AGENTS } from "@/components/configure/agentStore";
import type { OrgMember } from "@/pages/organization/orgData";
import type { WorkforceNode, WorkforceEdge, ConditionNodeData } from "./types";
import { isConditionInvalid } from "./types";
import { getRouteEndpoints } from "./graphOps";

interface NotebookRoute {
  key: string;
  source: WorkforceNode;
  condition: WorkforceNode | null;
  destination: WorkforceNode | null;
}

/** Groups the graph into the same units a route represents everywhere else in this app
 * (source -> [Condition] -> destination, see createRoute/createDirectEdge in graphOps.ts) —
 * one block per route, per the "nhóm theo từng route riêng" direction. A node can legitimately
 * appear as the source of more than one route (e.g. one Agent branching to Omni AND a person),
 * so it's fine for the same source card to show up in multiple blocks — that mirrors the branch
 * itself, not a bug. Anything touching no route at all (a Note, or a node nobody connected yet)
 * falls through to its own "Ghi chú & node chưa kết nối" section below. */
function buildRoutes(nodes: WorkforceNode[], edges: WorkforceEdge[]): { routes: NotebookRoute[]; orphans: WorkforceNode[] } {
  const routes: NotebookRoute[] = [];
  const used = new Set<string>();

  for (const n of nodes) {
    if (n.data.kind !== "condition") continue;
    const { source, destination } = getRouteEndpoints(n.id, nodes, edges);
    if (!source) continue;
    routes.push({ key: n.id, source, condition: n, destination });
    used.add(source.id);
    used.add(n.id);
    if (destination) used.add(destination.id);
  }

  for (const e of edges) {
    if (e.data?.conditionId) continue; // already covered above as a condition-based route
    const source = nodes.find(n => n.id === e.source);
    const destination = nodes.find(n => n.id === e.target);
    if (!source || !destination) continue;
    routes.push({ key: e.id, source, condition: null, destination });
    used.add(source.id);
    used.add(destination.id);
  }

  const orphans = nodes.filter(n => n.data.kind !== "condition" && !used.has(n.id));
  return { routes, orphans };
}

function nodeLabel(node: WorkforceNode, members: OrgMember[]): string {
  switch (node.data.kind) {
    case "agent": return AGENTS.find(a => a.id === node.data.agentId)?.name ?? "Agent không tồn tại";
    case "omni": return "Omni Supports";
    case "person": return members.find(m => m.id === node.data.memberId)?.name ?? "Chưa chọn người nhận";
    case "trigger": return node.data.label || "Chưa đặt tên";
    case "note": return "Ghi chú";
    case "condition": return "Route";
  }
}

/** A presentational stand-in for the real Flow-view node cards (AgentNode/OmniNode/etc.) — same
 * icon, color tokens and NodeTypeTab-style pill so Flow and Notebook read as the same design
 * system, just laid out differently. Deliberately has no Handle/drag affordances (nothing here
 * is positioned in flow-space), and clicking it opens the exact same config drawer as clicking
 * the node in Flow view (`onConfigureNode`) — same interaction, different chrome. */
function NotebookNodeCard({ node, members, onClick }: { node: WorkforceNode; members: OrgMember[]; onClick: () => void }) {
  const kind = node.data.kind;
  if (kind === "note") return null;

  const iconFor = { agent: Bot, omni: Headset, person: User, trigger: Zap }[kind as "agent" | "omni" | "person" | "trigger"];
  const tabLabel = { agent: "Agent", omni: "Omni Supports", person: "Người trong tổ chức", trigger: "Trigger" }[kind as "agent" | "omni" | "person" | "trigger"];

  const title = nodeLabel(node, members);
  const description =
    kind === "agent" ? AGENTS.find(a => a.id === node.data.agentId)?.desc :
    kind === "omni" ? "Tư vấn viên tiếp nhận từ hệ thống Omni — hệ thống Omni tự phân bổ, Workforce không chọn người cụ thể." :
    kind === "person" ? members.find(m => m.id === node.data.memberId)?.email ?? "—" :
    kind === "trigger" ? (node.data.description || "Bắt đầu Workforce này") :
    undefined;

  const avatar = kind === "person"
    ? (members.find(m => m.id === node.data.memberId)?.initials ?? "?")
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col w-full max-w-[420px] text-left overflow-hidden transition-base hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: "1px solid var(--wf-border)",
        boxShadow: "var(--wf-node-shadow)",
      }}
    >
      <div className="flex items-center" style={{ padding: "10px 12px 0" }}>
        <div
          className="inline-flex items-center gap-1.5 py-[5px] px-[10px] rounded-full text-[11px] font-bold uppercase tracking-[0.06em] [font-family:var(--wf-font-display)]"
          style={{ background: `var(--wf-${kind}-bg)`, color: `var(--wf-${kind})` }}
        >
          {iconFor && (() => { const Icon = iconFor; return <Icon size={12} />; })()}
          {tabLabel}
        </div>
      </div>
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 text-[12px] font-bold [font-family:var(--wf-font-display)]"
          style={{ background: `var(--wf-${kind}-bg)`, color: `var(--wf-${kind})` }}
        >
          {avatar ?? (iconFor && (() => { const Icon = iconFor; return <Icon size={17} />; })())}
          {kind === "trigger" && !avatar ? <MessageSquare size={17} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {title}
          </p>
          {description && (
            <p className="text-[12px] leading-[1.45] mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function NotebookConditionChip({ node, onClick }: { node: WorkforceNode & { data: ConditionNodeData }; onClick: () => void }) {
  const data = node.data;
  const unconfigured = isConditionInvalid(data);
  const isWarn = unconfigured || !!data.invalid;
  const statusText = unconfigured ? "Chưa cấu hình điều kiện" : data.type === "llm" ? data.llmText : `${data.rules.length} điều kiện`;
  const accentColor = isWarn ? "var(--wf-warn)" : "var(--wf-cond-border)";
  const iconColor = isWarn ? "var(--wf-warn)" : "var(--wf-muted)";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center max-w-[420px] text-left transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        gap: 7, padding: "8px 12px",
        background: "var(--wf-surface)", border: `1px dashed ${accentColor}`,
        borderRadius: "var(--wf-radius-sm)", color: "var(--wf-text)",
      }}
    >
      {unconfigured ? <AlertTriangle size={13} className="shrink-0" style={{ color: iconColor }} /> : <GitBranch size={13} className="shrink-0" style={{ color: iconColor }} />}
      <span className="text-[12px] truncate" style={{ fontFamily: "var(--wf-font-body)" }}>{statusText}</span>
    </button>
  );
}

function Connector() {
  return (
    <div className="flex items-center" style={{ padding: "2px 0 2px 26px" }}>
      <ArrowDown size={14} style={{ color: "var(--wf-connector)" }} />
    </div>
  );
}

export default function WorkforceNotebookView({
  nodes, edges, members, onConfigureNode,
}: {
  nodes: WorkforceNode[];
  edges: WorkforceEdge[];
  members: OrgMember[];
  onConfigureNode: (id: string) => void;
}) {
  const { routes, orphans } = buildRoutes(nodes, edges);

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: "var(--wf-muted)" }}>
        Workforce này chưa có node nào — chuyển sang tab Flow để thêm.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--wf-bg)" }}>
      <div className="mx-auto flex flex-col" style={{ maxWidth: 620, gap: 22, padding: "24px 24px 80px" }}>
        {routes.map((route, i) => (
          <div
            key={route.key}
            className="flex flex-col"
            style={{
              background: "var(--wf-surface)", border: "1px solid var(--wf-border)",
              borderRadius: "var(--wf-radius)", padding: 18, boxShadow: "var(--wf-node-shadow)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-3 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-muted)" }}>
              Route {i + 1} · {nodeLabel(route.source, members)} → {route.destination ? nodeLabel(route.destination, members) : "—"}
              {!route.condition && " · kết nối trực tiếp"}
            </p>
            <NotebookNodeCard node={route.source} members={members} onClick={() => onConfigureNode(route.source.id)} />
            {route.condition && (
              <>
                <Connector />
                <NotebookConditionChip node={route.condition as WorkforceNode & { data: ConditionNodeData }} onClick={() => onConfigureNode(route.condition!.id)} />
              </>
            )}
            {route.destination && (
              <>
                <Connector />
                <NotebookNodeCard node={route.destination} members={members} onClick={() => onConfigureNode(route.destination!.id)} />
              </>
            )}
          </div>
        ))}

        {orphans.length > 0 && (
          <div className="flex flex-col" style={{ gap: 10 }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] flex items-center gap-1.5 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-muted)" }}>
              <StickyNote size={12} /> Ghi chú &amp; node chưa kết nối
            </p>
            {orphans.map(n => (
              n.data.kind === "note" ? (
                <div
                  key={n.id}
                  className="text-[12.5px] whitespace-pre-wrap"
                  style={{
                    background: "var(--wf-surface)", border: "1px solid var(--wf-border)",
                    borderRadius: "var(--wf-radius-sm)", padding: 12, color: "var(--wf-text)",
                    fontFamily: "var(--wf-font-body)",
                  }}
                >
                  {n.data.text || <span style={{ color: "var(--wf-muted)" }}>Ghi chú trống</span>}
                </div>
              ) : (
                <NotebookNodeCard key={n.id} node={n} members={members} onClick={() => onConfigureNode(n.id)} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
