import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, FilterIcon, LayerIcon, ChevronDownIcon, InboxIcon, Robot01Icon, LibraryIcon } from "@hugeicons/core-free-icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  governanceStore, AUDIENCE_LABEL,
  type GovRequestStatus, type GovResourceType, type GovRequest,
} from "@/components/governance/governanceStore";
import { StatusBadge, ResourceTypeIcon, ResourceTypePill, initials, relativeTime } from "@/components/governance/governanceUi";

/** The 2 independent decisions this queue covers (see the Governance solution note) now read as
 * 2 separate queues, not one merged list with a type filter — Org/Unit Admin's "does this Agent
 * reach users" and Tenant Admin's "does this resource go into the Tenant Library" are different
 * questions with different answers possible (an Agent can be approved while a resource it uses
 * is still private, or never gets approved for reuse at all), so they get their own tab, own
 * counts, and own empty states rather than living side by side in one filterable table. */
type Scope = "agent" | "resource";

type MainTab = "all" | GovRequestStatus;

/** Which of the 2 groups a status belongs to, from the ADMIN's point of view (this page's
 * viewer): "action" is waiting on THIS viewer to decide (pending); everything else is already
 * resolved one way or another (approved/rejected/revoked) — there's no longer a middle "waiting
 * on the requester" state, since a rejected request simply needs a brand-new submission rather
 * than an in-place resubmit. */
type Grouping = "action" | "resolved";
const GROUP_OF: Record<GovRequestStatus, Grouping> = {
  pending: "action",
  approved: "resolved",
  rejected: "resolved",
  revoked: "resolved",
};

const TABS: { key: MainTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "revoked", label: "Đã thu hồi" },
];

/** Only the 4 reusable-resource types — "agent" has its own scope tab now, so it never appears
 * in this dropdown. */
const RESOURCE_TYPE_FILTERS: { key: "all" | GovResourceType; label: string }[] = [
  { key: "all", label: "Tất cả loại" },
  { key: "knowledge", label: "Knowledge" },
  { key: "skill", label: "Skill" },
  { key: "guardrail", label: "Guardrails" },
  { key: "connector", label: "Connector" },
];

/** One request per table row. The queue used to render each request as its own rounded card
 * with a colored left accent; it's a real table now — the design system's table treatment is a
 * bordered row inside one card, and the status column already carries the colour that the
 * accent bar was duplicating. */
function RequestRow({ r, scope, onClick }: { r: GovRequest; scope: Scope; onClick: () => void }) {
  return (
    <TableRow
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 text-base">
            {r.resourceIcon ?? <ResourceTypeIcon type={r.resourceType} size={16} className="text-muted-foreground" />}
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate">{r.resourceName}</p>
            {r.resourceRefs && r.resourceRefs.length > 0 && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium rounded-sm px-1.5 py-0.5 whitespace-nowrap text-muted-foreground bg-muted">
                <HugeiconsIcon icon={LayerIcon} size={12} />
                {r.resourceRefs.length} thành phần đi kèm
              </span>
            )}
          </div>
        </div>
      </TableCell>
      {scope === "resource" && <TableCell className="py-3"><ResourceTypePill type={r.resourceType} /></TableCell>}
      <TableCell className="py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
            {initials(r.requesterName)}
          </span>
          <span className="truncate">{r.requesterName}</span>
        </div>
      </TableCell>
      <TableCell className="py-3 text-muted-foreground">{AUDIENCE_LABEL[r.audience]}</TableCell>
      <TableCell className="py-3 text-muted-foreground whitespace-nowrap tabular-nums">{relativeTime(r.submittedAt)}</TableCell>
      <TableCell className="py-3"><StatusBadge status={r.status} /></TableCell>
    </TableRow>
  );
}

/** The whole list is one bordered card: header row, then the request rows. The "Loại" column
 * only makes sense in the Resource scope (the Agent scope is a single type by definition), and
 * the "Publish to" header is relabelled per scope — for an Agent it's who the Agent reaches, for
 * a Resource it's the reuse scope being requested inside the Tenant Library. */
function RequestTable({ rows, scope, onOpen }: { rows: GovRequest[]; scope: Scope; onOpen: (id: string) => void }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10">Resource</TableHead>
            {scope === "resource" && <TableHead className="h-10 w-[130px]">Loại</TableHead>}
            <TableHead className="h-10 w-[180px]">Người gửi</TableHead>
            <TableHead className="h-10 w-[170px]">{scope === "agent" ? "Publish to" : "Phạm vi dùng chung"}</TableHead>
            <TableHead className="h-10 w-[130px]">Gửi lúc</TableHead>
            <TableHead className="h-10 w-[140px]">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => <RequestRow key={r.id} r={r} scope={scope} onClick={() => onOpen(r.id)} />)}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border bg-card px-5 py-12 flex flex-col items-center gap-2 text-center">
      <HugeiconsIcon icon={InboxIcon} size={24} className="text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Section divider for the "Tất cả" tab — 2 groups: "cần xử lý" for an Admin means only
 * "pending" (see the Grouping comment above); everything else is already resolved. */
function SectionLabel({ children, count, tone }: { children: string; count: number; tone: Grouping }) {
  const isAction = tone === "action";
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className={`text-sm font-medium whitespace-nowrap ${isAction ? "text-foreground" : "text-muted-foreground"}`}>
        {children}
      </span>
      <span className={`text-xs font-medium tabular-nums rounded-sm px-1.5 py-0.5 ${
        isAction ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}>
        {count}
      </span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

/** The 2 top-level scope tabs — bigger, more separated than the status tabs below them, since
 * this is the decision that actually splits the queue in two; each carries its own "chờ duyệt"
 * count so an Admin sees at a glance whether either queue needs attention without opening it. */
function ScopeTabs({ scope, onChange, agentPending, resourcePending }: {
  scope: Scope; onChange: (s: Scope) => void; agentPending: number; resourcePending: number;
}) {
  const items: { key: Scope; label: string; icon: any; pending: number }[] = [
    { key: "agent", label: "Duyệt Agent", icon: Robot01Icon, pending: agentPending },
    { key: "resource", label: "Duyệt dùng chung Resource", icon: LibraryIcon, pending: resourcePending },
  ];
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {items.map(it => {
        const active = scope === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`flex items-center gap-2 px-4 h-11 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
              active ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <HugeiconsIcon icon={it.icon} size={16} />
            {it.label}
            {it.pending > 0 && (
              <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-sm ${
                active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {it.pending}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const SCOPE_INTRO: Record<Scope, string> = {
  agent: "Quyết định trong tab này chỉ ảnh hưởng đến việc một Agent có được publish tới người dùng trong Org/Unit hay không (Org/Unit Admin). Nó không phụ thuộc vào việc các Knowledge/Skill/Guardrails/Connector mà Agent đó dùng đã được duyệt dùng chung hay chưa — một Agent vẫn có thể được duyệt publish trong khi Resource nó dùng chưa (hoặc không bao giờ) được Tenant Admin cho phép dùng chung, xem trạng thái dùng chung ngay trên trang chi tiết của Agent.",
  resource: "Quyết định trong tab này chỉ ảnh hưởng đến việc một Knowledge/Skill/Guardrails/Connector có được đưa vào Tenant Library để Builder khác dùng chung hay không (Tenant Admin). Nó không ảnh hưởng đến bất kỳ Agent nào đang dùng resource này — Agent đó có thể đã được publish và vẫn tiếp tục hoạt động bình thường dù resource ở đây bị từ chối dùng chung.",
};

export default function GovernanceRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const all = governanceStore.list();

  const scope: Scope = searchParams.get("scope") === "resource" ? "resource" : "agent";
  const setScope = (s: Scope) => {
    const next = new URLSearchParams(searchParams);
    if (s === "agent") next.delete("scope"); else next.set("scope", s);
    setSearchParams(next, { replace: true });
    // Switching scope starts that queue fresh rather than carrying over a status/type filter
    // that may not even apply on the other side (e.g. a "Guardrails" type filter has nothing to
    // show in the Agent scope).
    setTab("all");
    setTypeFilter("all");
  };

  const [tab, setTab] = useState<MainTab>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | GovResourceType>("all");
  const [query, setQuery] = useState("");

  const agentPending = useMemo(() => all.filter(r => r.resourceType === "agent" && r.status === "pending").length, [all]);
  const resourcePending = useMemo(() => all.filter(r => r.resourceType !== "agent" && r.status === "pending").length, [all]);

  const scopedAll = useMemo(
    () => all.filter(r => scope === "agent" ? r.resourceType === "agent" : r.resourceType !== "agent"),
    [all, scope],
  );

  const counts = useMemo(() => ({
    all: scopedAll.length,
    pending: scopedAll.filter(r => r.status === "pending").length,
    approved: scopedAll.filter(r => r.status === "approved").length,
    rejected: scopedAll.filter(r => r.status === "rejected").length,
    revoked: scopedAll.filter(r => r.status === "revoked").length,
  }), [scopedAll]);

  // Type/search filter only — status grouping and sort order are decided below, separately per
  // tab, since "open" and "resolved" requests read best in a different order (oldest-first so
  // the longest-waiting item surfaces, vs newest-first so the latest decision is on top).
  const typeAndQueryFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedAll
      .filter(r => scope === "agent" || typeFilter === "all" || r.resourceType === typeFilter)
      .filter(r => !q || r.resourceName.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q));
  }, [scopedAll, scope, typeFilter, query]);

  // "action" ages from submittedAt (that's the clock that's been running since the Admin first
  // owed a decision); "resolved" just shows the latest activity first.
  const sortForGroup = (list: GovRequest[], group: Grouping) => {
    if (group === "action") return [...list].sort((a, b) => a.submittedAt - b.submittedAt);
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const actionList = useMemo(
    () => sortForGroup(typeAndQueryFiltered.filter(r => GROUP_OF[r.status] === "action"), "action"),
    [typeAndQueryFiltered],
  );
  const resolvedList = useMemo(
    () => sortForGroup(typeAndQueryFiltered.filter(r => GROUP_OF[r.status] === "resolved"), "resolved"),
    [typeAndQueryFiltered],
  );
  const singleTabList = useMemo(() => {
    if (tab === "all") return [];
    const list = typeAndQueryFiltered.filter(r => r.status === tab);
    return sortForGroup(list, GROUP_OF[tab]);
  }, [typeAndQueryFiltered, tab]);

  const openRequest = (id: string) => navigate(`/governance/requests/${id}`);

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Requests</h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          {SCOPE_INTRO[scope]}
        </p>
      </div>

      <ScopeTabs scope={scope} onChange={setScope} agentPending={agentPending} resourcePending={resourcePending} />

      <div className="flex items-center gap-1 flex-wrap mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 h-9 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
              tab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-sm ${
              tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {counts[t.key === "all" ? "all" : t.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        {scope === "resource" ? (
          <div className="relative">
            <HugeiconsIcon icon={FilterIcon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as "all" | GovResourceType)}
              aria-label="Lọc theo loại resource"
              className="h-9 pl-9 pr-8 rounded-md border bg-transparent text-sm appearance-none transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {RESOURCE_TYPE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <HugeiconsIcon icon={ChevronDownIcon} size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        ) : <span />}
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc người gửi..."
            className="h-9 w-64 pl-9 pr-3 rounded-md border bg-transparent text-sm placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      </div>

      {tab === "all" ? (
        actionList.length === 0 && resolvedList.length === 0 ? (
          <EmptyState
            title={scope === "agent" ? "Chưa có Agent nào chờ duyệt publish" : "Chưa có Resource nào chờ duyệt dùng chung"}
            hint={scope === "agent" ? "Yêu cầu publish Agent tới Org/Unit sẽ xuất hiện ở đây." : "Yêu cầu đưa Knowledge/Skill/Guardrails/Connector vào Tenant Library sẽ xuất hiện ở đây."}
          />
        ) : (
          <div className="space-y-6">
            {actionList.length > 0 && (
              <div>
                <SectionLabel count={actionList.length} tone="action">Chờ bạn duyệt</SectionLabel>
                <RequestTable rows={actionList} scope={scope} onOpen={openRequest} />
              </div>
            )}
            {resolvedList.length > 0 && (
              <div>
                <SectionLabel count={resolvedList.length} tone="resolved">Đã xử lý</SectionLabel>
                <RequestTable rows={resolvedList} scope={scope} onOpen={openRequest} />
              </div>
            )}
          </div>
        )
      ) : singleTabList.length === 0 ? (
        <EmptyState title="Không có yêu cầu phù hợp" hint="Thử đổi bộ lọc loại resource hoặc từ khóa tìm kiếm." />
      ) : (
        <RequestTable rows={singleTabList} scope={scope} onOpen={openRequest} />
      )}
    </div>
  );
}
