import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, History, ExternalLink } from "lucide-react";
import { auditLogStore, ACTION_LABEL, type AuditAction } from "@/components/governance/auditLogStore";
import { RESOURCE_TYPE_LABEL, type GovResourceType } from "@/components/governance/governanceStore";
import { ResourceTypeIcon, formatDateTime } from "@/components/governance/governanceUi";

const RANGE_OPTIONS = [
  { key: "all", label: "Toàn bộ thời gian" },
  { key: "24h", label: "24 giờ qua" },
  { key: "7d", label: "7 ngày qua" },
  { key: "30d", label: "30 ngày qua" },
] as const;
type RangeKey = typeof RANGE_OPTIONS[number]["key"];

const ACTION_DOT: Record<AuditAction, string> = {
  submitted: "bg-primary", resubmitted: "bg-primary", approved: "bg-success",
  rejected: "bg-destructive", changes_requested: "bg-warning", revoked: "bg-destructive",
};

function Table({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface overflow-hidden">{children}</div>;
}
function THead({ cols, cells }: { cols: string; cells: string[] }) {
  return (
    <div className="grid px-5 bg-surface-muted border-b border-border" style={{ gridTemplateColumns: cols }}>
      {cells.map(c => <div key={c} className="py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{c}</div>)}
    </div>
  );
}
function TRow({ cols, children }: { cols: string; children: React.ReactNode }) {
  return <div className="grid px-5 py-3.5 border-b border-border last:border-0 items-center gap-3" style={{ gridTemplateColumns: cols }}>{children}</div>;
}

const COLS = "150px 1fr 130px 140px 130px";

export default function GovernanceAuditLog() {
  const actors = auditLogStore.listActors();
  const [actorId, setActorId] = useState<string>("all");
  const [resourceType, setResourceType] = useState<"all" | GovResourceType>("all");
  const [range, setRange] = useState<RangeKey>("all");
  const [query, setQuery] = useState("");

  const from = useMemo(() => {
    const now = Date.now();
    if (range === "24h") return now - 24 * 60 * 60 * 1000;
    if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
    if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000;
    return undefined;
  }, [range]);

  const entries = useMemo(() => auditLogStore.list({
    actorId: actorId === "all" ? undefined : actorId,
    resourceType: resourceType === "all" ? undefined : resourceType,
    from, query: query.trim() || undefined,
  }), [actorId, resourceType, from, query]);

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Lịch sử toàn bộ hành động duyệt/từ chối/yêu cầu cập nhật — theo người thực hiện, theo resource, lọc theo thời gian.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={actorId}
            onChange={e => setActorId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-muted border border-border text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="all">Tất cả người thực hiện</option>
            {actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            value={resourceType}
            onChange={e => setResourceType(e.target.value as any)}
            className="h-9 px-3 rounded-lg bg-surface-muted border border-border text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="all">Tất cả loại resource</option>
            <option value="agent">Agent</option>
            <option value="knowledge">Knowledge</option>
            <option value="skill">Skill</option>
            <option value="guardrail">Guardrails</option>
            <option value="connector">Connector</option>
          </select>
          <select
            value={range}
            onChange={e => setRange(e.target.value as RangeKey)}
            className="h-9 px-3 rounded-lg bg-surface-muted border border-border text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {RANGE_OPTIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tên resource hoặc người thực hiện..."
            className="h-9 w-72 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <Table>
        <THead cols={COLS} cells={["Thời gian", "Hành động", "Loại", "Người thực hiện", "Resource"]} />
        {entries.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
            <History size={20} className="text-muted-foreground/50" /> Không có hoạt động phù hợp.
          </div>
        ) : entries.map(e => (
          <TRow key={e.id} cols={COLS}>
            <div className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(e.at)}</div>
            <div className="text-sm text-foreground flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ACTION_DOT[e.action]}`} />
              <span className="truncate">
                {ACTION_LABEL[e.action]}
                {e.note && <span className="text-muted-foreground"> — "{e.note.length > 60 ? e.note.slice(0, 60) + "…" : e.note}"</span>}
              </span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ResourceTypeIcon type={e.resourceType} size={13} /> {RESOURCE_TYPE_LABEL[e.resourceType]}
            </div>
            <div className="text-sm text-foreground truncate">{e.actorName}</div>
            <Link to={`/governance/requests/${e.requestId}`} className="text-sm text-primary hover:underline truncate flex items-center gap-1">
              {e.resourceName} <ExternalLink size={11} className="shrink-0" />
            </Link>
          </TRow>
        ))}
      </Table>
    </div>
  );
}
