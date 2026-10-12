import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Building2, Check, ChevronDown, Eye, Lock, Pencil, Search, UserCog, X, type LucideIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers, type OrgMember } from "@/pages/organization/orgData";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { getAgent } from "./agentStore";
import {
  agentShareStore, resolveLevel, useRoleCanBuild,
  type AgentAccessLevel, type AgentGeneralAccess, type AgentMember,
} from "./agentShareStore";
import { notificationStore } from "@/components/notifications/notificationStore";
import { currentPersona } from "@/lib/demoPersona";

/** Only the Agent's owner or a Space Admin (Publish agents across the whole Console) adds people
 * to an Agent. People added to it - even at "Chỉnh sửa" - can't add others. */
export function useCanShareAgent(agentId: string) {
  const access = useGroupAccess("agents");
  const a = getAgent(agentId);
  if (agentId === "new") return false;
  if (a.ownerId === access.userId) return true;
  return access.hasPermission("publish") && access.scopeOf("publish") === "all";
}

type Level = "role" | "view" | "edit" | "none";
/** Level labels and what each one allows - the same wording in the menu and the doc. */
export const LEVEL_META: Record<Level, { label: string; helper: string; icon: LucideIcon }> = {
  role: { label: "Theo Vai trò", helper: "Ai có quyền tạo Agent được Chỉnh sửa, còn lại Chỉ xem.", icon: UserCog },
  edit: { label: "Chỉnh sửa", helper: "Sửa Agent, tài nguyên của Agent và publish.", icon: Pencil },
  view: { label: "Chỉ xem", helper: "Xem, chạy Evaluate và export lịch sử.", icon: Eye },
  none: { label: "Không có quyền", helper: "Không mở được Agent này.", icon: Lock },
};
/** Who works on the Agent - the same three choices as "Ai được dùng" on a resource. */
type Scope = "me" | "space" | "specific";

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function Avatar({ name, icon }: { name?: string; icon?: React.ReactNode }) {
  return (
    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${icon ? "bg-surface-muted text-muted-foreground" : "bg-primary-soft text-primary"}`} aria-hidden>
      {icon ?? initialsOf(name ?? "")}
    </span>
  );
}

/** Chỉ xem / Chỉnh sửa dropdown (Drive-style). `value` null = mixed selection in the add step. */
function LevelSelect({ value, onChange, onRemove, ariaLabel, variant = "text", levels = ["edit", "view"], removeLabel = "Xóa quyền" }: {
  value: Level | null; onChange: (v: Level) => void; onRemove?: () => void; ariaLabel: string;
  levels?: Level[]; removeLabel?: string;
  /** "inline": icon + chevron sitting inside the add box, like OneDrive. */
  variant?: "text" | "inline";
}) {
  const label = value ? LEVEL_META[value].label : "Mặc định";
  const Icon = value ? LEVEL_META[value].icon : Eye;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === "inline" ? (
          <button type="button" aria-label={`${ariaLabel}: ${label}`} title={label} className="self-stretch px-3 border-l border-border flex items-center gap-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground rounded-r-lg shrink-0 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon size={16} aria-hidden /><ChevronDown size={13} aria-hidden />
          </button>
        ) : (
          <button type="button" aria-label={`${ariaLabel}: ${label}`} className="h-8 px-2.5 text-xs rounded-lg border border-border bg-white hover:bg-surface-muted font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {label}<ChevronDown size={13} className="text-muted-foreground" aria-hidden />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1">
        {levels.map(l => { const LI = LEVEL_META[l].icon; return (
          <DropdownMenuItem key={l} onSelect={() => onChange(l)} className="flex items-start gap-2.5 py-2 cursor-pointer">
            <span className="w-4 pt-0.5 shrink-0">{value === l && <Check size={14} className="text-primary" aria-hidden />}</span>
            <LI size={16} className="mt-0.5 text-muted-foreground shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{LEVEL_META[l].label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{LEVEL_META[l].helper}</span>
            </span>
          </DropdownMenuItem>
        ); })}
        {onRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRemove} className={`${removeLabel === "Xóa quyền" ? "text-destructive focus:text-destructive" : ""} cursor-pointer py-2 pl-[52px]`}>{removeLabel}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ShareAgentModal({ agentId, open, onClose }: { agentId: string; open: boolean; onClose: () => void }) {
  const agent = getAgent(agentId);
  const { tree } = useOrg();
  const { userId } = useMyPermissions();
  const roleCanBuild = useRoleCanBuild();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const owner = byId.get(agent.ownerId ?? "");
  const iAmOwner = agent.ownerId === userId;
  /** A person's default level when added by name: what their Role allows (Build agents → Chỉnh sửa). */
  const roleDefault = (id: string): Level => (roleCanBuild(byId.get(id)) ? "edit" : "view");
  /** Stored levels are explicit; older "role" entries are read as the Role default. */
  const asLevel = (m: AgentMember): Level => resolveLevel(m.level, roleCanBuild(byId.get(m.userId)));

  const [saved, setSaved] = useState(() => agentShareStore.get(agentId));
  const [people, setPeople] = useState<AgentMember[]>(() => saved.people.map(p => ({ userId: p.userId, level: asLevel(p) })));
  const [scope, setScope] = useState<Scope>(saved.general === "space" ? "space" : saved.people.length ? "specific" : "me");
  const [generalLevel, setGeneralLevel] = useState<"role" | "view" | "edit">(saved.generalLevel === "edit" || saved.generalLevel === "view" ? saved.generalLevel : "role");
  const [query, setQuery] = useState("");
  // Add step (Drive's second screen): people being added, one level for all, notify toggle.
  const [adding, setAdding] = useState<OrgMember[]>([]);
  const [addLevel, setAddLevel] = useState<Level | null>(null);
  const [notify, setNotify] = useState(true);
  const [confirm, setConfirm] = useState<string | null>(null);

  /** People shown for the current scope: "Người cụ thể" has no use for "Không có quyền". */
  const shown = scope === "space" ? people : scope === "specific" ? people.filter(p => p.level !== "none") : [];

  const q = query.trim().toLowerCase();
  const taken = new Set([agent.ownerId, userId, ...shown.map(p => p.userId), ...adding.map(m => m.id)]);
  const candidates = q
    ? members.filter(m => !taken.has(m.id) && (m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q))).slice(0, 8)
    : [];

  /** Under "Cả Space" someone is added to get a different level, so suggest the other one. */
  const spaceLevelOf = (id: string): Level => (generalLevel === "role" ? roleDefault(id) : generalLevel);
  const addDefault = (id: string): Level => (scope === "space" ? (spaceLevelOf(id) === "view" ? "edit" : "view") : roleDefault(id));
  const addDefaults = adding.map(m => addDefault(m.id));
  const addLabelValue: Level | null = addLevel ?? (addDefaults.every(l => l === addDefaults[0]) ? addDefaults[0] ?? null : null);
  const addLevels: Level[] = scope === "space" ? ["edit", "view", "none"] : ["edit", "view"];

  const pick = (m: OrgMember) => { setAdding(a => [...a, m]); setQuery(""); };
  const cancelAdd = () => { setAdding([]); setAddLevel(null); setQuery(""); };

  /** What the current form stores for each scope. */
  const toShare = (sc: Scope, ps: AgentMember[]) => ({
    general: (sc === "space" ? "space" : "none") as AgentGeneralAccess,
    generalLevel: generalLevel as AgentAccessLevel,
    people: sc === "me" ? [] : sc === "specific" ? ps.filter(p => p.level !== "none") : ps,
  });

  const persist = (next: { people: AgentMember[]; general: AgentGeneralAccess; generalLevel: AgentAccessLevel }, addedIds: string[]) => {
    agentShareStore.set(agentId, next);
    setSaved(next);
    if (addedIds.length && notify) {
      const actor = currentPersona();
      notificationStore.push({
        kind: "agent_shared", recipients: addedIds, actorId: actor.id, actorName: actor.name,
        title: `${actor.name} đã thêm bạn vào Agent ${agent.name}`,
        segments: [[actor.name, true], [" đã thêm bạn vào Agent "], [agent.name, true]],
        href: `/agents/${agentId}`, resourceId: agentId,
      });
    }
  };

  /** Drive's "Send": adds everyone in the add step right away, then closes. */
  const sendAdd = () => {
    const added = adding.map(m => ({ userId: m.id, level: addLevel ?? addDefault(m.id) }));
    const nextPeople = [...people.filter(p => !added.some(a => a.userId === p.userId)), ...added];
    persist(toShare(scope, nextPeople), added.filter(a => a.level !== "none").map(a => a.userId));
    toast.success(added.length === 1 ? `Đã thêm ${adding[0].name} vào Agent.` : `Đã thêm ${added.length} nhân sự vào Agent.`);
    onClose();
  };

  // Main screen: scope, levels and removals are saved with "Lưu". Warn when anyone ends up
  // with less than they have now.
  const rank = (l: Level | null) => (l === "edit" ? 2 : l === "view" ? 1 : 0);
  const effective = (id: string, sh: { general: AgentGeneralAccess; generalLevel: AgentAccessLevel; people: AgentMember[] }): Level | null => {
    const mine = sh.people.find(p => p.userId === id);
    if (mine) return asLevel(mine);
    return sh.general === "space" ? resolveLevel(sh.generalLevel, roleCanBuild(byId.get(id))) : null;
  };
  const next = toShare(scope, people);
  const lowered = members.filter(m => m.id !== agent.ownerId && rank(effective(m.id, next)) < rank(effective(m.id, saved))).length;

  const applyMain = () => {
    persist(next, []);
    toast.success("Đã lưu thay đổi.");
    onClose();
  };
  const saveMain = () => {
    if (lowered > 0) { setConfirm(`${lowered} người sẽ mất quyền hoặc bị giảm quyền trên Agent này.`); return; }
    applyMain();
  };

  const searchBox = (placeholder: string) => (
    <div className="relative flex-1 min-w-0">
      {adding.length === 0 && <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />}
      <div className="min-h-10 w-full rounded-lg border border-border bg-surface flex items-stretch focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-base">
      <div className={`flex-1 min-w-0 flex flex-wrap items-center gap-1.5 ${adding.length ? "px-2 py-1.5" : "pl-9 pr-3"}`}>
        {adding.map(m => (
          <span key={m.id} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-1.5 rounded-full border border-border bg-white text-xs font-medium">
            <span className="w-5 h-5 rounded-full bg-primary-soft text-primary text-[10px] font-semibold flex items-center justify-center" aria-hidden>{initialsOf(m.name)}</span>
            {m.email ?? m.name}
            <button type="button" aria-label={`Bỏ ${m.name}`} onClick={() => setAdding(a => a.filter(x => x.id !== m.id))} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
          </span>
        ))}
        <input
          autoFocus={adding.length > 0}
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder={adding.length ? "" : placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-[120px] h-7 bg-transparent text-sm outline-none"
        />
      </div>
      {adding.length > 0 && <LevelSelect variant="inline" value={addLabelValue} onChange={setAddLevel} levels={addLevels} ariaLabel="Quyền của người được thêm" />}
      </div>
      {q && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-60 overflow-y-auto bg-white rounded-lg ring-1 ring-border shadow-elev z-30 p-1">
          {candidates.length === 0
            ? <p className="px-3 py-2.5 text-sm text-muted-foreground">Không tìm thấy ai khớp với "{query.trim()}". Thử tên khác hoặc email.</p>
            : candidates.map(m => (
              <button key={m.id} type="button" onClick={() => pick(m)} className="w-full flex items-center gap-2.5 text-left px-2 py-2 rounded-md hover:bg-surface-muted transition-base">
                <Avatar name={m.name} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{m.name}</span>
                  <span className="block text-xs text-muted-foreground truncate">{m.email}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );

  const SCOPES: { id: Scope; label: string }[] = [
    { id: "me", label: iAmOwner ? "Chỉ mình tôi" : "Chỉ chủ sở hữu" },
    { id: "space", label: "Cả Space" },
    { id: "specific", label: "Người cụ thể" },
  ];
  const scopeHelper: Record<Scope, string> = {
    me: iAmOwner ? "Chỉ bạn và Space Admin mở được Agent này." : "Chỉ chủ sở hữu và Space Admin mở được Agent này.",
    space: "Mọi thành viên Space mở được Agent này theo quyền chung bên dưới.",
    specific: "Chỉ người bạn chọn mới mở được Agent này.",
  };
  const addPlaceholder = scope === "space" ? "Thêm người có quyền khác Cả Space" : "Thêm người theo tên hoặc email";

  const ownerRow = (
    <div className="flex items-center gap-3 py-2">
      <Avatar name={owner?.name ?? "?"} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{owner?.name ?? "Chủ sở hữu"}{owner?.id === userId ? " (bạn)" : ""}</span>
        <span className="block text-xs text-muted-foreground truncate">{owner?.email}</span>
      </span>
      <span className="text-xs text-muted-foreground shrink-0 pr-1">Chủ sở hữu</span>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[560px]" onOpenAutoFocus={e => e.preventDefault()}>
          {adding.length > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <button type="button" aria-label="Quay lại" onClick={cancelAdd} className="w-8 h-8 -ml-1 rounded-lg hover:bg-surface-muted flex items-center justify-center"><ArrowLeft size={16} /></button>
                  {scope === "space" ? "Thêm quyền riêng" : `Thêm nhân sự vào "${agent.name}"`}
                </DialogTitle>
                <DialogDescription className={scope === "space" ? "" : "sr-only"}>
                  {scope === "space" ? `Quyền riêng thay cho quyền chung của Cả Space (${LEVEL_META[generalLevel].label}).` : "Thêm nhân sự vào Agent"}
                </DialogDescription>
              </DialogHeader>
              {searchBox(addPlaceholder)}
              <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 accent-primary" />
                Thông báo cho nhân sự được thêm
              </label>
              <DialogFooter>
                <button onClick={cancelAdd} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
                <button onClick={sendAdd} className="btn-primary h-9">Thêm</button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Nhân sự của "{agent.name}"</DialogTitle>
                <DialogDescription>Thêm người để cùng làm việc trên Agent trong Console.</DialogDescription>
              </DialogHeader>

              {/* Who works on the Agent - same three choices as "Ai được dùng" on a resource. */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Ai làm việc trên Agent này</h3>
                <div role="radiogroup" aria-label="Ai làm việc trên Agent này" className="grid grid-cols-3 p-1 rounded-lg bg-surface-muted gap-1">
                  {SCOPES.map(o => (
                    <button key={o.id} type="button" role="radio" aria-checked={scope === o.id} onClick={() => setScope(o.id)}
                      className={`h-8 rounded-md text-sm font-medium transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${scope === o.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{scopeHelper[scope]}</p>
              </div>

              {scope === "space" && (
                <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <Avatar icon={<Building2 size={15} />} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Mọi thành viên Space</span>
                    <span className="block text-xs text-muted-foreground">Quyền chung cho cả Space.</span>
                  </span>
                  <LevelSelect value={generalLevel} onChange={l => setGeneralLevel(l as "role" | "view" | "edit")} levels={["role", "edit", "view"]} ariaLabel="Quyền chung của Cả Space" />
                </div>
              )}

              <div>
                {scope === "space" && (
                  <>
                    <h3 className="text-sm font-semibold mb-1">Quyền riêng</h3>
                    <p className="text-xs text-muted-foreground mb-2">Người có tên dưới đây nhận quyền riêng, thay cho quyền chung bên trên.</p>
                  </>
                )}
                {scope === "specific" && <h3 className="text-sm font-semibold mb-2">Người được thêm</h3>}
                {scope !== "me" && searchBox(addPlaceholder)}
                <div className="max-h-64 overflow-y-auto -mx-1 px-1 mt-1">
                  {scope !== "space" && ownerRow}
                  {shown.map(p => {
                    const m = byId.get(p.userId);
                    const name = m?.name ?? p.userId;
                    const sameAsSpace = scope === "space" && p.level === spaceLevelOf(p.userId);
                    return (
                      <div key={p.userId} className="flex items-center gap-3 py-2">
                        <Avatar name={name} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{name}</span>
                          <span className="block text-xs text-muted-foreground truncate">{sameAsSpace ? "Giống quyền chung - Có thể xóa." : m?.email}</span>
                        </span>
                        <LevelSelect
                          value={p.level as Level}
                          levels={scope === "space" ? ["edit", "view", "none"] : ["edit", "view"]}
                          onChange={l => setPeople(ps => ps.map(x => x.userId === p.userId ? { ...x, level: l } : x))}
                          onRemove={() => setPeople(ps => ps.filter(x => x.userId !== p.userId))}
                          removeLabel={scope === "space" ? "Dùng quyền chung" : "Xóa quyền"}
                          ariaLabel={`Quyền của ${name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
                <button onClick={saveMain} className="btn-primary h-9">Lưu</button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={v => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Giảm quyền trên Agent?</AlertDialogTitle>
            <AlertDialogDescription>{confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirm(null); applyMain(); }}>Giảm quyền</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
