import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronLeft, FlaskConical, ExternalLink, CheckCircle2, XCircle, MessageSquareWarning,
  User, Clock, Layers, RotateCcw,
} from "lucide-react";
import {
  governanceStore, resourcePath, RESOURCE_TYPE_LABEL, AUDIENCE_LABEL,
} from "@/components/governance/governanceStore";
import { ACTION_LABEL } from "@/components/governance/auditLogStore";
import { StatusBadge, ResourceTypeIcon, ChangeStateBadge, relativeTime, formatDateTime } from "@/components/governance/governanceUi";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { toast } from "sonner";

type Dialog = "approve" | "reject" | "changes" | null;

export default function GovernanceRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  void tick;
  const refresh = () => setTick(t => t + 1);
  const req = id ? governanceStore.get(id) : undefined;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");

  if (!req) {
    return (
      <div className="p-8 max-w-[860px] mx-auto text-center">
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

  const canReview = req.status === "pending";
  const isAgent = req.resourceType === "agent";

  return (
    <div className="p-6 md:p-8 max-w-[860px] mx-auto">
      <button onClick={() => navigate("/governance/requests")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-base">
        <ChevronLeft size={15} /> Requests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-1">
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

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 mb-6 p-4 rounded-xl border border-border bg-surface-muted/40">
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cập nhật</p>
          <p className="text-sm font-medium text-foreground">{relativeTime(req.updatedAt)}</p>
        </div>
      </div>

      {req.note && (
        <div className="mb-6">
          <p className="text-sm font-semibold mb-1.5">Ghi chú từ người gửi</p>
          <p className="text-sm text-muted-foreground rounded-lg border border-border bg-surface px-3.5 py-3 leading-relaxed">{req.note}</p>
        </div>
      )}

      {/* Bundled sub-resources — the nested-approval answer */}
      {req.bundledItems.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5"><Layers size={14} className="text-muted-foreground" /> Thành phần đi kèm ({req.bundledItems.length})</p>
          <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
            Agent này tham chiếu các thành phần bên dưới. Duyệt/từ chối áp dụng cho toàn bộ yêu cầu — thành phần đã <span className="font-medium text-foreground">"Đã duyệt trước đó"</span> không cần xem lại, chỉ những thành phần mới/đã sửa mới cần chú ý.
          </p>
          <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {req.bundledItems.map(it => (
              <div key={`${it.type}-${it.resourceId}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  <ResourceTypeIcon type={it.type} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground">{RESOURCE_TYPE_LABEL[it.type]}</p>
                </div>
                <ChangeStateBadge state={it.changeState} />
                <Link to={resourcePath(it.type, it.resourceId)} className="text-muted-foreground hover:text-foreground shrink-0" title="Xem chi tiết">
                  <ExternalLink size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review note (needs_changes / rejected / approved) */}
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

      {/* History timeline */}
      <div className="mb-8">
        <p className="text-sm font-semibold mb-2.5">Lịch sử</p>
        <div className="space-y-3">
          {[...req.history].reverse().map(h => (
            <div key={h.id} className="flex gap-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground">
                  <span className="font-medium">{h.actorName}</span> {ACTION_LABEL[h.action].toLowerCase()}
                  <span className="text-muted-foreground"> · {formatDateTime(h.at)}</span>
                </p>
                {h.note && <p className="text-muted-foreground mt-0.5">{h.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {canReview && (
        <div className="flex items-center gap-2 flex-wrap pb-4 border-t border-border pt-5">
          <button
            onClick={() => setDialog("approve")}
            className="h-9 px-4 rounded-lg bg-success text-white hover:opacity-90 text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <CheckCircle2 size={14} /> Duyệt
          </button>
          <button
            onClick={() => setDialog("changes")}
            className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <MessageSquareWarning size={14} /> Yêu cầu cập nhật
          </button>
          <button
            onClick={() => setDialog("reject")}
            className="h-9 px-4 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <XCircle size={14} /> Từ chối
          </button>
          {isAgent && (
            <Link
              to={`/agents/${req.resourceId}?tab=test`}
              className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base ml-auto"
            >
              <FlaskConical size={14} /> Test
            </Link>
          )}
        </div>
      )}

      {req.status === "needs_changes" && (
        <div className="flex items-center gap-2 pb-4 border-t border-border pt-5">
          <button
            onClick={doResubmit}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <RotateCcw size={14} /> Gửi lại yêu cầu (đã cập nhật)
          </button>
          <p className="text-xs text-muted-foreground">Mô phỏng bước builder chỉnh sửa xong và gửi lại — request quay về hàng chờ duyệt.</p>
        </div>
      )}

      {/* Confirm dialogs */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl border border-border shadow-lg p-6">
            <h3 className="font-display text-lg font-semibold mb-1">
              {dialog === "approve" ? `Duyệt "${req.resourceName}"?` : dialog === "reject" ? `Từ chối "${req.resourceName}"?` : `Yêu cầu cập nhật cho "${req.resourceName}"`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {dialog === "approve" && "Sau khi duyệt, mục này (và các thành phần mới đi kèm) sẽ được publish theo phạm vi đã chọn."}
              {dialog === "reject" && "Người gửi sẽ nhận được lý do từ chối và cần tạo yêu cầu mới nếu muốn gửi lại."}
              {dialog === "changes" && "Người gửi sẽ thấy góp ý này và có thể chỉnh sửa rồi gửi lại."}
            </p>
            {dialog !== "approve" && (
              <textarea
                rows={3}
                autoFocus
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={dialog === "reject" ? "Lý do từ chối..." : "Cần cập nhật những gì..."}
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
                onClick={dialog === "approve" ? doApprove : dialog === "reject" ? doReject : doRequestChanges}
                className={`h-9 px-4 rounded-lg text-sm font-medium transition-base ${
                  dialog === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : dialog === "approve" ? "bg-success text-white hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:bg-primary-glow"
                }`}
              >
                {dialog === "approve" ? "Xác nhận duyệt" : dialog === "reject" ? "Xác nhận từ chối" : "Gửi yêu cầu cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
