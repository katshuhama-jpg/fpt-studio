import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { knowledgeSitemapStore, type KnowledgeSitemap } from "./knowledgeSitemapStore";
import { KnowledgeStatusPill } from "./knowledgeStatus";

function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function ManageSitemapsModal({ open, kbId, onClose }: { open: boolean; kbId: string; onClose: () => void }) {
  const [tick, setTick] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<KnowledgeSitemap | null>(null);
  void tick;
  const refresh = () => setTick(t => t + 1);
  const sitemaps = knowledgeSitemapStore.list(kbId);

  const syncNow = (s: KnowledgeSitemap) => {
    knowledgeSitemapStore.syncNow(s.id);
    refresh();
    toast.success("Đang đồng bộ sitemap.");
    setTimeout(() => { knowledgeSitemapStore.markSynced(s.id); refresh(); }, 1200);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent
          className="sm:max-w-[680px] max-h-[80vh] overflow-y-auto"
          onPointerDownOutside={e => { if ((e.target as HTMLElement)?.closest("[data-sitemap-row-menu]")) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Quản lý sitemap</DialogTitle>
            <DialogDescription>Các sitemap.xml đã đăng ký để tự động phát hiện URL cho kho tri thức này.</DialogDescription>
          </DialogHeader>

          {sitemaps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Chưa có sitemap nào được cấu hình.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="text-left px-3 py-2.5 kb-table-header">Sitemap URL</th>
                    <th className="text-left px-3 py-2.5 kb-table-header">Trạng thái</th>
                    <th className="text-left px-3 py-2.5 kb-table-header">Số URL đã phát hiện</th>
                    <th className="text-left px-3 py-2.5 kb-table-header min-w-[140px]">Đồng bộ lần cuối</th>
                    <th className="px-3 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {sitemaps.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 max-w-[240px]">
                        <span className="font-mono text-xs truncate block" title={s.url}>{s.url}</span>
                      </td>
                      <td className="px-3 py-3"><KnowledgeStatusPill status={s.status} /></td>
                      <td className="px-3 py-3">{s.urlsDiscovered}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.lastSyncAt ? relativeTime(s.lastSyncAt) : "Chưa đồng bộ"}</td>
                      <td className="px-3 py-3 text-right">
                        <SitemapRowMenu onSync={() => syncNow(s)} onDelete={() => setRemoveTarget(s)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={v => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sitemap này?</AlertDialogTitle>
            <AlertDialogDescription>
              Các URL đã nhập từ sitemap này sẽ được giữ nguyên, nhưng hệ thống sẽ ngừng tự động phát hiện URL mới từ sitemap này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) { knowledgeSitemapStore.remove(removeTarget.id); toast.success("Đã xóa sitemap."); }
                setRemoveTarget(null);
                refresh();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const SITEMAP_ROW_MENU_WIDTH = 176; // min-w-44

/** Portaled to document.body with fixed positioning (rather than a plain absolute dropdown) —
 * this menu lives inside the Dialog's own scrollable, bounded content, and a plain absolute
 * child can get clipped or sit under the Dialog's overlay near the edges, swallowing clicks. */
function SitemapRowMenu({ onSync, onDelete }: { onSync: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.min(r.right - SITEMAP_ROW_MENU_WIDTH, window.innerWidth - SITEMAP_ROW_MENU_WIDTH - 8) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label="Thao tác sitemap"
        className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={15} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          data-sitemap-row-menu
          className="fixed z-[9999] min-w-44 rounded-lg border border-border bg-white shadow-elev py-1"
          style={{ top: pos.top, left: pos.left, pointerEvents: "auto" }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button onClick={() => { setOpen(false); onSync(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">Đồng bộ ngay</button>
          <div className="mt-1 pt-1 border-t border-border">
            <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">Xóa</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
