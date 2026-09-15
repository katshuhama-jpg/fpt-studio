import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronLeft, FlaskConical, ExternalLink, CheckCircle2, XCircle, MessageSquareWarning,
  User, Clock, Layers, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, Undo2,
} from "lucide-react";
import {
  governanceStore, resourcePath, RESOURCE_TYPE_LABEL, AUDIENCE_LABEL,
  diffSnapshots, itemNeedsReview, checkDrift, type GovBundledItem,
} from "@/components/governance/governanceStore";
import { ACTION_LABEL } from "@/components/governance/auditLogStore";
import {
  StatusBadge, ResourceTypeIcon, ChangeStateBadge, CHANGE_STATE_ACCENT, relativeTime, formatDateTime,
} from "@/components/governance/governanceUi";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { toast } from "sonner";

type Dialog = "approve" | "reject" | "changes" | "revoke" | null;

const itemKey = (it: GovBundledItem) => `${it.type}:${it.resourceId}`;

export default function GovernanceRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  void tick;
  const refresh = () => setTick(t => t + 1);
  const req = id ? governanceStore.get(id) : undefined;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [openDiffs, setOpenDiffs] = useState<Set<string>>(new Set());

  if (!req) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto text-center">
        <p className="text-sm text-muted-foreground mb-3">Không tìm thấy yêu cầu này.</p>
        <button onClick={() => navigate("/governance/requests")} className="text-sm font-semibold text-primary hover:underline">
          ← Quay lại danh sách Requests
        </button>
      </div>
    );
  }

  const closeDialog = () => { setDialog(null); setReason(""); };

  const doApprove = () => {
    governanceStore.approve(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim() || undefined);
    toast.success(`Đã duyệt "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const doReject = () => {
    if (!reason.trim()) { toast.error("Vui lòng nhập lý do từ chối."); return; }
    governanceStore.reject(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim());
    toast.success(`Đã từ chối "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const doRequestChanges = () => {
    if (!reason.trim()) { toast.error("Vui lòng nhập nội dung cần cập nhật."); return; }
    governanceStore.requestChanges(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim());
    toast.success("Đã gửi yêu cầu cập nhật tới người gửi.");
    closeDialog(); refresh();
  };
  const doResubmit = () => {
    governanceStore.resubmit(req.id, req.requesterId, req.requesterName, "Đã cập nhật theo góp ý.");
    toast.success("Đã gửi lại yêu cầu — chuyển về hàng chờ duyệt.");
    refresh();
  };
  const doRevoke = () => {
    if (!reason.trim()) { toast.error("Vui lòng nhập lý do thu hồi."); return; }
    governanceStore.revoke(req.id, CURRENT_USER.id, CURRENT_USER.name, reason.trim());
    toast.success(`Đã thu hồi "${req.resourceName}".`);
    closeDialog(); refresh();
  };
  const doDecideItem = (it: GovBundledItem, decision: "approved" | "rejected") => {
    governanceStore.decideBundledItem(req.id, it.type, it.resourceId, it.decision === decision ? undefined : decision);
    refresh();
  };
  const toggleDiff = (it: GovBundledItem) => {
    setOpenDiffs(prev => {
      const next = new Set(prev);
      const k = itemKey(it);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const canReview = req.status === "pending";
  const isAgent = req.resourceType === "agent";
  const needsAttentionCount = req.bundledItems.filter(it => itemNeedsReview(it.changeState)).length;
  const rejectedItemCount = req.bundledItems.filter(it => it.decision === "rejected").length;
  const drift = checkDrift(req);

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <button onClick={() => navigate("/governance/requests")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-base">
        <ChevronLeft size={15} /> Requests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-xl bg-surface-muted flex items-center justify-center shrink-0 text-xl border border-border">
            {req.resourceIcon ?? <ResourceTypeIcon type={req.resourceType} size={18} className="text-muted-foreground" />}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight truncate">{req.resourceName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground bg-surface-muted border border-border rounded-full px-2.5 py-1">
                {RESOURCE_TYPE_LABEL[req.resourceType]}
              </span>
              {req.version && <span className="text-xs font-medium text-muted-foreground bg-surface-muted border border-border rounded-full px-2.5 py-1">{req.version}</span>}
              <StatusBadge status={req.status} />
            </div>
          </div>
        </div>
        <Link
          to={resourcePath(req.resourceType, req.resourceId)}
          className="h-9 px-3.5 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base shrink-0"
        >
          Xem chi tiết <ExternalLink size={13} />
        </Link>
      </div>

      {/* Body — content column + a sticky rail for status/decision, matching the
          review-page pattern used across the industry (meta + primary actions stay
          reachable no matter how long the bundled-items list below gets). */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_336px] gap-6 lg:gap-8 items-start">
        {/* Main column */}
        <div className="min-w-0">
          {drift.drifted && (
            <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/5 px-3.5 py-3">
              <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning leading-relaxed">
                <span className="font-medium">{req.resourceName}</span> đã được chỉnh sửa tiếp sau khi gửi yêu cầu này{drift.at ? ` (lúc ${formatDateTime(drift.at)})` : ""} —
                nội dung admin đang xem bên dưới có thể chưa phải bản mới nhất. Cân nhắc yêu cầu người gửi gửi lại trước khi duyệt.
              </p>
            </div>
          )}

          {req.note && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-1.5">Ghi chú từ người gửi</p>
              <p className="text-sm text-muted-foreground rounded-lg border border-border bg-surface px-3.5 py-3 leading-relaxed">{req.note}</p>
            </div>
          )}

          {/* Bundled sub-resources — the nested-approval answer */}
          {req.bundledItems.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                <p className="text-sm font-semibold flex items-center gap-1.5"><Layers size={14} className="text-muted-foreground" /> Thành phần đi kèm ({req.bundledItems.length})</p>
                {needsAttentionCount > 0 && (
                  <span className="text-xs font-semibold text-primary bg-primary-soft rounded-full px-2.5 py-0.5 whitespace-nowrap">{needsAttentionCount} cần chú ý</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Agent này tham chiếu các thành phần bên dưới. Mặc định cả yêu cầu được duyệt cùng lúc — nhưng bạn có thể{" "}
                <span className="font-medium text-foreground">từ chối riêng từng thành phần</span> bên dưới: thành phần đó sẽ giữ nguyên bản đã duyệt trước đó, các thành phần còn lại vẫn được publish bình thường.
              </p>
              <div className="space-y-2">
                {req.bundledItems.map(it => {
                  const needsReview = itemNeedsReview(it.changeState);
                  const diffs = diffSnapshots(it.liveSnapshot, it.candidateSnapshot);
                  const isOpen = openDiffs.has(itemKey(it));
                  return (
                    <div
                      key={itemKey(it)}
                      className={`rounded-xl border border-l-4 transition-base ${CHANGE_STATE_ACCENT[it.changeState]} ${it.changeState === "unchanged_approved" ? "opacity-70" : ""}`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-muted-foreground border border-border/60">
                          <ResourceTypeIcon type={it.type} size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                          <p className="text-xs text-muted-foreground">{RESOURCE_TYPE_LABEL[it.type]}</p>
                        </div>
                        <ChangeStateBadge state={it.changeState} />
                        {diffs.length > 0 && (
                          <button
                            onClick={() => toggleDiff(it)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 transition-base"
                          >
                            Xem thay đổi {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                        <Link to={resourcePath(it.type, it.resourceId)} className="text-muted-foreground hover:text-foreground shrink-0" title="Xem chi tiết">
                          <ExternalLink size={14} />
                        </Link>
                      </div>

                      {isOpen && diffs.length > 0 && (
                        <div className="px-4 pb-3">
                          <div className="rounded-lg border border-border/70 bg-white/70 divide-y divide-border/60 overflow-hidden">
                            {diffs.map(d => (
                              <div key={d.key} className="px-3 py-2 text-xs">
                                <p className="font-medium text-foreground mb-1">{d.label}</p>
                                <p className="text-muted-foreground line-through opacity-70 break-words">{d.before}</p>
                                <p className="text-foreground break-words">{d.after}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {canReview && needsReview && (
                        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
                          <button
                            onClick={() => doDecideItem(it, "approved")}
                            className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-base ${
                              it.decision === "approved" ? "bg-success text-white border-success" : "border-border bg-white hover:bg-surface-muted text-foreground"
                            }`}
                          >
                            Duyệt mục này
                          </button>
                          <button
                            onClick={() => doDecideItem(it, "rejected")}
                            className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-base ${
                              it.decision === "rejected" ? "bg-destructive text-white border-destructive" : "border-destructive/30 text-destructive bg-white hover:bg-destructive/5"
                            }`}
                          >
                            Từ chối mục này
                          </button>
                          {it.decision === "rejected" && (
                            <span className="text-[11px] text-muted-foreground">Sẽ giữ bản đã duyệt trước đó</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review note (needs_changes / rejected / approved / revoked) */}
          {req.reviewNote && req.status !== "pending" && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-1.5">
                {req.status === "needs_changes" ? "Admin yêu cầu cập nhật" : req.status === "rejected" ? "Lý do từ chối" : "Ghi chú của Admin"}
              </p>
              <p className={`text-sm rounded-lg border px-3.5 py-3 leading-relaxed ${
                req.status === "rejected" ? "border-destructive/25 bg-destructive/5 text-destructive"
                : req.status === "needs_changes" ? "border-warning/25 bg-warning/5 text-warning"
                : "border-border bg-surface text-muted-foreground"
              }`}>
                {req.reviewNote}
                {req.reviewerName && <span className="block mt-1.5 text-xs opacity-80">— {req.reviewerName}</span>}
              </p>
            </div>
          )}

          {req.status === "revoked" && req.revokeReason && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-1.5">Lý do thu hồi</p>
              <p className="text-sm rounded-lg border border-destructive/25 bg-destructive/5 text-destructive px-3.5 py-3 leading-relaxed">
                {req.revokeReason}
                {req.revokedBy && <span className="block mt-1.5 text-xs opacity-80">— {req.revokedBy}{req.revokedAt ? ` · ${formatDateTime(req.revokedAt)}` : ""}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Right rail — request meta, decision actions, history. Sticky on desktop so
            the actions never require scrolling to find, however long the bundle gets. */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4 space-y-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Người gửi</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User size={13} className="text-muted-foreground" /> {req.requesterName}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Gửi lúc</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Clock size={13} className="text-muted-foreground" /> {relativeTime(req.submittedAt)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Publish to</p>
              <p className="text-sm font-medium text-foreground">{AUDIENCE_LABEL[req.audience]}</p>
            </div>
            {req.updatedAt !== req.submittedAt && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cập nhật</p>
                <p className="text-sm font-medium text-foreground">{relativeTime(req.updatedAt)}</p>
              </div>
            )}
          </div>

          {canReview && (
            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2">
              {rejectedItemCount > 0 && (
                <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5 pb-0.5">
                  {rejectedItemCount} thành phần sẽ giữ bản đã duyệt trước đó khi bạn bấm Duyệt.
                </p>
              )}
              <button
                onClick={() => setDialog("approve")}
                className="w-full h-9 rounded-lg bg-success text-white hover:opacity-90 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <CheckCircle2 size={14} /> Duyệt
              </button>
              <button
                onClick={() => setDialog("changes")}
                className="w-full h-9 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <MessageSquareWarning size={14} /> Yêu cầu cập nhật
              </button>
              <button
                onClick={() => setDialog("reject")}
                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <XCircle size={14} /> Từ chối
              </button>
              {isAgent && (
                <Link
                  to={`/agents/${req.resourceId}?tab=test`}
                  className="w-full h-9 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center justify-center gap-1.5 transition-base !mt-3"
                >
                  <FlaskConical size={14} /> Test
                </Link>
              )}
            </div>
          )}

          {req.status === "needs_changes" && (
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <button
                onClick={doResubmit}
                className="w-full h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center justify-center gap-1.5 transition-base mb-2"
              >
                <RotateCcw size={14} /> Gửi lại yêu cầu (đã cập nhật)
              </button>
              <p className="text-xs text-muted-foreground leading-relaxed">Mô phỏng bước builder chỉnh sửa xong và gửi lại — request quay về hàng chờ duyệt.</p>
            </div>
          )}

          {req.status === "approved" && (
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <button
                onClick={() => setDialog("revoke")}
                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <Undo2 size={14} /> Thu hồi
              </button>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">Gỡ publish ngay lập tức — resource trở về trạng thái như chưa từng được duyệt và cần gửi duyệt lại từ đầu.</p>
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
                : dialog === "revoke" ? `Thu hồi "${req.resourceName}"?`
                : `Yêu cầu cập nhật cho "${req.resourceName}"`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {dialog === "approve" && (
                rejectedItemCount > 0
                  ? `Các thành phần bạn đã đánh dấu "Từ chối mục này" (${rejectedItemCount}) sẽ giữ nguyên bản đã duyệt trước đó. Mọi thành phần còn lại — kể cả chưa quyết định — sẽ được publish theo phạm vi đã chọn.`
                  : "Sau khi duyệt, mục này (và các thành phần mới đi kèm) sẽ được publish theo phạm vi đã chọn."
              )}
              {dialog === "reject" && "Người gửi sẽ nhận được lý do từ chối và cần tạo yêu cầu mới nếu muốn gửi lại."}
              {dialog === "changes" && "Người gửi sẽ thấy góp ý này và có thể chỉnh sửa rồi gửi lại."}
              {dialog === "revoke" && "Resource sẽ ngừng publish ngay lập tức và cần được gửi duyệt lại từ đầu nếu muốn publish lại. Hành động này không thể hoàn tác."}
            </p>
            {dialog !== "approve" && (
              <textarea
                rows={3}
                autoFocus
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={dialog === "reject" ? "Lý do từ chối..." : dialog === "revoke" ? "Lý do thu hồi..." : "Cần cập nhật những gì..."}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none mb-4"
              />
            )}
            {dialog === "approve" && (
              <textarea
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ghi chú (tùy chọn)..."
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none mb-4"
              />
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={closeDialog} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Hủy</button>
              <button
                onClick={dialog === "approve" ? doApprove : dialog === "reject" ? doReject : dialog === "revoke" ? doRevoke : doRequestChanges}
                className={`h-9 px-4 rounded-lg text-sm font-medium transition-base ${
                  dialog === "reject" || dialog === "revoke" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : dialog === "approve" ? "bg-success text-white hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:bg-primary-glow"
                }`}
              >
                {dialog === "approve" ? "Xác nhận duyệt" : dialog === "reject" ? "Xác nhận từ chối" : dialog === "revoke" ? "Xác nhận thu hồi" : "Gửi yêu cầu cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
