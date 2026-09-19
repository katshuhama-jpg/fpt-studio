import { useState } from "react";
import { X, Plus, Trash2, ChevronDown, ShieldCheck, UserCog } from "lucide-react";
import type { ApprovalMode, ConditionNodeData, ConditionRule, ConditionType, RuleMatch } from "./types";
import { newConditionRule } from "./types";
import Toggle from "./Toggle";
import { useReturnFocusOnUnmount } from "./useReturnFocus";

const LLM_MAX = 500;
const CUSTOM_VARIABLE = "__custom__";

const VARIABLES: { key: string; label: string; type: "text" | "number" }[] = [
  { key: "agent_output", label: "Kết quả cuối (Agent output)", type: "text" },
  { key: "topic", label: "Chủ đề hội thoại", type: "text" },
  { key: "language", label: "Ngôn ngữ khách hàng", type: "text" },
  { key: "turns", label: "Số lượt hội thoại", type: "number" },
];

const TEXT_OPS = ["bằng", "khác", "chứa", "không chứa"];
const NUM_OPS = ["bằng", "lớn hơn", "lớn hơn hoặc bằng", "nhỏ hơn", "nhỏ hơn hoặc bằng"];

/** Whether `variable` is one of the fixed built-ins above, vs a custom one the user typed in
 * (e.g. `discount_percent` sourced from an upstream agent's structured output — the fix for the
 * gap that Condition rules could never reference a numeric business variable). */
function isCustomVariable(variable: string): boolean {
  return variable !== "" && !VARIABLES.some(v => v.key === variable);
}

function ruleVariableType(r: ConditionRule): "text" | "number" {
  const known = VARIABLES.find(v => v.key === r.variable);
  if (known) return known.type;
  return r.numeric ? "number" : "text";
}

const APPROVAL_MODE_META: { value: ApprovalMode; label: string; desc: string }[] = [
  { value: "required", label: "Bắt buộc người duyệt", desc: "Luồng dừng lại, chờ người được chọn Duyệt hoặc Từ chối trước khi tiếp tục." },
  { value: "agent-decide", label: "Để Agent tự quyết", desc: "Agent tự đánh giá — chỉ dừng chờ người duyệt khi Agent không đủ tự tin." },
];

export default function ConditionDrawer({
  sourceLabel, destinationLabel, destinationKind, data, onSave, onClose, onDelete, keepContext, onChangeKeepContext,
  assigneeName, assigneeInitials, onPickAssignee,
}: {
  sourceLabel: string;
  destinationLabel: string;
  destinationKind: "agent" | "omni" | "person";
  data: ConditionNodeData;
  onSave: (data: ConditionNodeData) => void;
  onClose: () => void;
  onDelete: () => void;
  keepContext?: boolean;
  onChangeKeepContext?: (value: boolean) => void;
  /** Resolved display for `data.approval.assigneeId` — looked up by the page the same way it
   * already resolves a Person node's member (`members.find(...)`), since this drawer has no org
   * data of its own. */
  assigneeName?: string | null;
  assigneeInitials?: string;
  onPickAssignee?: () => void;
}) {
  useReturnFocusOnUnmount();
  const [type, setType] = useState<ConditionType>(data.type);
  const [llmText, setLlmText] = useState(data.llmText);
  const [ruleMatch, setRuleMatch] = useState<RuleMatch>(data.ruleMatch);
  const [rules, setRules] = useState<ConditionRule[]>(data.rules.length > 0 ? data.rules : [newConditionRule()]);
  const [ruleError, setRuleError] = useState(false);
  const [approvalOn, setApprovalOn] = useState(!!data.approval);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(data.approval?.mode ?? "required");

  const updateRule = (id: string, patch: Partial<ConditionRule>) =>
    setRules(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id: string) => setRules(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs));

  const submit = () => {
    if (type === "rule") {
      const invalid = rules.some(r => !r.variable.trim() || !r.value.trim());
      if (invalid) { setRuleError(true); return; }
    }
    setRuleError(false);
    const approval = approvalOn ? { mode: approvalMode, assigneeId: data.approval?.assigneeId ?? null } : null;
    onSave({ kind: "condition", type, llmText, ruleMatch, rules, approval });
  };

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[440px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Điều kiện chuyển giao</h3>
          <div className="flex items-center gap-1 -mr-2">
            <button onClick={onDelete} aria-label="Xóa route" className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
              <X size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sourceLabel} → {destinationLabel}</p>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="inline-flex p-0.5 rounded-lg bg-surface-muted">
          {(["llm", "rule", "agent-judgment"] as ConditionType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 h-7 rounded-md text-xs font-medium transition-base ${type === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "llm" ? "LLM-based" : t === "rule" ? "Rule-based" : "Agent tự quyết"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {type === "agent-judgment" ? (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Gợi ý cho Agent (không bắt buộc)</label>
              <span className="text-xs text-muted-foreground">{llmText.length}/{LLM_MAX}</span>
            </div>
            <textarea
              rows={4}
              value={llmText}
              maxLength={LLM_MAX}
              onChange={e => setLlmText(e.target.value)}
              placeholder="Ví dụ: ưu tiên nhánh này khi ngữ cảnh không khớp rõ với các nhánh khác."
              className="ds-textarea"
            />
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Không có tiêu chí cố định — Agent nguồn tự quyết định có chuyển sang nhánh này hay không dựa trên ngữ cảnh và độ tự tin của chính nó, giống "AI connection" của Relevance AI thay vì một điều kiện tường minh.
            </p>

            {destinationKind === "agent" && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bối cảnh chuyển giao</div>
                <Toggle checked={!!keepContext} onChange={v => onChangeKeepContext?.(v)} label="Giữ ngữ cảnh hội thoại" />
              </div>
            )}
          </>
        ) : type === "llm" ? (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Chuyển sang nhánh này nếu:</label>
              <span className="text-xs text-muted-foreground">{llmText.length}/{LLM_MAX}</span>
            </div>
            <textarea
              rows={5}
              value={llmText}
              maxLength={LLM_MAX}
              onChange={e => setLlmText(e.target.value)}
              placeholder="Ví dụ: khách hàng hỏi ngoài phạm vi sản phẩm, hoặc khách hàng yêu cầu rõ ràng được nói chuyện với người thật."
              className="ds-textarea"
            />
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Hệ thống dùng mô hình ngôn ngữ để đối chiếu mô tả này với phản hồi và ngữ cảnh gần nhất của Agent nguồn ở mỗi lượt hội thoại.
            </p>

            {destinationKind === "agent" && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bối cảnh chuyển giao</div>
                <Toggle checked={!!keepContext} onChange={v => onChangeKeepContext?.(v)} label="Giữ ngữ cảnh hội thoại" />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Khớp</label>
              <div className="inline-flex p-0.5 rounded-lg bg-surface-muted w-full">
                <button
                  onClick={() => setRuleMatch("all")}
                  className={`flex-1 h-8 rounded-md text-xs font-medium transition-base ${ruleMatch === "all" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Tất cả điều kiện (AND)
                </button>
                <button
                  onClick={() => setRuleMatch("any")}
                  className={`flex-1 h-8 rounded-md text-xs font-medium transition-base ${ruleMatch === "any" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Bất kỳ điều kiện nào (OR)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {rules.map(r => {
                const vt = ruleVariableType(r);
                const ops = vt === "number" ? NUM_OPS : TEXT_OPS;
                const custom = isCustomVariable(r.variable);
                const selectValue = r.variable === "" ? "" : custom ? CUSTOM_VARIABLE : r.variable;
                return (
                  <div key={r.id} className="relative rounded-[10px] p-3.5" style={{ border: "1px solid var(--wf-border, hsl(var(--border)))" }}>
                    <button
                      type="button"
                      aria-label="Xóa điều kiện"
                      disabled={rules.length === 1}
                      onClick={() => removeRule(r.id)}
                      className="absolute top-3 right-3 w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-md flex items-center justify-center hover:bg-surface-muted transition-base disabled:opacity-30 disabled:pointer-events-none"
                      style={{ color: "var(--wf-cond-border, #8891A6)" }}
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 [font-family:var(--wf-font-display,inherit)]" style={{ color: "var(--wf-muted, #5B6472)" }}>
                          Biến
                        </label>
                        <div className="relative">
                          <select
                            value={selectValue}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === CUSTOM_VARIABLE) updateRule(r.id, { variable: "", numeric: false, operator: TEXT_OPS[0] });
                              else updateRule(r.id, { variable: v, numeric: false, operator: (VARIABLES.find(x => x.key === v)?.type === "number" ? NUM_OPS[0] : TEXT_OPS[0]) });
                            }}
                            className="w-full h-[38px] px-3 rounded-[8px] border bg-white text-[13.5px] outline-none focus:border-primary appearance-none [font-family:var(--wf-font-body,inherit)]"
                            style={{ borderColor: "var(--wf-border, hsl(var(--border)))", color: "var(--wf-text, #12151C)" }}
                          >
                            <option value="">Chọn biến…</option>
                            {VARIABLES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                            <option value={CUSTOM_VARIABLE}>+ Biến khác (tuỳ chỉnh)…</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--wf-cond-border, #8891A6)" }} />
                        </div>
                        {selectValue === CUSTOM_VARIABLE && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <input
                              value={r.variable}
                              onChange={e => updateRule(r.id, { variable: e.target.value })}
                              placeholder="vd: discount_percent"
                              autoFocus
                              className="flex-1 min-w-0 h-[34px] px-2.5 rounded-[8px] border bg-white text-[13px] outline-none focus:border-primary [font-family:var(--wf-font-body,inherit)]"
                              style={{ borderColor: "var(--wf-border, hsl(var(--border)))", color: "var(--wf-text, #12151C)" }}
                            />
                            <div className="inline-flex p-0.5 rounded-md bg-surface-muted shrink-0">
                              <button type="button" onClick={() => updateRule(r.id, { numeric: false, operator: TEXT_OPS[0] })} className={`px-2 h-[26px] rounded text-[11px] font-medium transition-base ${!r.numeric ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>Văn bản</button>
                              <button type="button" onClick={() => updateRule(r.id, { numeric: true, operator: NUM_OPS[0] })} className={`px-2 h-[26px] rounded text-[11px] font-medium transition-base ${r.numeric ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>Số</button>
                            </div>
                          </div>
                        )}
                        {custom && (
                          <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-snug">
                            Lấy giá trị từ output có cấu trúc của Agent nguồn (vd Agent trả JSON có trường <code className="font-mono">{r.variable || "…"}</code>).
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5 [font-family:var(--wf-font-display,inherit)]" style={{ color: "var(--wf-muted, #5B6472)" }}>
                          Toán tử
                        </label>
                        <div className="relative">
                          <select
                            value={r.operator}
                            onChange={e => updateRule(r.id, { operator: e.target.value })}
                            className="w-full h-[38px] px-3 rounded-[8px] border bg-white text-[13.5px] outline-none focus:border-primary appearance-none [font-family:var(--wf-font-body,inherit)]"
                            style={{ borderColor: "var(--wf-border, hsl(var(--border)))", color: "var(--wf-text, #12151C)" }}
                          >
                            {ops.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--wf-cond-border, #8891A6)" }} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5 [font-family:var(--wf-font-display,inherit)]" style={{ color: "var(--wf-muted, #5B6472)" }}>
                          Giá trị
                        </label>
                        <input
                          type={vt === "number" ? "number" : "text"}
                          value={r.value}
                          onChange={e => updateRule(r.id, { value: e.target.value })}
                          placeholder="Nhập giá trị…"
                          className="w-full h-[38px] px-3 rounded-[8px] border bg-white text-[13.5px] outline-none focus:border-primary min-w-0 [font-family:var(--wf-font-body,inherit)]"
                          style={{ borderColor: "var(--wf-border, hsl(var(--border)))", color: "var(--wf-text, #12151C)" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setRules(rs => [...rs, newConditionRule()])}
              className="mt-3.5 flex items-center gap-1.5 text-[13px] font-semibold hover:underline [font-family:var(--wf-font-display,inherit)]"
              style={{ color: "var(--wf-accent, #4650D6)" }}
            >
              <Plus size={14} /> Thêm điều kiện
            </button>
            {ruleError && (
              <p className="text-xs text-destructive mt-2">Vui lòng chọn đầy đủ biến và giá trị cho điều kiện.</p>
            )}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Toggle checked={approvalOn} onChange={setApprovalOn} label="Yêu cầu phê duyệt trước khi chuyển" />
          {approvalOn && (
            <div className="mt-3 space-y-2.5">
              <div className="space-y-1.5">
                {APPROVAL_MODE_META.map(m => {
                  const active = approvalMode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setApprovalMode(m.value)}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-base ${active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"}`}
                    >
                      <ShieldCheck size={15} className={`shrink-0 mt-0.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${active ? "text-primary" : ""}`}>{m.label}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--wf-muted, #5B6472)" }}>Người duyệt</label>
                {assigneeName ? (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface">
                    <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {assigneeInitials ?? "?"}
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{assigneeName}</span>
                    <button onClick={onPickAssignee} className="text-[11px] text-primary hover:underline font-medium shrink-0">Đổi</button>
                  </div>
                ) : (
                  <button
                    onClick={onPickAssignee}
                    className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-base"
                  >
                    <UserCog size={13} /> Chọn người duyệt
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-end gap-2">
        <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">
          Hủy bỏ
        </button>
        <button onClick={submit} className="btn-primary h-9">Lưu route</button>
      </div>
    </aside>
  );
}
