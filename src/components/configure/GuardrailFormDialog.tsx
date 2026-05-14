import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { guardrailStore, type GuardrailRecord, type GuardrailKind, type GuardrailScope } from "./guardrailStore";
import { toast } from "sonner";

const NAME_MAX = 60;
const RULE_MAX = 300;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  agentId: string;
  guardrail?: GuardrailRecord;
  onSubmitted?: (rec: GuardrailRecord) => void;
}

export default function GuardrailFormDialog({ open, onOpenChange, mode, agentId, guardrail, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [rule, setRule] = useState("");
  const [kind, setKind] = useState<GuardrailKind>("block");
  const [scope, setScope] = useState<GuardrailScope>("output");
  const [example, setExample] = useState("");
  const [errors, setErrors] = useState<{ name?: string; rule?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(guardrail?.name ?? "");
    setRule(guardrail?.rule ?? "");
    setKind(guardrail?.kind ?? "block");
    setScope(guardrail?.scope ?? "output");
    setExample(guardrail?.example ?? "");
    setErrors({});
  }, [open, guardrail]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    else if (name.trim().length > NAME_MAX) e.name = `Name must be ≤ ${NAME_MAX} characters`;
    else if (guardrailStore.isDuplicateName(agentId, name, guardrail?.id)) e.name = "Name already exists";
    if (!rule.trim()) e.rule = "Rule is required";
    else if (rule.length > RULE_MAX) e.rule = `Rule must be ≤ ${RULE_MAX} characters`;
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    if (mode === "create") {
      const rec = guardrailStore.create(agentId, {
        name: name.trim(),
        rule: rule.trim(),
        kind,
        scope,
        example: example.trim() || undefined,
        enabled: true,
      });
      toast.success("Guardrail added");
      onSubmitted?.(rec);
    } else if (guardrail) {
      guardrailStore.update(agentId, guardrail.id, {
        name: name.trim(),
        rule: rule.trim(),
        kind,
        scope,
        example: example.trim() || undefined,
      });
      toast.success("Guardrail updated");
      onSubmitted?.({ ...guardrail, name: name.trim(), rule: rule.trim(), kind, scope, example: example.trim() || undefined });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Create new guardrail" : "Edit guardrail"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium flex items-center justify-between mb-1.5">
              <span>Name <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. No legal advice"
              className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                errors.name ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-medium flex items-center justify-between mb-1.5">
              <span>Rule <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-mono text-muted-foreground">{rule.length}/{RULE_MAX}</span>
            </label>
            <textarea
              value={rule}
              rows={3}
              onChange={e => setRule(e.target.value)}
              placeholder="State the hard rule the agent must follow…"
              className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm outline-none resize-none transition-base ${
                errors.rule ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {errors.rule && <p className="mt-1 text-[11px] text-destructive">{errors.rule}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Kind</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["block", "warn"] as GuardrailKind[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`h-9 px-3 rounded-lg border text-xs font-medium capitalize transition-base ${
                      kind === k
                        ? k === "block"
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-warning bg-warning/10 text-warning"
                        : "border-border bg-surface hover:bg-surface-muted"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Scope</label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value as GuardrailScope)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
              >
                <option value="input">Input (user message)</option>
                <option value="output">Output (agent reply)</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block">Example (optional)</label>
            <textarea
              value={example}
              rows={2}
              onChange={e => setExample(e.target.value)}
              placeholder="Concrete example of how to handle this situation…"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none resize-none focus:border-primary transition-base"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Cancel
          </button>
          <button type="button" onClick={submit} className="btn-primary h-9 px-4">
            {mode === "create" ? "Create" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
