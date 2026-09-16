import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Layers, ChevronDown } from "lucide-react";
import {
  governanceStore, AUDIENCE_LABEL, itemNeedsReview,
  type GovRequestStatus, type GovResourceType, type GovRequest,
} from "@/components/governance/governanceStore";
import { StatusBadge, ResourceTypeIcon, ResourceTypePill, STATUS_ROW_ACCENT, initials, relativeTime } from "@/components/governance/governanceUi";

type MainTab = "all" | GovRequestStatus;

/** Statuses the Admin still owes a decision on — mirrors governanceStore.pendingCount()'s own
 * "open" definition, so this page's grouping doesn't invent a taxonomy the rest of the app
 * doesn't already use. */
const NEEDS_ACTION_STATUSES: GovRequestStatus[] = ["pending", "needs_changes"];
const isNeedsAction = (s: GovRequestStatus) => NEEDS_ACTION_STATUSES.includes(s);

const TABS: { key: MainTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "needs_changes", label: "Cần cập nhật" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "revoked", label: "Đã thu hồi" },
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
  const needsAttention = r.bundledItems.filter(it => itemNeedsReview(it.changeState)).length;
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
            <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${
              needsAttention > 0 ? "text-primary bg-primary-soft" : "text-muted-foreground bg-surface-muted"
            }`}>
              <Layers size={10} />
              {r.bundledItems.length} thành phần đi kèm{needsAttention > 0 ? ` · ${needsAttention} cần chú ý` : ""}
            </span>
          )}
        </div>
      </div>
      <div><ResourceTypePill type={r.resourceType} /></div>
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

/** Section divider for the "Tất cả" tab, splitting the feed into what the Admin still owes a
 * decision (pending + needs_changes — governanceStore's own pendingCount() already treats these
 * as one "open" bucket) vs what's fully resolved. Plain sort-by-recency used to interleave a
 * 3-day-old pending request below several same-day approvals, so opening the page didn't surface
 * what actually needed attention — this makes "still open" the thing the eye lands on first. */
function SectionLabel({ children, count, tone }: { children: string; count: number; tone: "action" | "resolved" }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className={`text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${tone === "action" ? "text-primary" : "text-muted-foreground"}`}>
        {children}
      </span>
      <span className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 ${tone === "action" ? "bg-primary-soft text-primary" : "bg-surface-sunken text-muted-foreground"}`}>
        {count}
      </span>
      <span className="flex-1 h-px bg-border" />
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
    revoked: all.filter(r => r.status === "revoked").length,
  }), [all]);

  // Type/search filter only — status grouping and sort order are decided below, separately per
  // tab, since "open" and "resolved" requests read best in a different order (oldest-first so
  // the longest-waiting item surfaces, vs newest-first so the latest decision is on top).
  const typeAndQueryFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(r => typeFilter === "all" || r.resourceType === typeFilter)
      .filter(r => !q || r.resourceName.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q));
  }, [all, typeFilter, query]);

  const sortByUrgency = (list: GovRequest[]) => [...list].sort((a, b) => a.submittedAt - b.submittedAt);
  const sortByRecency = (list: GovRequest[]) => [...list].sort((a, b) => b.updatedAt - a.updatedAt);

  const needsActionList = useMemo(
    () => sortByUrgency(typeAndQueryFiltered.filter(r => isNeedsAction(r.status))),
    [typeAndQueryFiltered],
  );
  const resolvedList = useMemo(
    () => sortByRecency(typeAndQueryFiltered.filter(r => !isNeedsAction(r.status))),
    [typeAndQueryFiltered],
  );
  const singleTabList = useMemo(() => {
    if (tab === "all") return [];
    const list = typeAndQueryFiltered.filter(r => r.status === tab);
    return isNeedsAction(tab) ? sortByUrgency(list) : sortByRecency(list);
  }, [typeAndQueryFiltered, tab]);

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
          <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/70 pointer-events-none" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as "all" | GovResourceType)}
            className="h-9 pl-8 pr-7 rounded-lg bg-white border border-border shadow-sm text-sm font-medium text-foreground hover:border-ring/60 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 appearance-none transition-base"
          >
            {TYPE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc người gửi..."
            className="h-9 w-64 pl-8 pr-3 rounded-lg bg-white border border-border shadow-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-base"
          />
        </div>
      </div>

      <ListHead />
      {tab === "all" ? (
        needsActionList.length === 0 && resolvedList.length === 0 ? (
          <EmptyState label="Chưa có yêu cầu nào." />
        ) : (
          <>
            {needsActionList.length > 0 && (
              <div className="mb-6">
                <SectionLabel count={needsActionList.length} tone="action">Cần xử lý</SectionLabel>
                <div className="space-y-2">
                  {needsActionList.map(r => (
                    <RequestCard key={r.id} r={r} onClick={() => navigate(`/governance/requests/${r.id}`)} />
                  ))}
                </div>
              </div>
            )}
            {resolvedList.length > 0 && (
              <div>
                <SectionLabel count={resolvedList.length} tone="resolved">Đã xử lý</SectionLabel>
                <div className="space-y-2">
                  {resolvedList.map(r => (
                    <RequestCard key={r.id} r={r} onClick={() => navigate(`/governance/requests/${r.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      ) : singleTabList.length === 0 ? (
        <EmptyState label="Không có yêu cầu phù hợp." />
      ) : (
        <div className="space-y-2">
          {singleTabList.map(r => (
            <RequestCard key={r.id} r={r} onClick={() => navigate(`/governance/requests/${r.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
