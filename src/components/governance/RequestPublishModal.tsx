// Generic "Publish" modal for the four resource types that don't have their own bespoke publish
// flow (Agent already has one — see PublishModal in AgentBuilder.tsx, which now also submits
// through governanceStore instead of publishing instantly). Deliberately lighter than the Agent
// modal (no version bump, no channel picker) — these resources don't have that complexity yet.
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Building2, Globe2, Rocket, Clock } from "lucide-react";
import { governanceStore, type GovAudience, type GovResourceType, AUDIENCE_LABEL } from "./governanceStore";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { toast } from "sonner";

function AudienceOption({ icon: Icon, title, description, selected, onClick }: {
  icon: any; title: string; description: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 text-left rounded-xl border px-4 py-3.5 transition-base ${
        selected ? "border-primary bg-primary-soft/50 ring-1 ring-primary" : "border-border bg-surface hover:border-primary/40 hover:bg-surface-muted"
      }`}
    >
      <span className={`mt-[3px] w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-border"}`}>
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
      </span>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-white text-primary" : "bg-surface-muted text-muted-foreground"}`}>
        <Icon size={16} />
      </span>
      <span className="flex-1 min-w-0 pt-px">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</span>
      </span>
    </button>
  );
}

export default function RequestPublishModal({ resourceType, resourceId, resourceName, onClose, onSubmitted }: {
  resourceType: GovResourceType; resourceId: string; resourceName: string;
  onClose: () => void; onSubmitted?: () => void;
}) {
  const openRequest = governanceStore.getOpenRequestForResource(resourceType, resourceId);
  const [audience, setAudience] = useState<GovAudience>("org");
  const [note, setNote] = useState("");
  const NOTE_MAX = 1000;

  const submit = () => {
    governanceStore.submit({
      resourceType, resourceId, resourceName,
      requesterId: CURRENT_USER.id, requesterName: CURRENT_USER.name,
      audience, note: note.trim(),
    });
    toast.success("Đã gửi yêu cầu duyệt. Admin sẽ xem xét và phản hồi sớm.");
    onSubmitted?.();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl border border-border shadow-lg animate-fade-up flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Publish "{resourceName}"</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Gửi yêu cầu duyệt để chia sẻ rộng hơn trong workspace.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5">
            <X size={15} />
          </button>
        </div>

        {openRequest ? (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="w-11 h-11 rounded-full bg-warning/10 flex items-center justify-center text-warning">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {openRequest.status === "pending" ? "Đang chờ duyệt" : "Cần cập nhật trước khi gửi lại"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {openRequest.status === "pending"
                  ? "Mục này đã có một yêu cầu publish đang chờ Admin xem xét. Vui lòng đợi kết quả trước khi gửi yêu cầu mới."
                  : "Admin đã yêu cầu cập nhật cho lần gửi trước. Vào trang Requests để xem góp ý và gửi lại."}
              </p>
            </div>
            <a href={`/governance/requests/${openRequest.id}`} className="text-sm font-semibold text-primary hover:underline mt-1">
              Xem yêu cầu
            </a>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Publish to</p>
                <div className="space-y-2">
                  <AudienceOption
                    icon={Building2} title={AUDIENCE_LABEL.org}
                    description="Chia sẻ với cả công ty, một phòng ban, hoặc nhân viên được chọn."
                    selected={audience === "org"} onClick={() => setAudience("org")}
                  />
                  <AudienceOption
                    icon={Globe2} title={AUDIENCE_LABEL.community}
                    description="Publish cho toàn bộ người dùng FPT AI Agent, kể cả ngoài công ty."
                    selected={audience === "community"} onClick={() => setAudience("community")}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Ghi chú cho Admin (tùy chọn)</label>
                <div className="relative mt-1.5">
                  <textarea
                    rows={3}
                    maxLength={NOTE_MAX}
                    placeholder="Vì sao mục này nên được publish? Admin sẽ đọc trước khi duyệt."
                    className="w-full px-3 pt-2.5 pb-7 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                  <span className="absolute right-3 bottom-2 text-sm text-muted-foreground pointer-events-none">{note.length}/{NOTE_MAX}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0 border-t border-border">
              <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Hủy</button>
              <button
                className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-2 transition-base"
                onClick={submit}
              >
                <Rocket size={14} /> Gửi yêu cầu duyệt
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
