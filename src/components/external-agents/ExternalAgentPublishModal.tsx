import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronUpIcon, ChevronDownIcon, SparklesIcon, CheckmarkCircle01Icon, Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { CHANNEL_CATALOG, ChannelIcon } from "@/components/configure/channelCatalog";
import { externalAgentStore, type ExternalAgent } from "./externalAgentStore";
import { toast } from "sonner";

type VersionType = "patch" | "minor" | "major";

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

interface ChangeRow { id: string; label: string; kind: "diff" | "count"; marker: "~" | "+" | "-"; before: number; after: number; countLabel?: string; }

/** Deterministic mock "what's changing in this submission" list — same purpose and pattern as
 * the internal Agent's mockPublishChanges (this prototype has no real version-diff data), but
 * built from External Agent fields: Instructions (the description text) gets a line-diff row
 * like the internal Agent's Instructions/Model, Endpoints gets a count row like the internal
 * Agent's Connectors row, and Guardrail only appears when one is actually attached. */
function mockExternalChanges(agent: ExternalAgent): ChangeRow[] {
  const out: ChangeRow[] = [];
  const h = hashString(agent.id);
  const descLines = Math.max(1, agent.description.trim().split(/\n+/).filter(Boolean).length + (h % 6));
  const delta = (h % 9) - 4;
  const before = agent.status === "draft" && agent.version === "v1.0.0" ? 0 : Math.max(0, descLines - delta);
  const after = Math.max(0, descLines);
  out.push({
    id: "instructions", label: "Instructions", kind: "diff",
    marker: before === 0 ? "+" : after === before ? "~" : after > before ? "+" : "-",
    before, after,
  });
  const requiredOk = (agent.lastValidation?.runsAvailable ?? false) && agent.lastHealthCheckOk !== false;
  out.push({
    id: "endpoints", label: "Endpoints", kind: "count", marker: "~", before: 0, after: 0,
    countLabel: `2 endpoint bắt buộc · ${requiredOk ? "Đang hoạt động" : "Cần kiểm tra lại"}`,
  });
  if (agent.guardrail) {
    out.push({ id: "guardrail", label: "Guardrail", kind: "count", marker: "~", before: 0, after: 0, countLabel: "1 guardrail · Đang áp dụng" });
  }
  return out;
}

/** External Agent's equivalent of the internal Agent's "Lưu phiên bản" PublishModal
 * (AgentBuilder.tsx) — same section order, copy and version-bump mechanics, adapted to what
 * this agent actually has (Connection/Endpoints instead of Model/Skills, one flat channel grid
 * instead of the Workspace/Automation split since External Agent has no Trigger/Automation
 * concept). Submitting here still only moves status to "pending_approval" — an FPT admin must
 * Approve before it actually goes live, same gate the Build tab's "Submit for approval" always
 * had; this modal replaces that one click with version choice + release notes + channel picks. */
export default function ExternalAgentPublishModal({ agent, open, onClose, onPublished }: {
  agent: ExternalAgent; open: boolean; onClose: () => void; onPublished: () => void;
}) {
  const BASE = agent.version.replace(/^v/, "").split(".").map(Number);
  const [versionType, setVersionType] = useState<VersionType>("patch");
  const newVersion = (() => {
    const [maj, min, pat] = BASE;
    if (versionType === "major") return [maj + 1, 0, 0];
    if (versionType === "minor") return [maj, min + 1, 0];
    return [maj, min, pat + 1];
  })();
  const versionName = `v${newVersion.join(".")}`;

  const changes = mockExternalChanges(agent);
  const [changesOpen, setChangesOpen] = useState(true);

  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [publishToEnabled, setPublishToEnabled] = useState(() => agent.channels.length > 0);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(agent.channels));
  const toggleChannel = (id: string) => {
    if (!publishToEnabled) return;
    setSelectedChannels(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const draftNoteFromChanges = () => {
    if (changes.length === 0) return;
    setNote(changes.map(c => c.kind === "diff" ? `- ${c.label}: ${c.before} → ${c.after} dòng` : `- ${c.label}: ${c.countLabel}`).join("\n"));
    setNoteTouched(true);
  };

  const NOTE_MAX = 500;
  const noteEmpty = note.trim().length === 0;
  const showNoteError = (noteTouched || attemptedSubmit) && noteEmpty;
  const hasPublishTarget = publishToEnabled && selectedChannels.size > 0;
  const canPublish = !noteEmpty && hasPublishTarget;
  const footerHelper = noteEmpty
    ? "Hãy mô tả ngắn gọn phiên bản này thay đổi gì."
    : !publishToEnabled
      ? "Bật \"Publish tới kênh\" để chọn nơi triển khai"
      : !hasPublishTarget
        ? "Chưa chọn kênh triển khai"
        : null;

  const handlePublishToggle = (checked: boolean) => {
    setPublishToEnabled(checked);
    if (!checked) setSelectedChannels(new Set());
  };

  const doPublish = () => {
    if (!canPublish) {
      setAttemptedSubmit(true);
      if (noteEmpty) {
        noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        noteRef.current?.focus();
      }
      return;
    }
    externalAgentStore.publishVersion(agent.id, { version: versionName, channels: [...selectedChannels], note });
    toast.success(`"${agent.name}" ${versionName} đã được gửi duyệt.`);
    onPublished();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="font-display">Lưu phiên bản</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">Tạo {versionName} — chọn nơi triển khai.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {changes.length > 0 && (
            <div>
              <button type="button" onClick={() => setChangesOpen(o => !o)} className="w-full flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  NỘI DUNG SẼ ĐƯỢC LƯU
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-surface-muted text-muted-foreground">{changes.length}</span>
                </span>
                <HugeiconsIcon icon={changesOpen ? ChevronUpIcon : ChevronDownIcon} size={16} className="text-muted-foreground" />
              </button>
              {changesOpen && (
                <div className="space-y-1.5">
                  {changes.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-surface-muted/60">
                      <span className={`w-4 text-center text-sm font-semibold shrink-0 ${
                        c.marker === "+" ? "text-success" : c.marker === "-" ? "text-destructive" : "text-muted-foreground"
                      }`}>{c.marker}</span>
                      <span className="text-sm font-medium shrink-0">{c.label}</span>
                      {c.kind === "diff" ? (
                        <>
                          <span className="flex-1 text-sm text-muted-foreground text-right">{c.before} → {c.after} dòng</span>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            c.after - c.before > 0 ? "bg-success/10 text-success" : c.after - c.before < 0 ? "bg-destructive/10 text-destructive" : "bg-surface-muted text-muted-foreground"
                          }`}>{c.after - c.before > 0 ? `+${c.after - c.before}` : c.after - c.before}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-sm text-muted-foreground text-right">{c.countLabel}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Loại phiên bản</p>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Phiên bản mới</p>
                <p className="text-xl font-bold tracking-tight text-foreground font-display">
                  v<span className={versionType === "major" ? "text-primary underline underline-offset-4 decoration-2" : ""}>{newVersion[0]}</span>
                  .
                  <span className={versionType === "minor" ? "text-primary underline underline-offset-4 decoration-2" : ""}>{newVersion[1]}</span>
                  .
                  <span className={versionType === "patch" ? "text-primary underline underline-offset-4 decoration-2" : ""}>{newVersion[2]}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              {([
                { key: "patch", label: "Patch" },
                { key: "minor", label: "Minor" },
                { key: "major", label: "Major" },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setVersionType(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-base ${
                    versionType === opt.key
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {versionType === opt.key && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />}
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {versionType === "patch" && "Sửa lỗi nhỏ, vá lỗ hổng, giữ nguyên tính năng cũ."}
              {versionType === "minor" && "Thêm tính năng mới, vẫn tương thích với bản cũ."}
              {versionType === "major" && "Thay đổi lớn, có thể không tương thích với bản cũ."}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Ghi chú phiên bản <span className="text-destructive">*</span></label>
              <button type="button" onClick={draftNoteFromChanges} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <HugeiconsIcon icon={SparklesIcon} size={12} /> Soạn từ thay đổi
              </button>
            </div>
            <textarea
              ref={noteRef}
              rows={3}
              maxLength={NOTE_MAX}
              placeholder="Phiên bản này có gì mới? Người dùng agent sẽ đọc nội dung này."
              className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base resize-none ${
                showNoteError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
              }`}
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={() => setNoteTouched(true)}
            />
            <div className="flex items-center justify-between mt-1">
              {showNoteError ? <span className="text-xs text-destructive">Hãy mô tả ngắn gọn phiên bản này thay đổi gì.</span> : <span />}
              <span className="text-xs text-muted-foreground shrink-0">{note.length}/{NOTE_MAX}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <Switch checked={publishToEnabled} onCheckedChange={handlePublishToggle} className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Publish tới kênh</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Bật để chọn kênh triển khai cho phiên bản này</p>
                </div>
              </div>
              {publishToEnabled && (
                selectedChannels.size > 0
                  ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> Đã chọn {selectedChannels.size} kênh
                    </span>
                  )
                  : <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Chưa chọn kênh triển khai</span>
              )}
            </div>

            <div className={`mt-3.5 grid grid-cols-2 gap-2 transition-base ${!publishToEnabled ? "opacity-50" : ""}`}>
              {CHANNEL_CATALOG.map(ch => {
                const disabled = !publishToEnabled || ch.available === false;
                return (
                  <label key={ch.id} className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 rounded-lg border transition-base ${
                    disabled ? "border-border bg-surface-muted/40 cursor-not-allowed" : "border-border bg-surface hover:bg-surface-muted cursor-pointer"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedChannels.has(ch.id) && !disabled}
                      disabled={disabled}
                      onChange={() => toggleChannel(ch.id)}
                      className="w-4 h-4 rounded accent-primary shrink-0 disabled:cursor-not-allowed"
                    />
                    <span className="w-5 h-5 flex items-center justify-center shrink-0"><ChannelIcon ch={ch} size={16} /></span>
                    <span className={`text-sm font-medium whitespace-nowrap ${disabled ? "text-muted-foreground" : "text-foreground"}`}>{ch.name}</span>
                    {publishToEnabled && ch.available === false && (
                      <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-surface-muted text-muted-foreground shrink-0 whitespace-nowrap ml-auto">Coming soon</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-0 px-6 py-4 border-t border-border shrink-0 sm:justify-between">
          <span className="text-xs text-muted-foreground">{footerHelper}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Huỷ</button>
            <button onClick={doPublish} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-2 transition-base">
              <HugeiconsIcon icon={Rocket01Icon} size={14} /> Publish {versionName}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
