import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Tick02Icon, UserIcon, Building03Icon, PinIcon, PinOffIcon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { spaceKind, type SpaceKind, type Tenant } from "@/lib/spaceStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
export const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

export const KIND_META: Record<SpaceKind, { label: string; icon: IconData; desc: string }> = {
  individual: { label: "Individual space", icon: UserIcon, desc: "Không gian riêng để tự dựng và thử Nhân sự số. Bạn tự quản lý gói và hạn mức." },
  organization: { label: "Organization space", icon: Building03Icon, desc: "Làm việc cùng đồng nghiệp, chia sẻ Nhân sự số và quản lý tập trung theo tổ chức." },
};

export function SpaceAvatar({ t, size = "md" }: { t: Tenant; size?: "sm" | "md" }) {
  const individual = spaceKind(t) === "individual";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg font-semibold ${size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"} ${individual ? "bg-muted text-foreground" : "bg-primary/10 text-primary"}`}>
      {t.initial}
    </span>
  );
}

/** One selectable Space row (sidebar menu, "Xem thêm" dialog, first sign-in picker). */
export function SpaceRow({ t, active, onClick, compact }: { t: Tenant; active: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${compact ? "px-2 py-1.5" : "px-3 py-2.5"} ${active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted"}`}>
      <SpaceAvatar t={t} size={compact ? "sm" : "md"} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${compact ? "text-xs" : "text-sm"}`}>{t.name}</span>
        <span className={`block truncate text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>{KIND_META[spaceKind(t)].label} · Gói {t.plan}</span>
      </span>
      {active && <Icon icon={Tick02Icon} size={compact ? 14 : 16} className="shrink-0 text-primary" />}
    </button>
  );
}

/** "Xem thêm" — every Space you belong to, grouped Individual / Organization, with search. */
export function AllSpacesDialog({ spaces, activeId, onPick, onClose, pinned, onTogglePin, maxPinned = 2 }: {
  spaces: Tenant[]; activeId: string; onPick: (id: string) => void; onClose: () => void;
  pinned?: string[]; onTogglePin?: (id: string) => void; maxPinned?: number;
}) {
  const [q, setQ] = useState("");
  const shown = spaces.filter(t => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tất cả Space</DialogTitle>
          <DialogDescription>{spaces.length} Space bạn đang tham gia. Chọn Space để chuyển sang{onTogglePin ? `, ghim tối đa ${maxPinned} Space để hiện ngay trên sidebar` : ""}.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Icon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm Space" aria-label="Tìm Space" className="pl-8" />
        </div>
        <div className="max-h-[52vh] space-y-4 overflow-y-auto">
          {(["individual", "organization"] as SpaceKind[]).map(kind => {
            const list = shown.filter(t => spaceKind(t) === kind);
            if (!list.length) return null;
            return (
              <section key={kind}>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon icon={KIND_META[kind].icon} size={14} />{KIND_META[kind].label}</h3>
                <div className="space-y-1">{list.map(t => {
                  const isPinned = !!pinned?.includes(t.id);
                  const full = !isPinned && (pinned?.length ?? 0) >= maxPinned;
                  return (
                    <div key={t.id} className="flex items-center gap-1">
                      <div className="min-w-0 flex-1"><SpaceRow t={t} active={t.id === activeId} onClick={() => { onPick(t.id); onClose(); }} /></div>
                      {onTogglePin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={full ? 0 : -1}>
                              <button type="button" disabled={full} onClick={() => onTogglePin(t.id)} aria-pressed={isPinned}
                                aria-label={isPinned ? `Bỏ ghim ${t.name}` : `Ghim ${t.name}`}
                                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${isPinned ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                                <Icon icon={isPinned ? PinOffIcon : PinIcon} />
                              </button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{isPinned ? "Bỏ ghim" : full ? `Chỉ ghim tối đa ${maxPinned} Space. Bỏ ghim một Space trước.` : "Ghim lên sidebar"}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}</div>
              </section>
            );
          })}
          {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy Space nào khớp "{q.trim()}".</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
