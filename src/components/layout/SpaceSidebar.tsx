import { useState, useSyncExternalStore } from "react";
import { PinIcon, PinOffIcon, MoreHorizontalIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_PINNED_SPACES, getPinnedSpaceIds, subscribePins, togglePinSpace, type Tenant } from "@/lib/spaceStore";
import { AllSpacesDialog, Icon, SpaceAvatar } from "./SpacePicker";
import { spaceKind } from "@/lib/spaceStore";

let pinVersion = 0;
const subscribe = (fn: () => void) => subscribePins(() => { pinVersion++; fn(); });
const usePins = () => { useSyncExternalStore(subscribe, () => pinVersion); return getPinnedSpaceIds(); };

const Label = ({ children }: { children: React.ReactNode }) =>
  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;

function Card({ t, active, pinned, onClick }: { t: Tenant; active?: boolean; pinned?: boolean; onClick: () => void }) {
  return (
    <div className={`group relative flex items-center rounded-lg transition-colors ${active ? "bg-white ring-1 ring-primary/30 shadow-soft" : "hover:bg-surface-muted"}`}>
      <button type="button" onClick={onClick} aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <SpaceAvatar t={t} size="sm" />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13px] ${active ? "font-semibold" : "font-medium"}`}>{t.name}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{spaceKind(t) === "individual" ? "Cá nhân" : "Tổ chức"} · {t.plan}</span>
        </span>
      </button>
      {pinned && (
        <button type="button" onClick={() => togglePinSpace(t.id)} aria-label={`Bỏ ghim ${t.name}`} title="Bỏ ghim"
          className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100">
          <Icon icon={PinOffIcon} size={14} />
        </button>
      )}
    </div>
  );
}

/** Sidebar Spaces: "Đang dùng" + up to 2 "Đã ghim", the rest under "Xem thêm" (popup with pin/unpin). */
export default function SpaceSidebar({ collapsed, tenantId, tenants, onChange }: {
  collapsed: boolean; tenantId: string; tenants: Tenant[]; onChange: (id: string) => void;
}) {
  const pins = usePins();
  const [all, setAll] = useState(false);
  const active = tenants.find(t => t.id === tenantId) ?? tenants[0];
  const pinned = pins.filter(id => id !== active.id).map(id => tenants.find(t => t.id === id)!).filter(Boolean);
  const hidden = tenants.length - 1 - pinned.length;
  const dialog = all && (
    <AllSpacesDialog spaces={tenants} activeId={active.id} onPick={onChange} onClose={() => setAll(false)}
      pinned={pins} onTogglePin={togglePinSpace} maxPinned={MAX_PINNED_SPACES} />
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        {[active, ...pinned].map(t => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <button type="button" onClick={() => onChange(t.id)} aria-label={t.name} aria-current={t.id === active.id ? "true" : undefined}
                className={`rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${t.id === active.id ? "ring-2 ring-primary" : ""}`}>
                <SpaceAvatar t={t} size="sm" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t.name}{t.id === active.id ? " · Đang dùng" : ""}</TooltipContent>
          </Tooltip>
        ))}
        <button type="button" onClick={() => setAll(true)} aria-label="Xem tất cả Space" title="Xem tất cả Space"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted"><Icon icon={MoreHorizontalIcon} /></button>
        {dialog}
      </div>
    );
  }

  return (
    <div>
      <Label>Đang dùng</Label>
      <Card t={active} active onClick={() => undefined} />
      <Label>Đã ghim</Label>
      {pinned.length
        ? <div className="space-y-0.5">{pinned.map(t => <Card key={t.id} t={t} pinned onClick={() => onChange(t.id)} />)}</div>
        : (
          <button type="button" onClick={() => setAll(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed px-2 py-2 text-left text-[11px] text-muted-foreground hover:bg-surface-muted">
            <Icon icon={PinIcon} size={14} /> Ghim tối đa {MAX_PINNED_SPACES} Space để chuyển nhanh
          </button>
        )}
      {hidden > 0 && (
        <button type="button" onClick={() => setAll(true)}
          className="mt-1 flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-surface-muted">
          Xem thêm {hidden} Space <Icon icon={ArrowRight01Icon} size={14} />
        </button>
      )}
      {dialog}
    </div>
  );
}


