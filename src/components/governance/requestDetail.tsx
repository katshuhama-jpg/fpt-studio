import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronLeft, FlaskConical, PlugZap, ExternalLink, CheckCircle2, XCircle,
  User, Clock, Layers, AlertTriangle, ChevronDown, ChevronUp, Undo2, Info,
} from "lucide-react";
import {
  governanceStore, resourcePath, RESOURCE_TYPE_LABEL, AUDIENCE_LABEL,
  checkDrift, mainChangeState, requestDiff, type AgentResourceRef,
  requestKind, channelLabel, isExternalAgentId,
} from "@/components/governance/governanceStore";
import { ACTION_LABEL } from "@/components/governance/auditLogStore";
import {
  StatusBadge, ResourceTypePill, ChangeStateBadge, RequestAvatar, formatDateTime,
} from "@/components/governance/governanceUi";
import { AgentContentSection, ExternalAgentContentSection, ResourceContentSection, ResourceUsageSection, testConnector, type ResourceReqType } from "@/components/governance/resourceContent";
import { AgentTestPanel } from "@/components/governance/agentTestPanel";
import { AgentDeploymentSection, deploymentSummary } from "@/components/governance/agentDeployment";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { toast } from "sonner";

type Dialog = "approve" | "reject" | "revoke" | "withdraw" | null;
type Scope = "agent" | "resource";

const LIST_PATH: Record<Scope, string> = {
  agent: "/governance/requests",
  resource: "/governance/library-requests",
};

/** Shared body for both governance Request Detail experiences. The 2 scopes are 2 different
 * routes with 2 different reviewer personas — Org/Unit Admin approving an Agent publish vs.
 * Tenant Admin approving a Resource for shared reuse — kept as ONE component (not a full fork)
 * because most of the shell (meta rail, decision actions, history, dialogs, diff panel) really is
 * identical; only the main-column content and a few paths differ, gated by `scope`/`isAgent`
 * below. See GovernanceRequestDetail.tsx / GovernanceLibraryRequestDetail.tsx for the thin
 * route-level wrappers that set `scope`. */
export default function RequestDetailPage({ scope }: { scope: Scope }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const [tick, setTick] = useState(0);
  void tick;
  const refresh = () => setTick(t => t + 1);
  const req = id ? governanceStore.get(id) : undefined;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [revokeMode, setRevokeMode] = useState<"previous" | "stop">("previous");
  const REASON_MAX = 500;
  const [changesOpen, setChangesOpen] = useState(true);
  const [testState, setTestState] = useState<"idle" | "testing">("idle");
  const [testPanelOpen, setTestPanelOpen] = useState(false);

  // A request only ever lives at ONE correct URL — /governance/requests/:id for an Agent,
  // /governance/library-requests/:id for a Resource — so the left-nav highlight is always
  // driven straight off the URL prefix and can never point at the wrong queue (the "nhảy tab"
  // bug this replaces). A stale link pointing at the wrong scope (an old bookmark, an audit-log
  // row generated before this split) gets silently corrected here rather than rendering the
  // right content under a nav item that contradicts it.
  useEffect(() => {
    if (!req) return;
    const correctScope: Scope = req.resourceType === "agent" ? "agent" : "resource";
    if (correctScope !== scope) {
      navigate(`${LIST_PATH[correctScope]}/${req.id}`, { replace: true });
    }
  }, [req, scope, navigate]);

  if (!req) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto text-center">
        <p className="text-sm text-muted-foreground mb-3">Không tìm thấy yêu cầu này.</p>
        <button onClick={() => navigate(LIST_PATH[scope])} className="text-sm font-semibold text-primary hover:underline">
          ← Quay lại danh sách Requests
        </button>
      </div>
    );
  }

  const closeDialog = () => { setDialog(null); setReason(""); setReasonError(false); setRevokeMode("previous"); };
  const revokeFallback = req.status === "approved" ? governanceStore.revokeFallback(req) : undefined;

  const doApprove = () => {
    governanceStore.approve(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim() || undefined);
    toast.success(`Đã duyệt "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const doReject = () => {
    if (!reason.trim()) { setReasonError(true); return; }
    governanceStore.reject(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim());
    toast.success(`Đã từ chối "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const doWithdraw = () => {
    governanceStore.withdraw(req.id, CURRENT_USER.id, CURRENT_USER.name, "Người gửi đã rút yêu cầu.");
    toast.success(`Đã rút yêu cầu "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const doRevoke = () => {
    if (!reason.trim()) { setReasonError(true); return; }
    const fb = revokeMode === "previous" ? governanceStore.revokeFallback(req) : undefined;
    governanceStore.revoke(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim(), fb ? "previous" : "stop");
    toast.success(fb ? `Đã thu hồi ${req.version ?? ""}. Người dùng quay về ${fb.version}.` : `Đã thu hồi "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const isAgent = req.resourceType === "agent";
  const isChannelReq = requestKind(req) === "channels";
  // Who can decide is governed purely by Role permission (Roles → Publish requests). The requester
  // additionally gets "Rút yêu cầu"; if their role also holds the review permission they can decide
  // their own request too (self-approval is a permission question, not a hard block).
  const isRequester = req.requesterId === CURRENT_USER.id;
  // Role permission (Roles → Publish requests). Without it the page is read-only.
  const hasReviewPerm = can(isAgent ? "requests.review-agents" : "requests.review-resources");
  const canReview = req.status === "pending" && hasReviewPerm;
  const canRevoke = req.status === "approved" && hasReviewPerm;
  const readOnlyNote = !hasReviewPerm && !isRequester && (req.status === "pending" || req.status === "approved");
  const canWithdraw = req.status === "pending" && isRequester;
  const resourceType = req.resourceType as ResourceReqType;
  const drift = checkDrift(req);
  const changeState = mainChangeState(req);

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <button
        onClick={() => navigate(LIST_PATH[scope])}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-base"
      >
        <ChevronLeft size={15} /> Requests
      </button>

      {/* Pending: purpose banner (which of the 2 independent decisions this page is).
          Decided: outcome banner in its place — the result, who, when and why is the first thing
          anyone reopening a resolved request needs, not something to scroll to the bottom for. */}
      {req.status === "pending" ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted/50 px-3.5 py-3">
          <Info size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isChannelReq
              ? <>Bạn đang quyết định <span className="font-medium text-foreground">có bật thêm kênh ngoài {(req.channelsAdded ?? []).map(channelLabel).join(", ")} cho bản đang live hay không</span>. Phiên bản và phạm vi Workspace giữ nguyên.</>
              : isAgent
              ? <>Bạn đang quyết định <span className="font-medium text-foreground">Agent này có được publish tới người dùng hay không</span>.</>
              : <>Bạn đang quyết định <span className="font-medium text-foreground">thành phần này có được đưa vào Tenant Library để Builder khác dùng chung hay không</span>.</>}
          </p>
        </div>
      ) : (
        <OutcomeBanner req={req} isAgent={isAgent} isChannelReq={isChannelReq} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <RequestAvatar type={req.resourceType} resourceId={req.resourceId} fallbackIcon={req.resourceIcon} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight truncate">{req.resourceName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Same chips, same order, same styling as the Requests list row: type pill →
                  meta → the one colored StatusBadge last. */}
              {/* Type pill only on Resource requests — the Agent page is single-type by definition
                  (same as its list, which has no "Loại" column). */}
              {!isAgent && <ResourceTypePill type={req.resourceType} />}
              {req.externalSnap && <span className="text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-2.5 py-1">External Agent</span>}
              {isChannelReq && <span className="text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-2.5 py-1">Bật kênh ngoài</span>}
              {req.version && <span className="text-xs font-medium text-muted-foreground bg-surface-muted border border-border rounded-full px-2.5 py-1">{req.version}</span>}
              {changeState && !isChannelReq && <ChangeStateBadge state={changeState} />}
              <StatusBadge status={req.status} />
            </div>
          </div>
        </div>
        {/* Opens in a new tab so the reviewer never loses their place in the approval flow. */}
        <Link
          to={resourcePath(req.resourceType, req.resourceId)}
          target="_blank"
          rel="noopener noreferrer"
          title="Mở trong tab mới"
          className="h-9 px-3.5 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base shrink-0"
        >
          Mở trang {RESOURCE_TYPE_LABEL[req.resourceType]} <ExternalLink size={13} />
        </Link>
      </div>

      {/* Body — content column + a sticky rail for status/decision. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_336px] gap-6 lg:gap-8 items-start">
        {/* Main column */}
        <div className="min-w-0">
          {drift.drifted && (
            <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/5 px-3.5 py-3">
              <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning leading-relaxed">
                <span className="font-medium">{req.resourceName}</span> đã được sửa tiếp sau khi gửi yêu cầu này. Bạn đang duyệt đúng nội dung lúc gửi {req.version ?? ""} —
                các chỉnh sửa sau đó không nằm trong yêu cầu này và cần một yêu cầu mới.
              </p>
            </div>
          )}

          {req.note && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-1.5">Ghi chú từ người gửi</p>
              <p className="text-sm text-muted-foreground rounded-lg border border-border bg-surface px-3.5 py-3 leading-relaxed">{req.note}</p>
            </div>
          )}

          {/* Thay đổi so với lần duyệt trước — shown FIRST and open by default for a modified
              request: "what changed" is the main question when re-reviewing something already approved. */}
          {changeState === "modified" && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setChangesOpen(o => !o)}
                className="w-full flex items-center justify-between mb-1.5"
              >
                <span className="text-sm font-semibold">{isChannelReq ? "Kênh ngoài thay đổi" : "Thay đổi so với lần duyệt trước"}</span>
                {changesOpen ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {changesOpen && <MainDiffRows req={req} />}
            </div>
          )}

          {/* Nội dung/cấu hình thật của resource + phạm vi ảnh hưởng — the content that was
              completely missing before this pass: without it, a reviewer had nothing but a name
              and a one-line note to decide from. Agent: description/model/channels/instructions
              (the components it uses follow below). Resource: type-specific config + usage. */}
          {isAgent ? (
            <>
              {/* Where it will be published first — who is affected is the first thing a
                  reviewer weighs; then what the Agent is. */}
              <AgentDeploymentSection req={req} />
              {req.externalSnap || isExternalAgentId(req.resourceId) ? <ExternalAgentContentSection req={req} /> : <AgentContentSection req={req} />}
            </>
          ) : (
            <>
              <ResourceContentSection type={resourceType} id={req.resourceId} />
              <ResourceUsageSection type={resourceType} id={req.resourceId} />
            </>
          )}

          {isAgent && !isExternalAgentId(req.resourceId) && (
            <AgentComponents
              agentId={req.resourceId}
              refs={req.resourceRefs ?? []}
              privateKnowledge={req.privateKnowledge ?? knowledgeStore.list(req.resourceId).map(k => ({ name: k.kind === "url" ? (k.title || k.name) : k.name, kind: k.kind }))}
            />
          )}

        </div>

        {/* Right rail — request meta, decision actions, history. */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4 space-y-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Người gửi</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User size={13} className="text-muted-foreground" /> {req.requesterName}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Gửi lúc</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Clock size={13} className="text-muted-foreground" /> <span className="tabular-nums">{formatDateTime(req.submittedAt)}</span></p>
            </div>
            {req.reviewUnits?.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Người duyệt</p>
                <p className="text-sm font-medium text-foreground">
                  {req.reviewMode === "single" ? `Admin ${req.reviewUnits[0].name}` : `Admin của ${req.reviewUnits.map(u => u.name).join(", ")}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {req.reviewMode === "single" ? "Đơn vị chiếm từ 80% thành viên nhóm." : "Không đơn vị nào chiếm từ 80% thành viên — 1 Admin duyệt là đủ."}
                </p>
              </div>
            ) : null}
            {/* Agent: where it's published is the "Kênh triển khai" section in the main column.
                Resource: the requested sharing scope stays here. */}
            {!isAgent && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Phạm vi dùng chung</p>
                <p className="text-sm font-medium text-foreground">{AUDIENCE_LABEL[req.audience]}</p>
                {req.scopeSummary && (
                  <p className="text-xs text-muted-foreground mt-1">{req.scopeSummary}</p>
                )}
              </div>
            )}
            {req.updatedAt !== req.submittedAt && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cập nhật</p>
                <p className="text-sm font-medium text-foreground tabular-nums">{formatDateTime(req.updatedAt)}</p>
              </div>
            )}
          </div>

          {canReview && (
            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
              <button
                onClick={() => setDialog("approve")}
                className="w-full h-9 rounded-lg bg-success text-white hover:opacity-90 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <CheckCircle2 size={14} /> Duyệt
              </button>
              <button
                onClick={() => setDialog("reject")}
                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <XCircle size={14} /> Từ chối
              </button>
              {isAgent && (
                <button
                  onClick={() => setTestPanelOpen(true)}
                  className="w-full h-9 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center justify-center gap-1.5 transition-base !mt-3"
                >
                  <FlaskConical size={14} /> Test
                </button>
              )}
              {!isAgent && resourceType === "connector" && (
                <button
                  onClick={() => {
                    setTestState("testing");
                    testConnector(req.resourceName).then(res => {
                      setTestState("idle");
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.message);
                    });
                  }}
                  disabled={testState === "testing"}
                  className="w-full h-9 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center justify-center gap-1.5 transition-base !mt-3 disabled:opacity-60"
                >
                  <PlugZap size={14} /> {testState === "testing" ? "Đang kiểm tra..." : "Test kết nối"}
                </button>
              )}
            </div>
          )}

          {canWithdraw && (
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
                Bạn là người gửi yêu cầu này. Bạn có thể rút lại khi yêu cầu còn chờ duyệt.
              </p>
              <button
                onClick={() => setDialog("withdraw")}
                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <Undo2 size={14} /> Rút yêu cầu
              </button>
            </div>
          )}

          {readOnlyNote && (
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bạn đang xem ở chế độ chỉ đọc. Chỉ vai trò có quyền “{isAgent ? "Review Agent publish requests" : "Review Resource sharing requests"}” mới duyệt được yêu cầu này.
              </p>
            </div>
          )}

          {canRevoke && (
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <button
                onClick={() => setDialog("revoke")}
                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <Undo2 size={14} /> Thu hồi
              </button>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                {isAgent
                  ? (revokeFallback ? `Ngừng phục vụ ${req.version ?? "bản này"} ngay — bạn chọn quay về ${revokeFallback.version} hoặc ngừng hẳn Agent.` : "Agent ngừng phục vụ người dùng ngay lập tức. Muốn publish lại cần gửi yêu cầu mới.")
                  : "Thành phần ngừng dùng chung trong Tenant Library ngay lập tức. Muốn dùng chung lại cần gửi yêu cầu mới."}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-3.5">
            <p className="text-sm font-semibold mb-2.5">Lịch sử</p>
            <div className="space-y-3">
              {[...req.history].reverse().map(h => (
                <div key={h.id} className="flex gap-2.5 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-foreground leading-snug">
                      <span className="font-medium">{h.actorName}</span> {ACTION_LABEL[h.action].toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.at)}</p>
                    {h.note && <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialogs */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl border border-border shadow-lg p-6">
            <h3 className="font-display text-lg font-semibold mb-1">
              {dialog === "approve" ? `Duyệt "${req.resourceName}"?`
                : dialog === "reject" ? `Từ chối "${req.resourceName}"?`
                : dialog === "withdraw" ? `Rút yêu cầu ${req.version ?? ""}?`
                : `Thu hồi "${req.resourceName}"?`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {dialog === "approve" && (isChannelReq
                ? `Agent sẽ hoạt động thêm trên ${(req.channelsAdded ?? []).map(channelLabel).join(", ")}. Bản live và phạm vi Workspace giữ nguyên.`
                : isAgent
                ? (() => {
                    const live = agentPublishStore.get(req.resourceId);
                    const replaces = live.placement !== null && live.version && live.version !== req.version ? ` Bản ${req.version} sẽ thay bản đang live ${live.version}.` : "";
                    return deploymentSummary(req) + replaces;
                  })()
                : "Sau khi duyệt, thành phần này sẽ xuất hiện trong Tenant Library để các Builder khác dùng chung.")}
              {dialog === "reject" && "Người gửi sẽ nhận được lý do từ chối và cần tạo yêu cầu mới nếu muốn gửi lại."}
              {dialog === "withdraw" && "Admin sẽ không còn thấy yêu cầu này để duyệt. Agent giữ nguyên trạng thái hiện tại — bạn có thể gửi lại bất cứ lúc nào."}
              {dialog === "revoke" && (isChannelReq
                ? `Agent sẽ ngừng hoạt động trên ${(req.channelsAdded ?? []).map(channelLabel).join(", ")} ngay lập tức. Bản live trong Agent Workspace không bị ảnh hưởng.`
                : isAgent
                ? (revokeFallback ? `${req.version ?? "Bản này"} sẽ ngừng phục vụ ngay. Chọn điều xảy ra tiếp theo:` : "Agent sẽ ngừng publish ngay lập tức và cần được gửi duyệt lại từ đầu nếu muốn publish lại. Hành động này không thể hoàn tác.")
                : "Thành phần sẽ ngừng dùng chung ngay lập tức (các Agent đang dùng bản riêng của họ không bị ảnh hưởng) và cần được gửi duyệt lại từ đầu. Hành động này không thể hoàn tác.")}
            </p>
            {dialog === "revoke" && revokeFallback && (
              <fieldset className="mb-4 space-y-2">
                <legend className="sr-only">Sau khi thu hồi</legend>
                {([
                  ["previous", `Quay về ${revokeFallback.version}`, `Người dùng dùng lại ${revokeFallback.version} — bản đã được duyệt trước đó (${revokeFallback.scopeSummary ?? "phạm vi cũ"}).`],
                  ["stop", "Ngừng phục vụ hoàn toàn", "Agent về Bản nháp. Muốn publish lại cần gửi yêu cầu mới."],
                ] as const).map(([v, t, d]) => (
                  <label key={v} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${revokeMode === v ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-muted"}`}>
                    <input type="radio" name="revoke-mode" value={v} checked={revokeMode === v} onChange={() => setRevokeMode(v)} className="mt-1 accent-primary" />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{t}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{d}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {(dialog === "reject" || dialog === "revoke") && (
              <div className="mb-4">
                <label htmlFor="gov-reason" className="block text-sm font-medium mb-1.5">
                  {dialog === "reject" ? "Lý do từ chối" : "Lý do thu hồi"} <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="gov-reason"
                  rows={3}
                  autoFocus
                  maxLength={REASON_MAX}
                  value={reason}
                  onChange={e => { setReason(e.target.value); if (e.target.value.trim()) setReasonError(false); }}
                  aria-invalid={reasonError}
                  aria-describedby="gov-reason-help"
                  placeholder={dialog === "reject" ? "Ví dụ: Cần bổ sung Guardrails cho câu hỏi về lương thưởng." : "Ví dụ: Agent trả lời sai chính sách mới, tạm dừng để sửa."}
                  className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base resize-none ${
                    reasonError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
                  }`}
                />
                <div id="gov-reason-help" className="flex items-start justify-between gap-3 mt-1">
                  <p className={`text-xs ${reasonError ? "text-destructive" : "text-muted-foreground"}`}>
                    {reasonError
                      ? (dialog === "reject" ? "Nhập lý do để người gửi biết cần sửa gì." : "Nhập lý do để người gửi biết vì sao Agent bị thu hồi.")
                      : "Người gửi sẽ thấy lý do này."}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{reason.length}/{REASON_MAX}</span>
                </div>
              </div>
            )}
            {dialog === "approve" && (
              <div className="mb-4">
                <label htmlFor="gov-note" className="block text-sm font-medium mb-1.5">Ghi chú <span className="text-muted-foreground font-normal">(tùy chọn)</span></label>
                <textarea
                  id="gov-note"
                  rows={2}
                  maxLength={REASON_MAX}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ví dụ: Đã test các câu hỏi thường gặp, trả lời đúng."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
                />
                <p className="text-xs text-muted-foreground tabular-nums text-right mt-1">{reason.length}/{REASON_MAX}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={closeDialog} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">{dialog === "withdraw" ? "Giữ yêu cầu" : "Hủy"}</button>
              <button
                onClick={dialog === "approve" ? doApprove : dialog === "reject" ? doReject : dialog === "withdraw" ? doWithdraw : doRevoke}
                className={`h-9 px-4 rounded-lg text-sm font-medium transition-base ${
                  dialog === "reject" || dialog === "revoke" || dialog === "withdraw" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-success text-white hover:opacity-90"
                }`}
              >
                {dialog === "approve" ? "Xác nhận duyệt" : dialog === "reject" ? "Xác nhận từ chối" : dialog === "withdraw" ? "Rút yêu cầu" : "Xác nhận thu hồi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test chat — stays on this page instead of navigating to /agents/:id?tab=test, so the
          admin never loses their place mid-review (and doesn't land on that tab's not-yet-built
          placeholder). See agentTestPanel.tsx. */}
      {isAgent && (
        <AgentTestPanel agentId={req.resourceId} open={testPanelOpen} onOpenChange={setTestPanelOpen} />
      )}
    </div>
  );
}

/** Result of a decided request, shown at the top of the page. */
function OutcomeBanner({ req, isAgent, isChannelReq }: { req: import("@/components/governance/governanceStore").GovRequest; isAgent: boolean; isChannelReq?: boolean }) {
  const last = [...req.history].reverse().find(h => h.action !== "submitted");
  const meta = {
    approved: { box: "border-success/25 bg-success/5", icon: CheckCircle2, iconCls: "text-success",
      title: isChannelReq ? `Đã duyệt — đã bật ${(req.channelsAdded ?? []).map(channelLabel).join(", ")}` : isAgent ? `Đã duyệt — ${req.version ?? "bản này"} đã được publish` : "Đã duyệt — đã có trong Tenant Library" },
    rejected: { box: "border-destructive/25 bg-destructive/5", icon: XCircle, iconCls: "text-destructive", title: "Đã từ chối" },
    revoked: { box: "border-destructive/25 bg-destructive/5", icon: Undo2, iconCls: "text-destructive",
      title: isChannelReq ? `Đã thu hồi — đã tắt ${(req.channelsAdded ?? []).map(channelLabel).join(", ")}` : isAgent ? (req.revokedToVersion ? `Đã thu hồi — người dùng quay về ${req.revokedToVersion}` : "Đã thu hồi — Agent đã ngừng publish") : "Đã thu hồi — đã gỡ khỏi Tenant Library" },
    withdrawn: { box: "border-border bg-surface-muted/50", icon: Undo2, iconCls: "text-muted-foreground", title: "Đã rút yêu cầu" },
    pending: { box: "", icon: Info, iconCls: "", title: "" },
  }[req.status];
  const Icon = meta.icon;
  const note = req.status === "revoked" ? (req.revokeReason ?? last?.note) : req.status === "withdrawn" ? last?.note : req.reviewNote;
  return (
    <div className={`mb-6 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${meta.box}`}>
      <Icon size={16} className={`shrink-0 mt-0.5 ${meta.iconCls}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{meta.title}</p>
        {note && <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">“{note}”</p>}
        {last && <p className="text-xs text-muted-foreground mt-1">{last.actorName} · {formatDateTime(last.at)}</p>}
      </div>
    </div>
  );
}

/** The main resource's own field-level diff vs. its last-approved live snapshot — replaces the
 * old per-bundled-item diff panel now that there's no bundle. */
function MainDiffRows({ req }: { req: import("@/components/governance/governanceStore").GovRequest }) {
  const diffs = requestDiff(req);
  if (diffs.length === 0) {
    return <p className="text-xs text-muted-foreground">Không có thay đổi nào ở các trường được theo dõi.</p>;
  }
  return (
    <div className="rounded-lg border border-border/70 bg-white/70 divide-y divide-border/60 overflow-hidden">
      {diffs.map(d => (
        <div key={d.key} className="px-3 py-2.5 text-xs">
          <p className="font-medium text-foreground mb-1">{d.label}</p>
          <p className="text-muted-foreground line-through opacity-70 break-words">{d.before}</p>
          <p className="text-foreground break-words">{d.after}</p>
        </div>
      ))}
    </div>
  );
}

const COMPONENT_TYPES = ["knowledge", "skill", "guardrail", "connector"] as const;

/** What the Agent is built from, grouped by type. Tabs (only when the Agent uses more than one
 * type) let the reviewer look at, say, just the Guardrails; each row opens the component in a new
 * tab so the review isn't interrupted. The components' own Tenant-sharing status is deliberately
 * NOT shown here — it's a separate Tenant Admin decision and irrelevant to publishing this Agent. */
const PRIVATE_KIND_LABEL = { doc: "Tài liệu", url: "URL", faq: "FAQ" } as const;

function AgentComponents({ agentId, refs, privateKnowledge }: {
  agentId: string;
  refs: AgentResourceRef[];
  /** The Agent's own knowledge items (uploaded straight into the Agent, not a Console KB). */
  privateKnowledge: { name: string; kind: "doc" | "url" | "faq" }[];
}) {
  type Row =
    | { key: string; type: ResourceReqType; name: string; to: string; privateKind?: undefined }
    | { key: string; type: "knowledge"; name: string; to: string; privateKind: "doc" | "url" | "faq" };
  const rows: Row[] = [
    ...refs.map(r => ({ key: `${r.type}:${r.resourceId}`, type: r.type, name: r.name, to: resourcePath(r.type, r.resourceId) })),
    ...privateKnowledge.map((k, i) => ({ key: `own:${i}`, type: "knowledge" as const, name: k.name, to: `/agents/${agentId}?tab=build&section=knowledge`, privateKind: k.kind })),
  ];
  const types = COMPONENT_TYPES.filter(t => rows.some(r => r.type === t));
  const [tab, setTab] = useState<"all" | ResourceReqType>("all");
  if (rows.length === 0) return null;
  const shown = tab === "all" ? rows : rows.filter(r => r.type === tab);
  const tabs = [
    { key: "all" as const, label: "Tất cả", count: rows.length },
    ...types.map(t => ({ key: t, label: RESOURCE_TYPE_LABEL[t], count: rows.filter(r => r.type === t).length })),
  ];
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <Layers size={14} className="text-muted-foreground" /> Thành phần Agent này sử dụng ({rows.length})
      </p>
      {types.length > 1 && (
        <div role="tablist" aria-label="Lọc thành phần theo loại" className="flex items-center gap-1 flex-wrap mb-3">
          {tabs.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`px-3 h-8 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.label}
                <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-sm ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="space-y-2">
        {shown.map(it => (
          <div key={it.key} className="rounded-xl border border-border bg-surface flex items-center gap-3 px-4 py-3">
            {/* Type shown once, as the tag — no separate leading icon repeating it. */}
            <p className="min-w-0 flex-1 text-sm font-medium text-foreground truncate" title={it.name}>{it.name}</p>
            {it.privateKind && (
              <span className="text-[11px] font-medium text-muted-foreground bg-surface-muted border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
                Riêng của Agent · {PRIVATE_KIND_LABEL[it.privateKind]}
              </span>
            )}
            <ResourceTypePill type={it.type} />
            <Link
              to={it.to}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở trong tab mới"
              aria-label={`Mở ${it.name} trong tab mới`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted shrink-0 transition-base"
            >
              <ExternalLink size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
