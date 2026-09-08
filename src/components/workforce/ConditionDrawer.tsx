import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { ConditionNodeData, ConditionRule, ConditionType, RuleMatch } from "./types";
import { newConditionRule } from "./types";
import Toggle from "./Toggle";
import { useReturnFocusOnUnmount } from "./useReturnFocus";

const LLM_MAX = 500;

const VARIABLES: { key: string; label: string; type: "text" | "number" }[] = [
  { key: "agent_output", label: "Kết quả cuối (Agent output)", type: "text" },
  { key: "topic", label: "Chủ đề hội thoại", type: "text" },
  { key: "language", label: "Ngôn ngữ khách hàng", type: "text" },
  { key: "turns", label: "Số lượt hội thoại", type: "number" },
];

const TEXT_OPS = ["bằng", "khác", "chứa", "không chứa"];
const NUM_OPS = ["bằng", "lớn hơn", "nhỏ hơn"];

function variableType(key: string): "text" | "number" {
  return VARIABLES.find(v => v.key === key)?.type ?? "text";
}

export default function ConditionDrawer({
  sourceLabel, destinationLabel, destinationKind, data, onSave, onClose, keepContext, onChangeKeepContext,
}: {
  sourceLabel: string;
  destinationLabel: string;
  destinationKind: "agent" | "omni" | "person";
  data: ConditionNodeData;
  onSave: (data: ConditionNodeData) => void;
  onClose: () => void;
  keepContext?: boolean;
  onChangeKeepContext?: (value: boolean) => void;
}) {
  useReturnFocusOnUnmount();
  const [type, setType] = useState<ConditionType>(data.type);
  const [llmText, setLlmText] = useState(data.llmText);
  const [ruleMatch, setRuleMatch] = useState<RuleMatch>(data.ruleMatch);
  const [rules, setRules] = useState<ConditionRule[]>(data.rules.length > 0 ? data.rules : [newConditionRule()]);
  const [ruleError, setRuleError] = useState(false);

  const updateRule = (id: string, patch: Partial<ConditionRule>) =>
    setRules(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id: string) => setRules(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs));

  const submit = () => {
    if (type === "rule") {
      const invalid = rules.some(r => !r.variable.trim() || !r.value.trim());
      if (invalid) { setRuleError(true); return; }
    }
    setRuleError(false);
    onSave({ kind: "condition", type, llmText, ruleMatch, rules });
  };

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[440px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Điều kiện chuyển giao</h3>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sourceLabel} → {destinationLabel}</p>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="inline-flex p-0.5 rounded-lg bg-surface-muted">
          {(["llm", "rule"] as ConditionType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 h-7 rounded-md text-xs font-medium transition-base ${type === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "llm" ? "LLM-based" : "Rule-based"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {type === "llm" ? (
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

            <div className="space-y-2">
              {rules.map(r => {
                const vt = variableType(r.variable);
                const ops = vt === "number" ? NUM_OPS : TEXT_OPS;
                return (
                  <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                    <select
                      value={r.variable}
                      onChange={e => updateRule(r.id, { variable: e.target.value, operator: ops[0] })}
                      className="h-9 px-1.5 rounded-lg border border-border bg-surface text-xs outline-none focus:border-primary"
                    >
                      <option value="">Biến</option>
                      {VARIABLES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                    </select>
                    <select
                      value={r.operator}
                      onChange={e => updateRule(r.id, { operator: e.target.value })}
                      className="h-9 px-1.5 rounded-lg border border-border bg-surface text-xs outline-none focus:border-primary"
                    >
                      {ops.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input
                      type={vt === "number" ? "number" : "text"}
                      value={r.value}
                      onChange={e => updateRule(r.id, { value: e.target.value })}
                      placeholder="Giá trị"
                      className="h-9 px-2 rounded-lg border border-border bg-surface text-xs outline-none focus:border-primary min-w-0"
                    />
                    <button
                      type="button"
                      aria-label="Xóa điều kiện"
                      disabled={rules.length === 1}
                      onClick={() => removeRule(r.id)}
                      className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setRules(rs => [...rs, newConditionRule()])}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={12} /> Thêm điều kiện
            </button>
            {ruleError && (
              <p className="text-xs text-destructive mt-2">Vui lòng chọn đầy đủ biến và giá trị cho điều kiện.</p>
            )}
          </>
        )}
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
