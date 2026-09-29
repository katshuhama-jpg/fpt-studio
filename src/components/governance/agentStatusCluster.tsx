// Agent top-bar status. Two different facts, shown as two different kinds of chip side by side:
// the Agent's own state (quiet badge: "● Live v1.1.0" or "● Bản nháp") and, if there is one, the
// state of its latest publish REQUEST (outlined chip with icon: "Yêu cầu v1.2.0 · Chờ duyệt ⌄").
// They used to share one segmented pill, which read as one sentence ("Nháp · Bị từ chối" looked
// like "the draft is rejected"). Labels stay short; details (scope, channels, who/when, reason)
// live in each chip's popover. Colour is never the only cue: every chip has text + aria-label.
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, User, Users, Radio, Undo2, ExternalLink, Pencil, History, Send, CheckCircle2, Circle, XCircle, Zap, Globe, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { governanceStore, channelLabel, workspaceTargetsOf, type GovRequest } from "./governanceStore";
import { formatDateTime } from "./governanceUi";
import type { AgentPublishState } from "../configure/agentPublishStore";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";

type Tone = "live" | "pending" | "rejected" | "draft" | "automation";
const TONE: Record<Tone, { dot: string; text: string; hover: string; soft: string; border: string }> = {
  live: { dot: "bg-success", text: "text-success", hover: "hover:bg-success/5", soft: "bg-success/10 hover:bg-success/15", border: "border-success/30" },
  pending: { dot: "bg-warning", text: "text-warning", hover: "hover:bg-warning/5", soft: "bg-warning/10 hover:bg-warning/15", border: "border-warning/40" },
  rejected: { dot: "bg-destructive", text: "text-destructive", hover: "hover:bg-destructive/5", soft: "bg-destructive/10 hover:bg-destructive/15", border: "border-destructive/35" },
  draft: { dot: "bg-muted-foreground", text: "text-muted-foreground", hover: "hover:bg-surface-muted", soft: "bg-surface-muted hover:bg-muted", border: "border-border" },
  automation: { dot: "bg-indigo-500", text: "text-indigo-700", hover: "hover:bg-indigo-50", soft: "bg-indigo-50 hover:bg-indigo-100", border: "border-indigo-200" },
};

/** Two visually different kinds of chip, because they answer two different questions:
 *  - "state"   — what the Agent IS right now (Live vY / Nháp). Quiet, soft-filled badge.
 *  - "request" — what's happening to a publish REQUEST (Chờ duyệt / Bị từ chối). A pill too (so
 *    it never looks like the rectangular action buttons next to it), but with a tinted border, an
 *    icon and the word "Yêu cầu", so it reads as "a request about a version",
 *    never as a second status of the Agent itself (e.g. "Nháp · Bị từ chối" must not read as
 *    "the draft is rejected"). They sit side by side with a gap, not inside one container. */
function Segment({ tone, label, version, aria, variant = "state", icon, children }: {
  tone: Tone; label: string; version?: string; aria: string; variant?: "state" | "request"; icon?: ReactNode; children: ReactNode;
}) {
  const t = TONE[tone];
  const base = "h-8 flex items-center gap-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shrink-0";
  const cls = variant === "state"
    ? `${base} px-3 rounded-full ${t.soft}`
    : `${base} px-3 rounded-full border ${t.border} ${t.soft}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={aria} className={cls}>
          {variant === "state"
            ? <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} aria-hidden />
            : <span className={t.text} aria-hidden>{icon}</span>}
          {variant === "request" && <span className="text-muted-foreground">Yêu cầu</span>}
          {variant === "request" && version && <span className="font-mono text-[11px] text-foreground">{version}</span>}
          {variant === "request" && <span className="text-muted-foreground" aria-hidden>·</span>}
          <span className={t.text}>{label}</span>
          {variant === "state" && version && <span className="font-mono text-[11px] text-foreground/70">{version}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] p-0 overflow-hidden rounded-xl shadow-lg">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function Header({ icon, iconBox, title, sub }: { icon: ReactNode; iconBox: string; title: ReactNode; sub: ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-3 flex items-start gap-3">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBox}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[18px_88px_1fr] items-start gap-x-2 py-1.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <dt className="text-xs text-muted-foreground mt-px">{label}</dt>
      <dd className="text-xs text-foreground leading-relaxed min-w-0">{children}</dd>
    </div>
  );
}

function ChannelChips({ ids }: { ids: string[] }) {
  if (ids.length === 0) return <span className="text-muted-foreground">Không có</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map(id => <span key={id} className="px-1.5 py-0.5 rounded-md bg-surface-muted border border-border text-[11px]">{channelLabel(id)}</span>)}
    </span>
  );
}

/** Mini progress for a request under review: Đã gửi → Admin duyệt → Live. */
function ReviewSteps() {
  const steps = [
    { label: "Đã gửi", state: "done" as const },
    { label: "Admin duyệt", state: "current" as const },
    { label: "Live", state: "todo" as const },
  ];
  return (
    <ol className="mx-4 mb-3 flex items-center gap-1.5" aria-label="Tiến trình duyệt">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1.5 flex-1 last:flex-none">
          <span className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${s.state === "current" ? "text-warning" : s.state === "done" ? "text-success" : "text-muted-foreground"}`}>
            {s.state === "done" ? <CheckCircle2 size={13} /> : s.state === "current" ? <Clock size={13} /> : <Circle size={13} />}
            {s.label}
          </span>
          {i < steps.length - 1 && <span className={`h-px flex-1 ${s.state === "done" ? "bg-success/40" : "bg-border"}`} aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function scopeText(req: GovRequest): string {
  const t = workspaceTargetsOf(req);
  return t.map(x => x.name).join(", ") || req.scopeSummary || "—";
}

export function AgentStatusCluster({ publishState, isAutomation, pending, rejected, rejectBannerVisible, onChanged, onOpenVersions, onPublish, onShowRejectBanner }: {
  rejectBannerVisible?: boolean;
  publishState: AgentPublishState;
  isAutomation: boolean;
  pending?: GovRequest;
  rejected?: GovRequest;
  onChanged: () => void;
  onOpenVersions: () => void;
  onPublish: () => void;
  onShowRejectBanner: () => void;
}) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const published = publishState.placement !== null;
  const isRequester = pending?.requesterId === CURRENT_USER.id;

  const withdraw = () => {
    if (!pending) return;
    governanceStore.withdraw(pending.id, CURRENT_USER.id, CURRENT_USER.name, "Người gửi đã rút yêu cầu.");
    toast.success(`Đã rút yêu cầu ${pending.version ?? ""}. Agent giữ nguyên trạng thái trước khi gửi.`);
    setConfirmWithdraw(false);
    onChanged();
  };

  return (
    <>
      <div className="flex items-center gap-2 shrink-0" role="group" aria-label="Trạng thái phiên bản">
        {/* 1 — what users are on right now */}
        {published ? (
          <Segment
            tone={isAutomation ? "automation" : "live"}
            label={isAutomation ? "Automation" : "Live"}
            version={publishState.version}
            aria={`Đang live ${publishState.version}. Bấm để xem chi tiết.`}
          >
            <Header
              icon={isAutomation ? <Zap size={17} /> : <Radio size={17} />}
              iconBox={isAutomation ? "bg-indigo-50 text-indigo-600" : "bg-success/10 text-success"}
              title={<>Người dùng đang dùng <span className="font-mono">{publishState.version}</span></>}
              sub="Bản này tiếp tục phục vụ cho tới khi một bản mới được duyệt hoặc bạn khôi phục bản khác."
            />
            <dl className="px-4 pb-3 border-t border-border pt-2">
              <Row icon={<Users size={13} />} label="Workspace">{publishState.scopeSummary ?? "Chỉ mình tôi"}</Row>
              <Row icon={<Globe size={13} />} label="Kênh ngoài"><ChannelChips ids={publishState.channels} /></Row>
            </dl>
            <div className="px-4 py-3 border-t border-border bg-surface-muted/40 flex justify-end">
              <button onClick={onOpenVersions} className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-surface-muted text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                <History size={13} /> Xem tất cả phiên bản
              </button>
            </div>
          </Segment>
        ) : (
          <Segment tone="draft" label="Bản nháp" aria="Chưa publish. Bấm để xem chi tiết.">
            <Header
              icon={<Pencil size={16} />}
              iconBox="bg-surface-muted text-muted-foreground"
              title="Agent chưa publish"
              sub="Chưa ai dùng được Agent này. Publish để chia sẻ — phạm vi rộng sẽ cần Org/Unit Admin duyệt."
            />
            <div className="px-4 py-3 border-t border-border bg-surface-muted/40 flex justify-end">
              <button onClick={onPublish} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                <Send size={13} /> Publish
              </button>
            </div>
          </Segment>
        )}

        {/* 2 — what's next */}
        {pending && (
          <Segment variant="request" icon={<Clock size={14} />} tone="pending" label="Chờ duyệt" version={pending.version} aria={`Yêu cầu ${pending.version} đang chờ duyệt. Bấm để xem chi tiết.`}>
            <Header
              icon={<Clock size={17} />}
              iconBox="bg-warning/10 text-warning"
              title={<>Yêu cầu <span className="font-mono">{pending.version}</span> đang chờ duyệt</>}
              sub={published
                ? <>Người dùng vẫn dùng <span className="font-mono text-foreground">{publishState.version}</span> cho tới khi bản này được duyệt.</>
                : "Agent sẽ tới người dùng khi Org/Unit Admin duyệt."}
            />
            <ReviewSteps />
            <dl className="px-4 pb-3 border-t border-border pt-2">
              <Row icon={<Clock size={13} />} label="Gửi lúc"><span className="tabular-nums">{formatDateTime(pending.submittedAt)}</span></Row>
              <Row icon={<User size={13} />} label="Người gửi">{pending.requesterName}</Row>
              <Row icon={<Users size={13} />} label="Workspace">{scopeText(pending)}</Row>
              <Row icon={<Globe size={13} />} label="Kênh ngoài"><ChannelChips ids={pending.channels ?? []} /></Row>
            </dl>
            <div className="px-4 py-3 border-t border-border bg-surface-muted/40 flex items-center justify-between gap-2">
              <Link
                to={`/governance/requests/${pending.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-surface-muted text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                Xem chi tiết <ExternalLink size={12} />
              </Link>
              {isRequester && (
                <button
                  type="button"
                  onClick={() => setConfirmWithdraw(true)}
                  className="h-8 px-3 rounded-lg text-destructive hover:bg-destructive/5 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Undo2 size={13} /> Rút yêu cầu
                </button>
              )}
            </div>
          </Segment>
        )}
        {!pending && rejected && (
          <Segment variant="request" icon={<XCircle size={14} />} tone="rejected" label="Bị từ chối" version={rejected.version} aria={`Yêu cầu ${rejected.version} bị từ chối. Bấm để xem lý do.`}>
            <Header
              icon={<XCircle size={17} />}
              iconBox="bg-destructive/10 text-destructive"
              title={<>Yêu cầu <span className="font-mono">{rejected.version}</span> bị từ chối</>}
              sub={<>{rejected.reviewerName ?? "Admin"} · {formatDateTime(rejected.updatedAt)}</>}
            />
            {rejected.reviewNote && (
              <p className="mx-4 mb-3 text-xs leading-relaxed rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">“{rejected.reviewNote}”</p>
            )}
            <div className="px-4 py-3 border-t border-border bg-surface-muted/40 flex items-center justify-between gap-2">
              {rejectBannerVisible ? <span /> : (
                <button onClick={onShowRejectBanner} className="h-8 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-surface-muted cursor-pointer transition-colors">Hiện lại banner</button>
              )}
              <button onClick={onPublish} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                <Pencil size={13} /> Sửa &amp; gửi lại
              </button>
            </div>
          </Segment>
        )}
      </div>

      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rút yêu cầu {pending?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              Admin sẽ không còn thấy yêu cầu này để duyệt. Agent giữ nguyên trạng thái hiện tại — bạn có thể gửi lại bất cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ yêu cầu</AlertDialogCancel>
            <AlertDialogAction onClick={withdraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Rút yêu cầu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
