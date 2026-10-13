// "Danh thiếp Agent" (Agent card, A2A) - third block in Build > Cài đặt nâng cao, next to Sub-Agents and Starter
// Prompts. On/off per version (off by default): only a version published while it is on gets a
// card, generated once at Publish. Phase 1: Agents in the enterprise Workspace can hand work to
// this Agent. Skills follow the Agent's own (active) Skills; the Builder can hide some.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { IdIcon, PencilEdit01Icon, AiMagicIcon, ViewIcon, ViewOffSlashIcon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { getAgent, AGENTS } from "./agentStore";
import { agentSkillStore } from "./agentSkillStore";
import { skillStore, type Skill } from "./skillStore";
import { agentCardStore, useAgentCard, AGENT_CARD_DESC_MAX } from "./agentCardStore";

/** What the system writes when the Builder hasn't: the Agent's own description (Agents built
 * with AI always have one), or the prompt the Agent was generated from. Manual Agents start empty. */
function autoDescription(agentId: string, prompt: string): string {
  const a = AGENTS.find(x => x.id === agentId) ? getAgent(agentId) : null;
  const base = (a?.desc || prompt || "").trim();
  return base.slice(0, AGENT_CARD_DESC_MAX);
}

/** Mock "Chỉnh bằng AI": shortens on request, otherwise adds when to hand work over. */
function refineMock(text: string, ask: string, skills: Skill[]): string {
  const a = ask.toLowerCase();
  const first = text.split(/(?<=\.)\s/)[0] ?? text;
  if (a.includes("ngắn") || a.includes("gọn")) return first.slice(0, AGENT_CARD_DESC_MAX);
  const when = skills.slice(0, 2).map(s => s.description.replace(/\.$/, "").toLowerCase()).join(" hoặc ");
  const out = when ? `${first.replace(/\.$/, "")}. Giao việc khi cần ${when}.` : first;
  return out.slice(0, AGENT_CARD_DESC_MAX);
}

function promptFromUrl(): string {
  try { return new URLSearchParams(window.location.search).get("agentPrompt") || ""; } catch { return ""; }
}

function activeSkills(agentId: string): Skill[] {
  return [
    ...agentSkillStore.listAttachedConsoleSkillIds(agentId).map(id => skillStore.get(id)).filter((s): s is Skill => !!s),
    ...agentSkillStore.list(agentId),
  ].filter(s => agentSkillStore.isActive(agentId, s.id));
}

agentCardStore.setResolver(agentId => {
  const d = agentCardStore.getDraft(agentId);
  return {
    description: d.description ?? autoDescription(agentId, promptFromUrl()),
    skills: activeSkills(agentId).filter(s => !d.hiddenSkillIds.includes(s.id)).map(s => ({ id: s.id, name: s.name })),
  };
});

const SKILL_PREVIEW = 3;

export default function AgentCardBlock({ agentId }: { agentId: string }) {
  const [params] = useSearchParams();
  const { draft } = useAgentCard(agentId);

  const skills = activeSkills(agentId);
  const visible = skills.filter(s => !draft.hiddenSkillIds.includes(s.id));

  const description = draft.description ?? autoDescription(agentId, params.get("agentPrompt") || "");
  const [mode, setMode] = useState<"view" | "edit" | "ai">("view");
  const [text, setText] = useState(description);
  const [editError, setEditError] = useState("");
  const [ask, setAsk] = useState("");
  const [askError, setAskError] = useState("");
  const [refining, setRefining] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Publish was blocked for a missing description - open the editor right here.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (agentCardStore.consumeFocus(agentId)) {
      setText(description); setMode("edit");
      setEditError("Nhập giới thiệu để Publish.");
      window.setTimeout(() => rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
    }
  });

  const saveEdit = () => {
    if (!text.trim()) { setEditError("Nhập giới thiệu để lưu."); return; }
    agentCardStore.updateDraft(agentId, { description: text.trim() });
    setMode("view");
  };
  const runRefine = () => {
    if (!ask.trim()) { setAskError("Nhập điều bạn muốn chỉnh."); return; }
    setRefining(true);
    setTimeout(() => { setProposal(refineMock(description || ask, ask, visible)); setRefining(false); }, 900);
  };
  const closeAi = () => { setMode("view"); setAsk(""); setAskError(""); setProposal(null); };


  return (
    <div ref={rootRef} className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-3">
        <HugeiconsIcon icon={IdIcon} size={16} className="text-foreground shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold flex-1">Danh thiếp Agent</span>
        <Switch
          checked={draft.enabled}
          onCheckedChange={v => agentCardStore.updateDraft(agentId, { enabled: v })}
          aria-label="Bật danh thiếp Agent"
        />
      </div>

      <div className="px-3.5 pb-3.5 -mt-1">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Giúp Agent khác trong Workspace biết Agent này làm gì để phối hợp xử lý công việc.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Ví dụ: Agent Bán hàng chuyển hợp đồng sang Agent Pháp chế để rà soát.</p>

        {draft.enabled && (
          <>
            {/* Mô tả */}
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Giới thiệu</div>

              {mode === "view" && (
                description ? (
                  <p className="text-[13px] leading-relaxed rounded-lg bg-surface-muted px-3 py-2">{description}</p>
                ) : (
                  <p className="text-[13px] leading-relaxed rounded-lg border border-dashed border-warning px-3 py-2 text-foreground">
                    Chưa có giới thiệu. Cần có để Publish.
                  </p>
                )
              )}

              {mode === "edit" && (
                <div>
                  <textarea
                    autoFocus
                    rows={4}
                    maxLength={AGENT_CARD_DESC_MAX}
                    value={text}
                    onChange={e => { setText(e.target.value); if (editError) setEditError(""); }}
                    placeholder="Rà soát hợp đồng, tra cứu văn bản pháp luật."
                    aria-label="Giới thiệu trên danh thiếp"
                    aria-invalid={!!editError}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 ${editError ? "border-destructive" : "border-border"}`}
                  />
                  <div className="flex items-start gap-2 mt-1">
                    <span className={`text-xs flex-1 ${editError ? "text-destructive" : "text-muted-foreground"}`} role={editError ? "alert" : undefined}>
                      {editError || "Agent này làm gì, khi nào nên giao việc."}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{text.length}/{AGENT_CARD_DESC_MAX}</span>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => { setMode("view"); setEditError(""); }} className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-surface-muted transition-base">Huỷ</button>
                    <button onClick={saveEdit} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-base">Lưu</button>
                  </div>
                </div>
              )}

              {mode === "ai" && (
                <div className="rounded-lg border border-border p-2.5">
                  {description && <p className="text-[13px] leading-relaxed text-muted-foreground mb-2">{description}</p>}
                  {!proposal ? (
                    <>
                      <input
                        autoFocus
                        value={ask}
                        onChange={e => { setAsk(e.target.value); if (askError) setAskError(""); }}
                        onKeyDown={e => { if (e.key === "Enter") runRefine(); }}
                        placeholder={description ? "Ngắn hơn, nhấn mạnh rà soát hợp đồng" : "Agent rà soát hợp đồng cho Ban Pháp chế"}
                        aria-label="Bạn muốn chỉnh phần giới thiệu thế nào"
                        aria-invalid={!!askError}
                        className={`w-full h-9 rounded-md border bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 ${askError ? "border-destructive" : "border-border"}`}
                      />
                      {askError && <p className="text-xs text-destructive mt-1" role="alert">{askError}</p>}
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={closeAi} className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-surface-muted transition-base">Huỷ</button>
                        <button onClick={runRefine} disabled={refining} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-base disabled:opacity-60">
                          {refining ? "Đang chỉnh..." : description ? "Chỉnh" : "Tạo"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-medium text-primary mb-1">Bản AI đề xuất</div>
                      <p className="text-[13px] leading-relaxed rounded-md bg-primary-soft px-3 py-2">{proposal}</p>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={closeAi} className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-surface-muted transition-base">Giữ bản cũ</button>
                        <button
                          onClick={() => { agentCardStore.updateDraft(agentId, { description: proposal }); closeAi(); }}
                          className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-base"
                        >Dùng bản này</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {mode === "view" && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setText(description); setMode("edit"); }}
                    className="h-8 px-2.5 rounded-md border border-border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-surface-muted transition-base"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} size={13} aria-hidden="true" /> {description ? "Sửa" : "Viết giới thiệu"}
                  </button>
                  <button
                    onClick={() => setMode("ai")}
                    className="h-8 px-2.5 rounded-md border border-border text-xs font-medium text-primary inline-flex items-center gap-1.5 hover:bg-surface-muted transition-base"
                  >
                    <HugeiconsIcon icon={AiMagicIcon} size={13} aria-hidden="true" /> {description ? "Chỉnh bằng AI" : "Tạo bằng AI"}
                  </button>
                </div>
              )}
            </div>

            {/* Skill */}
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Skill trên danh thiếp{skills.length > 0 && <span className="tabular-nums"> · {visible.length}/{skills.length}</span>}
              </div>
              {skills.length === 0 ? (
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Chưa có Skill. Thêm ở mục Skills.
                </p>
              ) : (
                <div className="space-y-1">
                  {(showAllSkills ? skills : skills.slice(0, SKILL_PREVIEW)).map(s => {
                    const hidden = draft.hiddenSkillIds.includes(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-lg border border-border">
                        <span className="text-sm shrink-0" aria-hidden="true">{s.icon || "🧩"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[13px] font-medium truncate ${hidden ? "text-muted-foreground" : ""}`}>{s.name}</span>
                            {hidden && <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground">Đã ẩn</span>}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                        </div>
                        <button
                          onClick={() => agentCardStore.toggleSkill(agentId, s.id)}
                          aria-label={hidden ? `Hiện Skill ${s.name} trên danh thiếp` : `Ẩn Skill ${s.name} khỏi danh thiếp`}
                          title={hidden ? "Hiện trên danh thiếp" : "Ẩn khỏi danh thiếp"}
                          className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base shrink-0"
                        >
                          <HugeiconsIcon icon={hidden ? ViewOffSlashIcon : ViewIcon} size={15} />
                        </button>
                      </div>
                    );
                  })}
                  {skills.length > SKILL_PREVIEW && (
                    <button
                      onClick={() => setShowAllSkills(v => !v)}
                      aria-expanded={showAllSkills}
                      className="w-full h-9 rounded-lg text-xs font-medium text-primary inline-flex items-center justify-center gap-1 hover:bg-surface-muted transition-base"
                    >
                      {showAllSkills ? "Thu gọn" : "Xem tất cả"}
                      <HugeiconsIcon icon={ArrowDown01Icon} size={13} className={`transition-transform ${showAllSkills ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                  {visible.length === 0 && (
                    <p className="text-xs text-foreground mt-1">Đã ẩn hết Skill.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
