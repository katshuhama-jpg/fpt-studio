import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Layers } from "lucide-react";
import {
  governanceStore, RESOURCE_TYPE_LABEL, AUDIENCE_LABEL,
  type GovRequestStatus, type GovResourceType, type GovRequest,
} from "@/components/governance/governanceStore";
import { StatusBadge, ResourceTypeIcon, STATUS_ROW_ACCENT, initials, relativeTime } from "@/components/governance/governanceUi";

type MainTab = "all" | GovRequestStatus;

const TABS: { key: MainTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "needs_changes", label: "Cần cập nhật" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
];

const TYPE_FILTERS: { key: "all" | GovResourceType; label: string }[] = [
  { key: "all", label: "Tất cả loại" },
  { key: "agent", label: "Agent" },
  { key: "knowledge", label: "Knowledge" },
  { key: "skill", label: "Skill" },
  { key: "guardrail", label: "Guardrails" },
  { key: "connector", label: "Connector" },
];

const COLS = "1.5fr 110px 170px 170px 110px 130px";

/** Column labels above the card-list — kept as a plain header row (not its own bordered box)
 * so the eye reads it as "this is what lines up under each card", not as a separate block. */
function ListHead() {
  return (
    <div className="grid px-4 gap-3" style={{ gridTemplateColumns: COLS }}>
      {["Resource", "Loại", "Người gửi", "Publish to", "Gửi lúc", "Trạng thái"].map(c => (
        <div key={c} className="pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{c}</div>
      ))}
    </div>
  );
}

/** Each request is its own rounded, left-accented card rather than a dense table row — accent
 * color marks the rows that actually need a decision (pending/needs_changes) so the queue reads
 * as a triage list at a glance, while resolved rows stay neutral. Columns still line up with
 * ListHead via the same grid template, so it scans like a table despite the card spacing. */
function RequestCard({ r, onClick }: { r: GovRequest; onClick: () => void }) {
  const needsAttention = r.bundledItems.filter(it => it.changeState !== "unchanged_approved").length;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={`grid px-4 py-3.5 gap-3 items-center rounded-xl border border-l-4 bg-surface cursor-pointer hover:shadow-sm hover:border-border transition-base ${STATUS_ROW_ACCENT[r.status]}`}
      style={{ gridTemplateColumns: COLS }}
    >
      <div className="min-w-0 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 text-base border border-border/60">
          {r.resourceIcon ?? <ResourceTypeIcon type={r.resourceType} size={16} className="text-muted-foreground" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{r.resourceName}</p>
          {r.bundledItems.length > 0 && (
            <p className={`text-xs truncate ${needsAttention > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
              +{r.bundledItems.length} thành phần đi kèm{needsAttention > 0 ? ` · ${needsAttention} cần chú ý` : ""}
            </p>
          )}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{RESOURCE_TYPE_LABEL[r.resourceType]}</div>
      <div className="min-w-0 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
          {initials(r.requesterName)}
        </span>
        <span className="text-sm text-foreground truncate">{r.requesterName}</span>
      </div>
      <div className="text-sm text-muted-foreground truncate">{AUDIENCE_LABEL[r.audience]}</div>
      <div className="text-sm text-muted-foreground">{relativeTime(r.submittedAt)}</div>
      <div><StatusBadge status={r.status} /></div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-10 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
      <Layers size={20} className="text-muted-foreground/50" />
      {label}
    </div>
  );
}

export default function GovernanceRequests() {
  const navigate = useNavigate();
  const all = governanceStore.list();
  const [tab, setTab] = useState<MainTab>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | GovResourceType>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    all: all.length,
    pending: all.filter(r => r.status === "pending").length,
    needs_changes: all.filter(r => r.status === "needs_changes").length,
    approved: all.filter(r => r.status === "approved").length,
    rejected: all.filter(r => r.status === "rejected").length,
  }), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(r => tab === "all" || r.status === tab)
      .filter(r => typeFilter === "all" || r.resourceType === typeFilter)
      .filter(r => !q || r.resourceName.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q));
  }, [all, tab, typeFilter, query]);

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Requests</h1>
        <p className="text-sm text-muted-foreground">
          Duyệt yêu cầu publish/update cho Agent, Knowledge, Skill, Guardrails và Connector trước khi chia sẻ rộng hơn trong workspace.
        </p>
      </div>

      <div className="flex items-center gap-1 flex-wrap mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
              tab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary/10 text-primary" : "bg-surface-sunken text-muted-foreground"}`}>
              {counts[t.key === "all" ? "all" : t.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as "all" | GovResourceType)}
            className="h-9 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 appearance-none"
          >
            {TYPE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc người gửi..."
            className="h-9 w-64 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <ListHead />
      {filtered.length === 0 ? (
        <EmptyState label={tab === "all" ? "Chưa có yêu cầu nào." : "Không có yêu cầu phù hợp."} />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <RequestCard key={r.id} r={r} onClick={() => navigate(`/governance/requests/${r.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
