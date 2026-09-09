import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Puzzle, BookOpen, Plus, Search, LayoutGrid, List, ChevronRight, Copy, Trash2, Eye, Code2, Bold, Italic, Strikethrough, Heading1, Heading2, List as ListIcon, ListOrdered, Share2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { skillStore, type Skill } from "@/components/configure/skillStore";
import { isAccessibleTo, isViewOnly, type Sharing } from "@/components/configure/skillSharing";
import SkillOwnershipTag from "@/components/configure/SkillOwnershipTag";
import CreateSkillModal from "@/components/configure/CreateSkillModal";
import SkillShareModal from "@/components/configure/SkillShareModal";

function renderBody(md: string) {
  const lines = md.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      result.push(<h1 key={i} className="text-xl font-bold mb-3 mt-1 leading-snug">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} className="text-sm font-bold mt-4 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      result.push(<pre key={i} className="bg-surface-muted border border-border rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto my-2 leading-relaxed text-foreground">{codeLines.join("\n")}</pre>);
    } else if (line.startsWith("- ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={i}>{inlineRender(lines[i].slice(2))}</li>);
        i++;
      }
      result.push(<ul key={"ul"+i} className="list-disc pl-4 my-1 space-y-0.5 text-sm text-foreground leading-relaxed">{items}</ul>);
      continue;
    } else if (line.trim() === "") {
      // skip blank
    } else {
      result.push(<p key={i} className="text-sm leading-relaxed mb-1 text-foreground">{inlineRender(line)}</p>);
    }
    i++;
  }
  return result;
}

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-surface-muted border border-border rounded px-1 py-px text-xs font-mono text-primary">{p.slice(1,-1)}</code>;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2,-2)}</strong>;
    return p;
  });
}

type MainTab = "all" | "mine" | "shared";

export default function Skills() {
  const { can } = useMyPermissions();
  const access = useGroupAccess("skills");
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const currentUser = useMemo(() => {
    const me = members.find(m => m.id === access.userId);
    return { id: access.userId, name: me?.name ?? "Tran Nam", email: me?.email ?? "tran.nam@fpt.com" };
  }, [members, access.userId]);
  const canCreateSkill = can("skills.create");
  const [params, setParams] = useSearchParams();

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;
  const skills = skillStore.list();

  const [view, setView] = useState<"grid"|"list">("grid");
  const [tab, setTab] = useState<MainTab>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<"preview"|"source">("preview");
  const [editedName, setEditedName] = useState("");
  const [editedDesc, setEditedDesc] = useState("");
  const [editedBody, setEditedBody] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [shareTarget, setShareTarget] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const selected = selectedId ? skills.find(s => s.id === selectedId) ?? null : null;

  function openSkill(s: Skill) {
    setSelectedId(prev => prev === s.id ? null : s.id);
    setEditedName(s.name);
    setEditedDesc(s.description);
    setEditedBody(s.body);
    setIsDirty(false);
    setViewMode("preview");
  }

  // A skill linked to from elsewhere (e.g. an Agent's "Mở skill" row action) via ?open=<id>
  // auto-opens here, instead of requiring a dedicated /tools/:id detail route.
  useEffect(() => {
    const openId = params.get("open");
    if (!openId) return;
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
    const s = skillStore.get(openId);
    if (s) openSkill(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFieldChange() {
    setIsDirty(true);
  }

  function handleBodyChange(val: string) {
    setEditedBody(val);
    setIsDirty(true);
  }

  function handleSave() {
    if (!selected) return;
    skillStore.update(selected.id, { name: editedName.trim() || selected.name, description: editedDesc, body: editedBody });
    setIsDirty(false);
    refresh();
  }

  function wrapSelection(before: string, after: string = before) {
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const val = ta.value;
    const newVal = val.slice(0, s) + before + val.slice(s, e) + after + val.slice(e);
    handleBodyChange(newVal);
    setTimeout(() => { ta.selectionStart = s + before.length; ta.selectionEnd = e + before.length; ta.focus(); }, 0);
  }

  function prependLine(prefix: string) {
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart } = ta;
    const val = ta.value;
    const lineStart = val.lastIndexOf("\n", selectionStart - 1) + 1;
    const newVal = val.slice(0, lineStart) + prefix + val.slice(lineStart);
    handleBodyChange(newVal);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = selectionStart + prefix.length; ta.focus(); }, 0);
  }

  // A role whose Skills View Scope is "Own & Shared" (or with no View permission at all) only
  // ever sees skills it created or that were shared with it — not just on a filter tab, but in
  // every count and list below.
  const visibleSkills = access.canSeeAll ? skills : skills.filter(s => isAccessibleTo(s.sharing, s.ownerId, access.userId));

  const isMine = (s: Skill) => s.ownerId === access.userId;
  const isSharedWithMe = (s: Skill) => !isMine(s) && isAccessibleTo(s.sharing, s.ownerId, access.userId);

  const counts = {
    all: visibleSkills.length,
    mine: visibleSkills.filter(isMine).length,
    shared: visibleSkills.filter(isSharedWithMe).length,
  };

  const tabFiltered = tab === "mine" ? visibleSkills.filter(isMine)
    : tab === "shared" ? visibleSkills.filter(isSharedWithMe)
    : visibleSkills;

  const q = search.trim().toLowerCase();
  const visible = q
    ? tabFiltered.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    : tabFiltered;

  const TABS: { key: MainTab; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "mine", label: "Của tôi" },
    { key: "shared", label: "Được chia sẻ" },
  ];

  const isOwner = selected ? selected.ownerId === access.userId : false;
  const selectedAccessible = selected ? isAccessibleTo(selected.sharing, selected.ownerId, access.userId) : false;
  const selectedViewOnly = selected && !isOwner ? isViewOnly(selected.sharing, selected.ownerId, access.userId) : false;
  const canManageSelected = access.canAct("manage", selectedAccessible) && !selectedViewOnly;
  const canDeleteSelected = isOwner && access.canAct("delete", selectedAccessible);
  const canShareSelected = isOwner && access.canAct("publish", selectedAccessible);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        {/* Header */}
        <div className="bg-surface shrink-0">
          <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Skills</h1>
              <p className="text-sm text-muted-foreground">Skills shared across all agents in this workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Browse Library</button>
              <button
                onClick={() => canCreateSkill && setShowCreate(true)}
                disabled={!canCreateSkill}
                title={!canCreateSkill ? "You don't have permission to create skills." : undefined}
                className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Create Skill
              </button>
            </div>
          </div>
        </div>

        {/* Ownership tabs + search + view toggle */}
        <div className="border-b border-border bg-background shrink-0">
          <div className="max-w-[1200px] mx-auto px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
                    tab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary/10 text-primary" : "bg-surface-sunken text-muted-foreground"}`}>
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface border border-border">
                <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-base ${view === "grid" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Grid view"><LayoutGrid size={14} /></button>
                <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-base ${view === "list" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="List view"><List size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards */}
        {visible.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-5 border border-primary/15">
              <Puzzle size={26} />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">No skills yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">Skills teach your agents how to handle specific tasks. Create your own, or browse pre-built templates from the skill library.</p>
            <div className="flex items-center gap-3">
              <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Browse Library</button>
              <button
                onClick={() => canCreateSkill && setShowCreate(true)}
                disabled={!canCreateSkill}
                title={!canCreateSkill ? "You don't have permission to create skills." : undefined}
                className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Create Skill
              </button>
            </div>
          </div>
        ) : view === "grid" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map(s => (
                  <div key={s.id}
                    onClick={() => openSkill(s)}
                    className={`rounded-xl border p-4 cursor-pointer transition-base ${selected?.id === s.id ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted"}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base mb-3" style={{ background: s.iconBg }}>{s.icon}</div>
                    <div className="text-xs font-semibold mb-1.5 truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.description}</div>
                    <div className="flex items-center gap-1 flex-wrap mt-3">
                      <SkillOwnershipTag skill={s} userId={access.userId} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto px-8">
              {visible.map(s => (
                <div key={s.id}
                  onClick={() => openSkill(s)}
                  className={`flex items-center gap-3 py-3 border-b border-border cursor-pointer transition-base ${selected?.id === s.id ? "bg-primary-soft" : "hover:bg-surface-muted"}`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: s.iconBg }}>{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <SkillOwnershipTag skill={s} userId={access.userId} />
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <div className={`border-l border-border bg-surface flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${selected ? "w-[476px]" : "w-0"}`}>
        {selected && (
          <>
            {/* Sheet topbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-muted shrink-0">
              <ChevronRight size={13} className="text-muted-foreground rotate-180" />
              <div className="flex-1" />
              {isOwner && (
                <button
                  onClick={() => setShareTarget(selected)}
                  disabled={!canShareSelected}
                  title={!canShareSelected ? "Bạn không có quyền chia sẻ skill này." : "Share"}
                  className="icon-btn disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Share2 size={14} />
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => { const s = skillStore.duplicate(selected.id, currentUser.id, currentUser.name); if (s) { refresh(); openSkill(s); } }}
                  className="icon-btn" title="Copy"
                ><Copy size={14} /></button>
              )}
              {isOwner && (
                <button
                  onClick={() => setDeleteTarget(selected)}
                  disabled={!canDeleteSelected}
                  title={canDeleteSelected ? "Delete" : "You don't have permission to delete this skill."}
                  className="icon-btn text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                ><Trash2 size={14} /></button>
              )}
              {!selectedViewOnly && (
                <button
                  onClick={handleSave}
                  disabled={!isDirty || !canManageSelected}
                  title={!canManageSelected ? "You don't have permission to edit this skill." : undefined}
                  className={`h-7 px-3 rounded-lg text-xs font-medium transition-base ${isDirty && canManageSelected ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"}`}
                >
                  Save Changes
                </button>
              )}
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => setSelectedId(null)} className="icon-btn flex items-center gap-1 text-xs"><ChevronRight size={12} className="rotate-180" /> Done</button>
            </div>

            {/* View toggle — hidden for a view-only viewer, who only ever sees the rendered Preview */}
            {!selectedViewOnly && (
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-surface-muted shrink-0">
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface border border-border">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${viewMode === "preview" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye size={12} /> Preview
                  </button>
                  <button
                    onClick={() => setViewMode("source")}
                    className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${viewMode === "source" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Code2 size={12} /> Source
                  </button>
                </div>
              </div>
            )}

            {/* Formatting toolbar — only in source mode, and only when editable */}
            {!selectedViewOnly && viewMode === "source" && (
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border shrink-0">
                <button onClick={() => wrapSelection("**")} className="icon-btn" title="Bold"><Bold size={13} /></button>
                <button onClick={() => wrapSelection("*")} className="icon-btn italic" title="Italic"><Italic size={13} /></button>
                <button onClick={() => wrapSelection("~~")} className="icon-btn" title="Strikethrough"><Strikethrough size={13} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => prependLine("# ")} className="icon-btn" title="Heading 1"><Heading1 size={13} /></button>
                <button onClick={() => prependLine("## ")} className="icon-btn" title="Heading 2"><Heading2 size={13} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => prependLine("- ")} className="icon-btn" title="Bullet list"><ListIcon size={13} /></button>
                <button onClick={() => prependLine("1. ")} className="icon-btn" title="Numbered list"><ListOrdered size={13} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => wrapSelection("`")} className="icon-btn" title="Inline code"><Code2 size={13} /></button>
                <button onClick={() => wrapSelection("```\n", "\n```")} className="icon-btn" title="Code block" style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", padding: "0 4px" }}>&lt;/&gt;</button>
              </div>
            )}

            {/* All content — unified scroll area, no dividers */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-1">
              {selectedViewOnly ? (
                <>
                  <div className="section-eyebrow mb-0.5">Name</div>
                  <p className="text-base font-semibold px-2 py-1 -mx-2 mb-3">{selected.name}</p>
                  <div className="section-eyebrow mb-0.5">Description</div>
                  <p className="text-sm text-muted-foreground px-2 py-1 -mx-2 mb-4 leading-relaxed">{selected.description}</p>
                  <div>{renderBody(selected.body)}</div>
                </>
              ) : (
                <>
                  {/* Name */}
                  <div className="section-eyebrow mb-0.5">Name</div>
                  <input
                    value={editedName}
                    onChange={e => { setEditedName(e.target.value); handleFieldChange(); }}
                    className="w-full text-base font-semibold bg-transparent border border-transparent rounded-lg px-2 py-1 -mx-2 outline-none hover:border-border hover:bg-surface-muted focus:border-ring focus:bg-surface-muted transition-base mb-3"
                  />

                  {/* Description */}
                  <div className="section-eyebrow mb-0.5">Description</div>
                  <textarea
                    value={editedDesc}
                    onChange={e => { setEditedDesc(e.target.value); handleFieldChange(); const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
                    ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                    rows={1}
                    className="w-full text-sm text-muted-foreground bg-transparent border border-transparent rounded-lg px-2 py-1 -mx-2 outline-none resize-none overflow-hidden hover:border-border hover:bg-surface-muted focus:border-ring focus:bg-surface-muted transition-base leading-relaxed mb-4"
                  />

                  {/* Body */}
                  {viewMode === "preview" ? (
                    <div>{renderBody(editedBody || selected.body)}</div>
                  ) : (
                    <textarea
                      ref={editorRef}
                      value={editedBody}
                      onChange={e => handleBodyChange(e.target.value)}
                      className="w-full min-h-[400px] resize-none bg-transparent border border-transparent rounded-lg px-2 py-1 -mx-2 outline-none text-sm font-mono leading-relaxed text-foreground hover:border-border focus:border-ring focus:bg-surface-muted transition-base"
                      spellCheck={false}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateSkillModal
          onClose={() => setShowCreate(false)}
          onSubmit={data => {
            const skill = skillStore.create({ ...data, ownerId: currentUser.id, ownerName: currentUser.name });
            refresh();
            openSkill(skill);
          }}
          currentUser={currentUser}
          isDuplicateName={name => skillStore.isDuplicateName(name)}
        />
      )}

      {shareTarget && (
        <SkillShareModal
          open
          name={shareTarget.name}
          ownerName={shareTarget.ownerName}
          sharing={shareTarget.sharing}
          onSave={(sharing: Sharing) => { skillStore.updateSharing(shareTarget.id, sharing); refresh(); }}
          onClose={() => setShareTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa skill "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Skill sẽ bị xóa vĩnh viễn khỏi workspace. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  skillStore.remove(deleteTarget.id);
                  if (selectedId === deleteTarget.id) setSelectedId(null);
                }
                setDeleteTarget(null);
                refresh();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
