import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Building2, Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
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
  AGENT_PERMS, ALL_AGENT_PERMS, agentShareStore, samePerms, togglePerm, useAgentPerms, useIsSpaceAdmin,
  useRoleNameOf, useRolePermsOf,
  type AgentGeneralAccess, type AgentMember, type AgentPerm, type AgentShare,
} from "./agentShareStore";
import { notificationStore } from "@/components/notifications/notificationStore";
import { currentPersona } from "@/lib/demoPersona";

/** Only the owner or a Space Admin opens the popup - people added to a Nhân sự số never grant others. */
export function useCanShareAgent(agentId: string) {
  const access = useGroupAccess("agents");
  const a = getAgent(agentId);
  if (agentId === "new") return false;
  if (a.ownerId === access.userId) return true;
  return access.hasPermission("publish") && access.scopeOf("publish") === "all";
}

/** Menu copy - the same wording in the popup and the doc (confirmed with Tyler 16/10). */
const MODE_COPY = {
  role: { label: "Theo Vai trò", helper: "Quyền đi theo Vai trò. Vai trò đổi thì quyền đổi theo." },
  custom: { label: "Tuỳ chỉnh", helper: "Tự chọn từng quyền. Giữ nguyên khi Vai trò thay đổi." },
  remove: { label: "Gỡ quyền", helper: "Người này không mở được Nhân sự số nữa." },
  general: { label: "Dùng quyền chung", helper: "Bỏ quyền riêng, người này nhận quyền của Cả Space." },
};
type Scope = "me" | "space" | "specific";
type MenuPick = "role" | "custom" | "remove" | "general";

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

/** Theo Vai trò / Tuỳ chỉnh / Gỡ quyền. `count` shows "Tuỳ chỉnh · 4/7" on the trigger. */
function ModeSelect({ mode, count, onPick, picks, ariaLabel, variant = "text", disabled, blocked = [], blockedHint }: {
  mode: "role" | "custom" | "none"; count?: number; onPick: (p: MenuPick) => void; picks: MenuPick[]; ariaLabel: string;
  variant?: "text" | "inline"; disabled?: boolean; blocked?: MenuPick[]; blockedHint?: string;
}) {
  const label = mode === "custom" ? `${MODE_COPY.custom.label}${count !== undefined ? ` · ${count}/${ALL_AGENT_PERMS.length}` : ""}`
    : mode === "none" ? "Không có quyền" : MODE_COPY.role.label;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${ariaLabel}: ${label}`} disabled={disabled}
          className={`disabled:opacity-60 disabled:cursor-not-allowed ${variant === "inline"
            ? "self-stretch px-3 border-l border-border flex items-center gap-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground rounded-r-lg shrink-0 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs font-medium whitespace-nowrap"
            : `h-8 px-2.5 text-xs rounded-lg border bg-white hover:bg-surface-muted font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "none" ? "border-border text-destructive" : "border-border"}`}`}>
          {label}<ChevronDown size={13} className="text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1">
        {picks.filter(p => p === "role" || p === "custom").map(p => (
          <DropdownMenuItem key={p} disabled={blocked.includes(p)} onSelect={() => onPick(p)} className="flex items-start gap-2.5 py-2 cursor-pointer">
            <span className="w-4 pt-0.5 shrink-0">{mode === p && <Check size={14} className="text-primary" aria-hidden />}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{MODE_COPY[p].label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{blocked.includes(p) && blockedHint ? blockedHint : MODE_COPY[p].helper}</span>
            </span>
          </DropdownMenuItem>
        ))}
        {picks.some(p => p === "remove" || p === "general") && <DropdownMenuSeparator />}
        {picks.filter(p => p === "remove" || p === "general").map(p => (
          <DropdownMenuItem key={p} onSelect={() => onPick(p)} className="flex items-start gap-2.5 py-2 cursor-pointer">
            <span className="w-4 pt-0.5 shrink-0">{p === "remove" && mode === "none" && <Check size={14} className="text-primary" aria-hidden />}</span>
            <span className="min-w-0">
              <span className={`block text-sm font-medium ${p === "remove" ? "text-destructive" : ""}`}>{MODE_COPY[p].label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{MODE_COPY[p].helper}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The ticked permissions, always reachable by expanding the row. */
function PermList({ id, perms, rolePerms, hint, onToggle, allowed, readOnly }: {
  id: string; perms: AgentPerm[]; rolePerms?: AgentPerm[]; hint: string; onToggle: (p: AgentPerm, on: boolean) => void;
  /** A capped granter (see `capped`) can only tick what they hold themselves. */
  allowed?: Set<AgentPerm>; readOnly?: boolean;
}) {
  return (
    <div id={id} role="group" className="mt-1 mb-1 ml-11 rounded-lg border border-border bg-surface-muted px-3 py-2.5 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
      <p className="sm:col-span-2 text-xs text-muted-foreground mb-0.5">{hint}</p>
      {AGENT_PERMS.map(p => {
        const on = perms.includes(p.id);
        const over = on && rolePerms && !rolePerms.includes(p.id);
        return (
          <label key={p.id} className={`flex items-start gap-2 text-sm ${readOnly || (allowed && !allowed.has(p.id)) ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            title={!readOnly && allowed && !allowed.has(p.id) ? "Bạn không có quyền này nên không cấp được." : undefined}>
            <input type="checkbox" checked={on} disabled={readOnly || (allowed && !allowed.has(p.id))} onChange={e => onToggle(p.id, e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary shrink-0" />
            <span className="min-w-0">
              <span className="font-medium">{p.name}</span>
              {over && <span className="ml-1.5 text-[11px] font-semibold text-[hsl(var(--warning-strong))]">Vượt Vai trò</span>}
              <span className="block text-xs text-muted-foreground">{p.desc}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ExpandButton({ open, onClick, controls, name }: { open: boolean; onClick: () => void; controls: string; name: string }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-controls={controls}
      aria-label={`${open ? "Thu gọn" : "Xem"} quyền chi tiết của ${name}`}
      className="w-7 h-7 -ml-1 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground shrink-0 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
    </button>
  );
}

export default function ShareAgentModal({ agentId, open, onClose }: { agentId: string; open: boolean; onClose: () => void }) {
  const agent = getAgent(agentId);
  const { tree } = useOrg();
  const { userId } = useMyPermissions();
  const rolePermsOf = useRolePermsOf();
  const roleNameOf = useRoleNameOf();
  const isSpaceAdmin = useIsSpaceAdmin();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const owner = byId.get(agent.ownerId ?? "");
  const iAmOwner = agent.ownerId === userId;
  const roleOf = (id: string) => rolePermsOf(byId.get(id));
  // Not the owner and not a full Space Admin (e.g. Publish across the Space but not Build): capped at own permissions,
  // can't touch people who hold more, can't change who the Agent is open to (confirmed with Tyler 16/10).
  const mine = useAgentPerms(agentId);
  const capped = !iAmOwner && !isSpaceAdmin(byId.get(userId));
  const allowed: Set<AgentPerm> | undefined = capped ? new Set(mine?.perms ?? []) : undefined;
  const within = (ps: AgentPerm[]) => !allowed || ps.every(p => allowed.has(p));
  const BLOCK_HINT = "Vai trò của người này có quyền bạn không có.";

  const [saved, setSaved] = useState<AgentShare>(() => agentShareStore.get(agentId));
  const [people, setPeople] = useState<AgentMember[]>(() => saved.people);
  const [scope, setScope] = useState<Scope>(saved.general === "space" ? "space" : saved.people.some(p => p.mode !== "none") ? "specific" : "me");
  const [generalMode, setGeneralMode] = useState<"role" | "custom">(saved.generalMode);
  const [generalPerms, setGeneralPerms] = useState<AgentPerm[]>(saved.generalPerms ?? ["view", "history"]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (k: string) => setExpanded(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [query, setQuery] = useState("");
  // Add step: people being added share one setting.
  const [adding, setAdding] = useState<OrgMember[]>([]);
  const [addMode, setAddMode] = useState<"role" | "custom" | "none">("role");
  const [addPerms, setAddPerms] = useState<AgentPerm[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [confirm, setConfirm] = useState<{ title: string; body: string; action: string; cancel?: string; destructive?: boolean; onOk: () => void } | null>(null);

  const draftGeneral = { generalMode, generalPerms: generalMode === "custom" ? generalPerms : undefined };
  /** Permissions one member gets from the Cả Space access of a share. */
  const generalOf = (sh: Pick<AgentShare, "general" | "generalMode" | "generalPerms">, id: string): AgentPerm[] =>
    sh.general !== "space" ? [] : sh.generalMode === "role" ? roleOf(id) : (sh.generalPerms ?? []);
  const spaceDraft = { ...draftGeneral, general: "space" as const };
  const permsOfMember = (p: AgentMember) => p.mode === "role" ? roleOf(p.userId) : p.mode === "none" ? [] : (p.perms ?? []);
  /** What a member ends up with from a share (owner and Space Admins not counted). */
  const effective = (id: string, sh: AgentShare): AgentPerm[] => {
    const mine = sh.people.find(p => p.userId === id);
    return mine ? permsOfMember(mine) : generalOf(sh, id);
  };

  /** Ticking turns a person into Tuỳ chỉnh, or back into Theo Vai trò when it matches the Role. */
  const fromPerms = (u: string, perms: AgentPerm[]): AgentMember =>
    samePerms(perms, roleOf(u)) ? { userId: u, mode: "role" } : { userId: u, mode: "custom", perms };

  const shown = scope === "space" ? people : scope === "specific" ? people.filter(p => p.mode !== "none") : [];
  const q = query.trim().toLowerCase();
  const taken = new Set([agent.ownerId, userId, ...shown.map(p => p.userId), ...adding.map(m => m.id)]);
  const matches = q ? members.filter(m => !taken.has(m.id) && (m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q))) : [];
  const candidates = matches.filter(m => !isSpaceAdmin(m)).slice(0, 8);
  const adminMatch = matches.find(m => isSpaceAdmin(m));

  const pick = (m: OrgMember) => { setAdding(a => [...a, m]); setQuery(""); };
  const cancelAdd = () => { setAdding([]); setAddMode("role"); setAddOpen(false); setQuery(""); };

  /** What the form stores. "Không có quyền" entries are kept in every scope, so someone left out
   * stays out after switching scopes; under Cả Space an entry equal to the general access is dropped. */
  const toShare = (sc: Scope, ps: AgentMember[]): AgentShare => ({
    ...draftGeneral,
    general: (sc === "space" ? "space" : "none") as AgentGeneralAccess,
    people: sc === "me" ? ps.filter(p => p.mode === "none")
      : sc === "specific" ? ps
      : ps.filter(p => p.mode === "none" || !samePerms(permsOfMember(p), generalOf(spaceDraft, p.userId))),
  });

  const persist = (next: AgentShare, grantedIds: string[], raisedIds: string[]) => {
    agentShareStore.set(agentId, next);
    setSaved(next);
    const actor = currentPersona();
    const base = { kind: "agent_shared" as const, actorId: actor.id, actorName: actor.name, href: `/agents/${agentId}`, resourceId: agentId };
    if (grantedIds.length) notificationStore.push({
      ...base, recipients: grantedIds,
      title: `${actor.name} đã cấp quyền cho bạn trên Nhân sự số ${agent.name}`,
      segments: [[actor.name, true], [" đã cấp quyền cho bạn trên Nhân sự số "], [agent.name, true]],
    });
    if (raisedIds.length) notificationStore.push({
      ...base, kind: "agent_access_changed", recipients: raisedIds,
      title: `${actor.name} đã thay đổi quyền của bạn trên Nhân sự số ${agent.name}`,
      segments: [[actor.name, true], [" đã thay đổi quyền của bạn trên Nhân sự số "], [agent.name, true]],
    });
  };

  const others = members.filter(m => m.id !== agent.ownerId && !isSpaceAdmin(m));
  const lost = (id: string, sh: AgentShare) => effective(id, saved).some(p => !effective(id, sh).includes(p));
  const gained = (id: string, sh: AgentShare) => effective(id, sh).some(p => !effective(id, saved).includes(p));
  const loweredIn = (sh: AgentShare) => others.filter(m => lost(m.id, sh)).length;
  const spaceBuilds = (sh: AgentShare) => sh.general === "space" && sh.generalMode === "custom" && (sh.generalPerms ?? []).includes("build");
  const opensEditToSpace = (sh: AgentShare) => spaceBuilds(sh) && !spaceBuilds(saved);
  const norm = (sh: AgentShare) => JSON.stringify({
    g: sh.general, m: sh.general === "space" ? sh.generalMode : "", gp: sh.general === "space" && sh.generalMode === "custom" ? sh.generalPerms : [],
    p: sh.people.map(p => `${p.userId}:${p.mode}:${(p.perms ?? []).join(",")}`).sort(),
  });
  const next = toShare(scope, people);
  const dirty = adding.length > 0 || norm(next) !== norm(saved);

  /** Saves `sh`, asking first when someone loses a permission or the whole Space gets Build. */
  const commit = (sh: AgentShare, grantedIds: string[], message: string) => {
    const raisedIds = sh.people.filter(p => !grantedIds.includes(p.userId) && p.mode !== "none" && gained(p.userId, sh)).map(p => p.userId);
    const go = () => { persist(sh, grantedIds, raisedIds); toast.success(message); onClose(); };
    const lowered = loweredIn(sh);
    const openEdit = opensEditToSpace(sh);
    if (!lowered && !openEdit) { go(); return; }
    const parts = [
      lowered ? `${lowered} người sẽ mất quyền hoặc bị giảm quyền trên Nhân sự số này.` : "",
      openEdit ? "Mọi thành viên Space sẽ sửa được Nhân sự số này." : "",
    ].filter(Boolean);
    setConfirm({
      title: lowered ? "Giảm quyền trên Nhân sự số?" : "Cho cả Space sửa Nhân sự số?",
      body: parts.join(" "),
      action: lowered && openEdit ? "Lưu thay đổi" : lowered ? "Giảm quyền" : "Cho phép",
      destructive: !!lowered,
      onOk: go,
    });
  };

  // ── Add step ────────────────────────────────────────────────────────────
  const roleOkAll = adding.every(m => within(roleOf(m.id)));
  const effAddMode = addMode === "role" && !roleOkAll ? "custom" : addMode;
  const effAddPerms = effAddMode === "custom" && addMode === "role" ? (adding[0] ? roleOf(adding[0].id).filter(p => allowed?.has(p)) : []) : addPerms;
  const addedAll: AgentMember[] = adding.map(m => effAddMode === "none" ? { userId: m.id, mode: "none" } : effAddMode === "role" ? { userId: m.id, mode: "role" } : fromPerms(m.id, effAddPerms.length ? effAddPerms : ["view"]));
  /** Under Cả Space, a setting equal to what the person already gets from it adds nothing. */
  const added = scope === "space" ? addedAll.filter(a => !samePerms(permsOfMember(a), generalOf(spaceDraft, a.userId))) : addedAll;
  const addingOnlyNone = added.length > 0 && added.every(a => a.mode === "none");
  const sendAdd = () => {
    if (!added.length) { onClose(); return; }
    const nextPeople = [...people.filter(p => !added.some(a => a.userId === p.userId)), ...added];
    const one = added.length === 1 ? (byId.get(added[0].userId)?.name ?? "") : null;
    const message = addingOnlyNone
      ? (one ? `Đã cập nhật quyền của ${one}.` : `Đã cập nhật quyền của ${added.length} người.`)
      : (one ? `Đã cấp quyền cho ${one}.` : `Đã cấp quyền cho ${added.length} người.`);
    commit(toShare(scope, nextPeople), notify ? added.filter(a => a.mode !== "none").map(a => a.userId) : [], message);
  };
  const saveMain = () => commit(next, [], "Đã lưu thay đổi.");

  const requestClose = () => {
    if (!dirty) { onClose(); return; }
    setConfirm({
      title: "Bỏ thay đổi chưa lưu?", body: "Thay đổi về quyền trên Nhân sự số này sẽ không được lưu.",
      action: "Bỏ thay đổi", cancel: "Tiếp tục chỉnh sửa", destructive: true, onOk: onClose,
    });
  };

  const summary = (() => {
    let b = 0, pub = 0;
    for (const m of others) { const e = effective(m.id, next); if (e.includes("build")) b++; if (e.includes("publish")) pub++; }
    return { b, pub };
  })();

  // ── Row actions ─────────────────────────────────────────────────────────
  const setPerson = (u: string, m: AgentMember | null) =>
    setPeople(ps => m ? (ps.some(x => x.userId === u) ? ps.map(x => x.userId === u ? m : x) : [...ps, m]) : ps.filter(x => x.userId !== u));
  const onPickPerson = (p: AgentMember, k: MenuPick) => {
    if (k === "role") setPerson(p.userId, { userId: p.userId, mode: "role" });
    else if (k === "custom") {
      const cur = permsOfMember(p);
      setPerson(p.userId, { userId: p.userId, mode: "custom", perms: cur.length ? cur : roleOf(p.userId) });
      setExpanded(s => new Set(s).add(p.userId));
    }
    else if (k === "remove") setPerson(p.userId, scope === "space" ? { userId: p.userId, mode: "none" } : null);
    else setPerson(p.userId, null);
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
          <input autoFocus={adding.length > 0} value={query} onChange={e => setQuery(e.target.value)}
            placeholder={adding.length ? "" : placeholder} aria-label={placeholder}
            className="flex-1 min-w-[120px] h-7 bg-transparent text-sm outline-none" />
        </div>
        {adding.length > 0 && (
          <ModeSelect variant="inline" ariaLabel="Quyền của người được thêm"
            mode={effAddMode} count={effAddMode === "custom" ? effAddPerms.length : undefined}
            blocked={roleOkAll ? [] : ["role"]} blockedHint={BLOCK_HINT}
            picks={scope === "space" ? ["role", "custom", "remove"] : ["role", "custom"]}
            onPick={k => {
              if (k === "role") setAddMode("role");
              else if (k === "custom") { setAddMode("custom"); setAddPerms(p => p.length ? p : roleOf(adding[0].id)); setAddOpen(true); }
              else if (k === "remove") setAddMode("none");
            }} />
        )}
      </div>
      {q && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-60 overflow-y-auto bg-white rounded-lg ring-1 ring-border shadow-elev z-30 p-1">
          {candidates.length === 0
            ? <p className="px-3 py-2.5 text-sm text-muted-foreground">{adminMatch
                ? `${adminMatch.name} là Space Admin - Luôn có mọi quyền trên mọi Nhân sự số nên không cần thêm.`
                : `Không tìm thấy ai khớp với "${query.trim()}". Thử tên khác hoặc email.`}</p>
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
    me: iAmOwner ? "Chỉ bạn và Space Admin mở được Nhân sự số này." : "Chỉ chủ sở hữu và Space Admin mở được Nhân sự số này.",
    space: "Mọi thành viên Space mở được Nhân sự số này theo quyền chung bên dưới.",
    specific: "Chỉ người bạn chọn mới mở được Nhân sự số này.",
  };
  const addPlaceholder = scope === "space" ? "Thêm người có quyền khác Cả Space" : "Thêm người theo tên hoặc email";

  const ownerRow = (
    <div className="flex items-center gap-3 py-2">
      <span className="w-7 -ml-1 shrink-0" aria-hidden />
      <Avatar name={owner?.name ?? "?"} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{owner?.name ?? "Chủ sở hữu"}{owner?.id === userId ? " (bạn)" : ""}</span>
        <span className="block text-xs text-muted-foreground truncate">{owner?.email}</span>
      </span>
      <span className="text-xs text-muted-foreground shrink-0 pr-1">Chủ sở hữu</span>
    </div>
  );

  const roleHint = (name: string) => `Đang theo Vai trò ${name}. Đổi một quyền bất kỳ sẽ chuyển sang Tuỳ chỉnh.`;
  const customHint = (name: string) => `Quyền tự chọn, không đổi theo Vai trò. Chọn lại đúng như Vai trò ${name} sẽ quay về Theo Vai trò.`;
  const firstRole = adding[0] ? roleOf(adding[0].id) : [];
  const addListPerms = effAddMode === "custom" ? effAddPerms : firstRole;

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && requestClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          {adding.length > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <button type="button" aria-label="Quay lại" onClick={cancelAdd} className="w-8 h-8 -ml-1 rounded-lg hover:bg-surface-muted flex items-center justify-center"><ArrowLeft size={16} /></button>
                  {scope === "space" ? "Thêm quyền riêng" : `Cấp quyền trên "${agent.name}"`}
                </DialogTitle>
                <DialogDescription className={scope === "space" ? "" : "sr-only"}>
                  {scope === "space" ? "Quyền riêng thay cho quyền chung của Cả Space." : "Chọn quyền cho người được thêm"}
                </DialogDescription>
              </DialogHeader>
              {searchBox(addPlaceholder)}
              {addMode !== "none" && (
                <div>
                  <button type="button" onClick={() => setAddOpen(o => !o)} aria-expanded={addOpen} aria-controls="add-perms"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <ChevronRight size={13} className={`transition-transform ${addOpen ? "rotate-90" : ""}`} aria-hidden />
                    {addOpen ? "Ẩn quyền chi tiết" : "Xem quyền chi tiết"}
                  </button>
                  {addOpen && (
                    <div className="-ml-11">
                      <PermList id="add-perms" perms={addListPerms} allowed={allowed}
                        rolePerms={adding.length === 1 ? firstRole : undefined}
                        hint={effAddMode === "custom"
                          ? (adding.length > 1 ? `Áp cho cả ${adding.length} người. Ai trùng Vai trò của mình sẽ tự về Theo Vai trò.` : customHint(roleNameOf(byId.get(adding[0].id))))
                          : adding.length > 1 ? "Mỗi người nhận quyền theo Vai trò của mình. Đổi một quyền sẽ chuyển sang Tuỳ chỉnh và áp cho tất cả." : roleHint(roleNameOf(byId.get(adding[0].id)))}
                        onToggle={(p, on) => {
                          const nx = togglePerm(addListPerms, p, on);
                          setAddPerms(nx.length ? nx : ["view"]);
                          setAddMode(adding.length === 1 && samePerms(nx, firstRole) && within(firstRole) ? "role" : "custom");
                        }} />
                    </div>
                  )}
                </div>
              )}
              {!addingOnlyNone && (
                <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                  <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 accent-primary" />
                  Thông báo cho người được cấp quyền
                </label>
              )}
              <DialogFooter>
                <button onClick={cancelAdd} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
                <button onClick={sendAdd} className="btn-primary h-9 justify-center">{addingOnlyNone ? "Lưu" : "Cấp quyền"}</button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">Cấp quyền trên "{agent.name}"</DialogTitle>
                <DialogDescription>Chọn ai được xem hoặc chỉnh sửa Nhân sự số này trong Space.</DialogDescription>
              </DialogHeader>

              <div>
                <h3 className="text-sm font-semibold mb-2">Ai có quyền trên Nhân sự số này</h3>
                <div role="radiogroup" aria-label="Ai có quyền trên Nhân sự số này" className="grid grid-cols-3 p-1 rounded-lg bg-surface-muted gap-1">
                  {SCOPES.map(o => (
                    <button key={o.id} type="button" role="radio" aria-checked={scope === o.id} disabled={capped} onClick={() => setScope(o.id)}
                      className={`h-8 px-1 rounded-md text-xs sm:text-sm font-medium truncate transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${scope === o.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{capped ? `${scopeHelper[scope]} Chỉ chủ sở hữu hoặc Space Admin đổi được phạm vi.` : scopeHelper[scope]}</p>
              </div>

              {scope === "space" && <div className="-my-2">{ownerRow}</div>}
              {scope === "space" && (
                <div className="rounded-xl border border-border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <ExpandButton open={expanded.has("__general")} onClick={() => toggleExpand("__general")} controls="perms-general" name="Mọi thành viên Space" />
                    <Avatar icon={<Building2 size={15} />} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Mọi thành viên Space</span>
                      <span className="block text-xs text-muted-foreground">Quyền chung cho cả Space.</span>
                    </span>
                    <ModeSelect ariaLabel="Quyền chung của Cả Space" disabled={capped} mode={generalMode} count={generalMode === "custom" ? generalPerms.length : undefined}
                      picks={["role", "custom"]}
                      onPick={k => { if (k === "role") setGeneralMode("role"); else { setGeneralMode("custom"); setExpanded(s => new Set(s).add("__general")); } }} />
                  </div>
                  {expanded.has("__general") && (
                    generalMode === "role"
                      ? <p id="perms-general" className="mt-1 mb-1 ml-11 rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">Mỗi người nhận quyền theo Vai trò của mình. Chọn Tuỳ chỉnh để đặt một bộ quyền chung cho cả Space.</p>
                      : <PermList id="perms-general" perms={generalPerms} readOnly={capped} hint="Áp cho mọi thành viên Space, không đổi theo Vai trò."
                          onToggle={(p, on) => { const nx = togglePerm(generalPerms, p, on); setGeneralPerms(nx.length ? nx : ["view"]); }} />
                  )}
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
                <div className="-mx-1 px-1 mt-1">
                  {scope !== "space" && ownerRow}
                  {shown.map(p => {
                    const m = byId.get(p.userId);
                    const name = m?.name ?? p.userId;
                    const perms = permsOfMember(p);
                    const sameAsSpace = scope === "space" && p.mode !== "none" && samePerms(perms, generalOf(spaceDraft, p.userId));
                    const isOpen = expanded.has(p.userId) && p.mode !== "none";
                    const roleName = roleNameOf(m);
                    const locked = !within(perms);
                    return (
                      <div key={p.userId} className="py-1.5">
                        <div className="flex items-center gap-3">
                          {p.mode !== "none"
                            ? <ExpandButton open={isOpen} onClick={() => toggleExpand(p.userId)} controls={`perms-${p.userId}`} name={name} />
                            : <span className="w-7 -ml-1 shrink-0" aria-hidden />}
                          <Avatar name={name} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium truncate">{name}</span>
                            <span className="block text-xs text-muted-foreground truncate">{locked ? "Có quyền bạn không có - Bạn không đổi được." : sameAsSpace ? "Giống quyền chung - Sẽ tự bỏ khi lưu." : m?.email}</span>
                          </span>
                          <ModeSelect ariaLabel={`Quyền của ${name}`} disabled={locked} blocked={within(roleOf(p.userId)) ? [] : ["role"]} blockedHint={BLOCK_HINT} mode={p.mode} count={p.mode === "custom" ? perms.length : undefined}
                            picks={scope === "space" ? ["role", "custom", "remove", "general"] : ["role", "custom", "remove"]}
                            onPick={k => onPickPerson(p, k)} />
                        </div>
                        {isOpen && (
                          <PermList id={`perms-${p.userId}`} perms={perms} rolePerms={roleOf(p.userId)} allowed={allowed} readOnly={locked}
                            hint={p.mode === "role" ? roleHint(roleName) : customHint(roleName)}
                            onToggle={(perm, on) => {
                              const nx = togglePerm(perms, perm, on);
                              setPerson(p.userId, nx.length ? fromPerms(p.userId, nx) : (scope === "space" ? { userId: p.userId, mode: "none" } : null));
                            }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {scope !== "me" && (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Sau khi lưu: {summary.b} người sửa được, {summary.pub} người publish được. Chủ sở hữu và Space Admin luôn có mọi quyền.
                </p>
              )}

              <DialogFooter>
                <button onClick={requestClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
                <button onClick={saveMain} className="btn-primary h-9 justify-center">Lưu</button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={v => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{confirm?.cancel ?? "Hủy bỏ"}</AlertDialogCancel>
            <AlertDialogAction className={confirm?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={() => { const ok = confirm?.onOk; setConfirm(null); ok?.(); }}>{confirm?.action}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
