import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Search, Loader2, Check, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ChipsInput, { type Chip } from "./ChipsInput";
import AdvancedConfigSection, { defaultAdvancedConfig, type AdvancedConfig } from "./AdvancedConfigSection";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeStore } from "./knowledgeStore";

type ModalTab = "specified" | "children" | "sitemap";

function isValidUrl(v: string): boolean {
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

function isDuplicateUrl(scope: { kbId?: string; agentId?: string }, value: string): boolean {
  if (scope.agentId) {
    const n = value.trim().toLowerCase();
    return knowledgeStore.list(scope.agentId).some(i => i.kind === "url" && i.name.trim().toLowerCase() === n);
  }
  return knowledgeUrlStore.isDuplicate(scope.kbId!, value);
}

function validateUrlChip(scope: { kbId?: string; agentId?: string }, value: string, existing: string[]): string | undefined {
  if (!isValidUrl(value)) return "Đường dẫn chưa đúng định dạng.";
  if (existing.includes(value)) return "URL này đã có trong danh sách.";
  if (isDuplicateUrl(scope, value)) return "URL này đã có trong kho tri thức.";
  return undefined;
}

/** Pass either kbId (Console Website tab, S9/S10) or agentId (Agent Knowledge "Website" tile,
 * S14) — never both. Agent-scoped URLs skip folders, which don't apply to per-Agent knowledge. */
interface Discovered { url: string; title: string; depth: number; selected: boolean }

const DISCOVER_SEGMENTS = ["products", "blog", "about", "support", "pricing"];
function makeDiscovered(base: string, i: number, maxDepth: number): Discovered {
  const seg = DISCOVER_SEGMENTS[i % DISCOVER_SEGMENTS.length];
  const depth = 1 + (i % Math.max(1, maxDepth));
  return { url: `${base}/${seg}/muc-${i + 1}`, title: `Trang nội dung ${i + 1}`, depth, selected: true };
}

/** First path segment of a discovered URL, used to group step-2 results — e.g. "/products". */
function groupKeyOf(url: string): string {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg ? `/${seg}` : "/";
  } catch {
    return "/";
  }
}

const GROUP_AUTO_EXPAND_LIMIT = 50;

export default function AddUrlModal({ open, kbId, agentId, defaultFolderId, onClose }: { open: boolean; kbId?: string; agentId?: string; defaultFolderId?: string; onClose: () => void }) {
  const folders = agentId ? [] : knowledgeUrlStore.listFolders(kbId!);
  const initialFolder = defaultFolderId ?? "";
  const [tab, setTab] = useState<ModalTab>("specified");
  const [pendingTab, setPendingTab] = useState<ModalTab | null>(null);

  // Tab 1 — specified URLs
  const [urlChips, setUrlChips] = useState<Chip[]>([]);
  const [folder1, setFolder1] = useState(initialFolder);
  const [advanced1, setAdvanced1] = useState<AdvancedConfig>(defaultAdvancedConfig());

  // Tab 2 — crawl children
  const [step, setStep] = useState<1 | 2>(1);
  const [rootUrl, setRootUrl] = useState("");
  const [rootUrlError, setRootUrlError] = useState<string | null>(null);
  const [folder2, setFolder2] = useState(initialFolder);
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxPages, setMaxPages] = useState("");
  const [minContentLength, setMinContentLength] = useState("");
  const [includePaths2, setIncludePaths2] = useState<Chip[]>([]);
  const [excludePaths2, setExcludePaths2] = useState<Chip[]>([]);
  const [advanced2, setAdvanced2] = useState<AdvancedConfig>(defaultAdvancedConfig());
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<Discovered[]>([]);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const discoverTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Tab 3 — sitemap
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapTouched, setSitemapTouched] = useState(false);
  const [folder3, setFolder3] = useState(initialFolder);
  const [includePaths3, setIncludePaths3] = useState<Chip[]>([]);
  const [excludePaths3, setExcludePaths3] = useState<Chip[]>([]);
  const [advanced3, setAdvanced3] = useState<AdvancedConfig>(defaultAdvancedConfig());

  useEffect(() => () => { if (discoverTimer.current) clearInterval(discoverTimer.current); }, []);

  const resetAll = () => {
    setTab("specified"); setUrlChips([]); setFolder1(initialFolder);
    setStep(1); setRootUrl(""); setRootUrlError(null); setDiscovered([]); setDiscovering(false); setDiscoveredCount(0);
    setCollapsedGroups(new Set());
    setSitemapUrl(""); setSitemapTouched(false);
  };

  const isTabDirty = (t: ModalTab) => {
    if (t === "specified") return urlChips.length > 0;
    if (t === "children") return rootUrl.trim().length > 0 || step === 2;
    return sitemapUrl.trim().length > 0;
  };

  const requestTabChange = (next: ModalTab) => {
    if (next === tab) return;
    if (isTabDirty(tab)) { setPendingTab(next); return; }
    setTab(next);
  };
  const confirmTabChange = () => {
    if (!pendingTab) return;
    if (tab === "specified") { setUrlChips([]); setFolder1(""); }
    if (tab === "children") { setStep(1); setRootUrl(""); setDiscovered([]); setDiscovering(false); }
    if (tab === "sitemap") { setSitemapUrl(""); setSitemapTouched(false); }
    setTab(pendingTab);
    setPendingTab(null);
  };

  const validCount = urlChips.filter(c => !c.error).length;
  const invalidCount = urlChips.length - validCount;

  const addUrl = (url: string, folderId: string | null) => {
    if (agentId) knowledgeStore.add(agentId, { name: url, kind: "url", description: "" });
    else knowledgeUrlStore.addUrl(kbId!, { url, source: "specified", folderId });
  };

  const submitSpecified = () => {
    if (urlChips.length === 0 || invalidCount > 0) return;
    for (const c of urlChips) addUrl(c.value, folder1 || null);
    toast.success(`Đã thêm ${urlChips.length} URL. Đang xử lý.`);
    resetAll();
    onClose();
  };

  const startDiscovery = () => {
    if (!isValidUrl(rootUrl.trim())) { setRootUrlError("Đường dẫn chưa đúng định dạng."); return; }
    setRootUrlError(null);
    setStep(2);
    setDiscovering(true);
    setDiscovered([]);
    setDiscoveredCount(0);
    let count = 0;
    const total = maxPages ? Math.min(Number(maxPages), 14) : 10 + maxDepth;
    discoverTimer.current = setInterval(() => {
      count++;
      setDiscoveredCount(count);
      if (count >= total) {
        if (discoverTimer.current) clearInterval(discoverTimer.current);
        const base = rootUrl.trim().replace(/\/$/, "");
        const items: Discovered[] = Array.from({ length: total }, (_, i) => makeDiscovered(base, i, maxDepth));
        setDiscovered(items);
        setDiscovering(false);
        setCollapsedGroups(items.length > GROUP_AUTO_EXPAND_LIMIT ? new Set(items.map(d => groupKeyOf(d.url))) : new Set());
      }
    }, 180);
  };
  const stopDiscovery = () => {
    if (discoverTimer.current) clearInterval(discoverTimer.current);
    setDiscovering(false);
    const base = rootUrl.trim().replace(/\/$/, "");
    const items = Array.from({ length: discoveredCount }, (_, i) => makeDiscovered(base, i, maxDepth));
    setDiscovered(items);
    setCollapsedGroups(items.length > GROUP_AUTO_EXPAND_LIMIT ? new Set(items.map(d => groupKeyOf(d.url))) : new Set());
  };

  const q = discoverQuery.trim().toLowerCase();
  const matchesQuery = (d: Discovered) => !q || d.url.toLowerCase().includes(q) || d.title.toLowerCase().includes(q);
  const selectedCount = discovered.filter(d => d.selected).length;
  const allSelected = discovered.length > 0 && selectedCount === discovered.length;

  const discoveredGroups = useMemo(() => {
    const m = new Map<string, Discovered[]>();
    for (const d of discovered) {
      const k = groupKeyOf(d.url);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    return [...m.entries()];
  }, [discovered]);

  const toggleGroupCollapsed = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const toggleGroupSelection = (key: string, checked: boolean) => {
    setDiscovered(prev => prev.map(d => groupKeyOf(d.url) === key ? { ...d, selected: checked } : d));
  };

  const submitChildren = () => {
    const chosen = discovered.filter(d => d.selected);
    if (chosen.length === 0) return;
    for (const d of chosen) addUrl(d.url, folder2 || null);
    toast.success(`Đã thêm ${chosen.length} URL. Đang xử lý.`);
    resetAll();
    onClose();
  };

  const sitemapValid = sitemapUrl.trim().toLowerCase().startsWith("https://") && sitemapUrl.trim().toLowerCase().endsWith(".xml");
  const sitemapError = sitemapTouched && sitemapUrl.trim().length > 0 && !sitemapValid ? "Đường dẫn sitemap cần có đuôi .xml." : null;

  const submitSitemap = () => {
    setSitemapTouched(true);
    if (!sitemapValid) return;
    const n = 8 + Math.floor(Math.random() * 10);
    for (let i = 0; i < n; i++) {
      addUrl(`${sitemapUrl.replace(/\/sitemap\.xml$/i, "")}/trang-${i + 1}`, folder3 || null);
    }
    toast.success(`Đã thêm ${n} URL từ sitemap. Đang xử lý.`);
    resetAll();
    onClose();
  };

  const TABS: { id: ModalTab; label: string }[] = [
    { id: "specified", label: "Chỉ crawl URL đã chỉ định" },
    { id: "children", label: "Crawl các trang con" },
    { id: "sitemap", label: "Crawl URL theo sitemap" },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) { resetAll(); onClose(); } }}>
        <DialogContent className="sm:max-w-[640px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm URL mới</DialogTitle>
            <DialogDescription>Chọn cách thu thập nội dung website vào kho tri thức.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1 border-b border-border -mx-6 px-6 mb-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => requestTabChange(t.id)}
                className={`px-3 h-9 text-sm font-medium border-b-2 transition-base whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "specified" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Danh sách URL <span className="text-destructive">*</span></label>
                <ChipsInput chips={urlChips} onChange={setUrlChips} placeholder="https://..." validate={(v, existing) => validateUrlChip({ kbId, agentId }, v, existing)} />
                <p className="text-xs text-muted-foreground mt-1">Nhập URL rồi nhấn Enter. Có thể dán nhiều URL cùng lúc.</p>
                {urlChips.length > 0 && (
                  <>
                    <p className="text-xs mt-1"><span className="text-success font-medium">{validCount} URL hợp lệ</span> · <span className={invalidCount > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>{invalidCount} URL cần sửa</span></p>
                    {invalidCount > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {urlChips.filter(c => c.error).map((c, i) => (
                          <p key={i} className="text-xs text-destructive leading-relaxed">{c.value} — {c.error}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Thư mục</label>
                <select value={folder1} onChange={e => setFolder1(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base">
                  <option value="">Danh sách URL chung</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <AdvancedConfigSection value={advanced1} onChange={setAdvanced1} />
            </div>
          )}

          {tab === "children" && (
            <div className="flex items-center gap-2 py-2">
              <button
                type="button"
                onClick={step === 2 ? () => setStep(1) : undefined}
                disabled={step !== 2}
                className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? "text-success hover:underline cursor-pointer" : "text-primary cursor-default"}`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${step === 2 ? "bg-success text-white" : "bg-primary text-primary-foreground"}`}>
                  {step === 2 ? <Check size={10} /> : "1"}
                </span>
                Cấu hình
              </button>
              <div className="flex-1 h-px bg-border" />
              <span className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${step === 2 ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"}`}>2</span>
                Chọn URL
              </span>
            </div>
          )}

          {tab === "children" && step === 1 && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">URL gốc <span className="text-destructive">*</span></label>
                <input
                  value={rootUrl}
                  onChange={e => setRootUrl(e.target.value)}
                  onBlur={() => setRootUrlError(rootUrl.trim() && !isValidUrl(rootUrl.trim()) ? "Đường dẫn chưa đúng định dạng." : null)}
                  placeholder="https://example.com"
                  className={`w-full h-9 px-2.5 rounded-lg border bg-white text-sm font-mono outline-none focus:ring-2 transition-base ${rootUrlError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
                />
                {rootUrlError && <p className="text-xs text-destructive mt-1">{rootUrlError}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Thư mục</label>
                <select value={folder2} onChange={e => setFolder2(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base">
                  <option value="">Danh sách URL chung</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tùy chỉnh nội dung thu thập</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <NumericField label="Độ sâu tối đa *" tooltip="Số cấp trang con sẽ đi vào. Ví dụ mức 2 sẽ lấy trang gốc và các trang liên kết từ nó." value={maxDepth} onChange={setMaxDepth} min={1} max={10} />
                  <NumericFieldOptional label="Số trang tối đa" placeholder="Không giới hạn" tooltip="Giới hạn tổng số trang thu thập." value={maxPages} onChange={setMaxPages} min={1} max={1000} />
                  <NumericFieldOptional label="Độ dài nội dung tối thiểu" placeholder="Ví dụ: 200" tooltip="Bỏ qua các trang quá ngắn như menu, trang lỗi hoặc thông báo." value={minContentLength} onChange={setMinContentLength} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabelWithTip label="Bao gồm đường dẫn" tooltip={'Chỉ thu thập các URL khớp mẫu này. Ví dụ "/blog/*" chỉ lấy các trang trong /blog.'} />
                  <ChipsInput chips={includePaths2} onChange={setIncludePaths2} placeholder="/blog/*" />
                </div>
                <div>
                  <FieldLabelWithTip label="Loại trừ đường dẫn" tooltip={'Bỏ qua các URL khớp mẫu này. Ví dụ "/blog/*" sẽ không lấy các trang trong /blog.'} />
                  <ChipsInput chips={excludePaths2} onChange={setExcludePaths2} placeholder="/blog/*" />
                </div>
              </div>
              <AdvancedConfigSection value={advanced2} onChange={setAdvanced2} />
            </div>
          )}

          {tab === "children" && step === 2 && (
            <div className="space-y-3 py-2">
              {discovering ? (
                <div className="rounded-xl border border-border p-6 text-center space-y-3">
                  <Loader2 size={20} className="mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Đang tìm trang con... đã tìm thấy {discoveredCount} URL</p>
                  <button onClick={stopDiscovery} className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base">Dừng lấy dữ liệu</button>
                </div>
              ) : discovered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Không tìm thấy trang con nào từ URL này. Thử tăng độ sâu tối đa hoặc kiểm tra lại đường dẫn.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={discoverQuery} onChange={e => setDiscoverQuery(e.target.value)} placeholder="Tìm trong kết quả..." className="h-9 w-full pl-8 pr-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <input type="checkbox" checked={allSelected} onChange={e => setDiscovered(prev => prev.map(d => ({ ...d, selected: e.target.checked })))} className="w-4 h-4 accent-primary" />
                    Chọn tất cả ({discovered.length})
                  </label>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {discoveredGroups.map(([key, items]) => {
                      const groupMatches = items.filter(matchesQuery);
                      if (q && groupMatches.length === 0) return null;
                      const forceOpen = q.length > 0 && groupMatches.length > 0;
                      const isCollapsed = collapsedGroups.has(key) && !forceOpen;
                      const selectedInGroup = items.filter(d => d.selected).length;
                      const allInGroupSelected = items.length > 0 && selectedInGroup === items.length;
                      const rowsToShow = q ? groupMatches : items;
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted/60">
                            <button type="button" onClick={() => toggleGroupCollapsed(key)} aria-label={isCollapsed ? "Mở rộng nhóm" : "Thu gọn nhóm"} className="text-muted-foreground hover:text-foreground transition-base shrink-0">
                              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <input
                              type="checkbox"
                              checked={allInGroupSelected}
                              ref={el => { if (el) el.indeterminate = selectedInGroup > 0 && !allInGroupSelected; }}
                              onChange={e => toggleGroupSelection(key, e.target.checked)}
                              className="w-4 h-4 accent-primary shrink-0"
                            />
                            <button type="button" onClick={() => toggleGroupCollapsed(key)} className="flex-1 text-left text-xs font-semibold truncate">
                              {key} ({items.length})
                            </button>
                          </div>
                          {!isCollapsed && rowsToShow.map(d => (
                            <label key={d.url} className="flex items-center gap-2.5 pl-9 pr-3 py-2 cursor-pointer hover:bg-surface-muted/50 transition-base">
                              <input
                                type="checkbox" checked={d.selected}
                                onChange={() => setDiscovered(prev => prev.map(x => x.url === d.url ? { ...x, selected: !x.selected } : x))}
                                className="w-4 h-4 accent-primary shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-sm truncate">{d.title}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate">{d.url}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "sitemap" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sitemap <span className="text-destructive">*</span></label>
                <input
                  value={sitemapUrl}
                  onChange={e => setSitemapUrl(e.target.value)}
                  onBlur={() => setSitemapTouched(true)}
                  placeholder="https://example.com/sitemap.xml"
                  className={`w-full h-9 px-2.5 rounded-lg border bg-white text-sm font-mono outline-none focus:ring-2 transition-base ${sitemapError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
                />
                {sitemapError && <p className="text-xs text-destructive mt-1">{sitemapError}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Thư mục</label>
                <select value={folder3} onChange={e => setFolder3(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base">
                  <option value="">Danh sách URL chung</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabelWithTip label="Bao gồm đường dẫn" tooltip={'Chỉ thu thập các URL khớp mẫu này. Ví dụ "/blog/*" chỉ lấy các trang trong /blog.'} />
                  <ChipsInput chips={includePaths3} onChange={setIncludePaths3} placeholder="/blog/*" />
                </div>
                <div>
                  <FieldLabelWithTip label="Loại trừ đường dẫn" tooltip={'Bỏ qua các URL khớp mẫu này.'} />
                  <ChipsInput chips={excludePaths3} onChange={setExcludePaths3} placeholder="/blog/*" />
                </div>
              </div>
              <AdvancedConfigSection value={advanced3} onChange={setAdvanced3} />
            </div>
          )}

          <DialogFooter>
            {tab === "children" && step === 2 ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">Đã chọn {selectedCount}/{discovered.length} URL</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(1)} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Quay lại</button>
                  <button onClick={submitChildren} disabled={selectedCount === 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Xử lý</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => { resetAll(); onClose(); }} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
                {tab === "specified" && <button onClick={submitSpecified} disabled={urlChips.length === 0 || invalidCount > 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Xử lý</button>}
                {tab === "children" && <button onClick={startDiscovery} className="btn-primary h-9">Lấy URL</button>}
                {tab === "sitemap" && <button onClick={submitSitemap} disabled={sitemapUrl.trim().length === 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Xử lý</button>}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingTab} onOpenChange={v => !v && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển sang cách khác?</AlertDialogTitle>
            <AlertDialogDescription>Thông tin bạn vừa nhập ở tab này sẽ không được giữ lại.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTab(null)} className="bg-primary text-primary-foreground hover:bg-primary/90">Ở lại</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabChange} className="bg-surface text-foreground border border-border hover:bg-surface-muted">Chuyển</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FieldLabelWithTip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild><span tabIndex={0} className="text-muted-foreground outline-none"><Info size={12} /></span></TooltipTrigger>
        <TooltipContent className="max-w-[240px]">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function NumericField({ label, tooltip, value, onChange, min, max }: { label: string; tooltip: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <FieldLabelWithTip label={label} tooltip={tooltip} />
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base" />
    </div>
  );
}
function NumericFieldOptional({ label, tooltip, placeholder, value, onChange, min, max }: { label: string; tooltip: string; placeholder: string; value: string; onChange: (v: string) => void; min: number; max?: number }) {
  return (
    <div>
      <FieldLabelWithTip label={label} tooltip={tooltip} />
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base" />
    </div>
  );
}
