import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronDown, X, Check } from "lucide-react";
import {
  businessProcessStore,
  STRATEGY_OPTIONS,
  type BpStrategy,
  type BusinessProcess,
} from "./businessProcessStore";
import { taskStore } from "@/components/tasks/taskStore";
import { toolStore } from "@/components/tool-builder/types";

const NAME_MAX = 100;
const DESC_MAX = 800;
const SAMPLE_MAX = 2000;
const GOAL_MAX = 255;
const CONSTRAINT_MAX = 800;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  agentId: string;
  bp?: BusinessProcess;
  onSubmitted?: (bp: BusinessProcess) => void;
}

export default function BusinessProcessFormDialog({ open, onOpenChange, mode, agentId, bp, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sample, setSample] = useState("");
  const [goal, setGoal] = useState("");
  const [strategy, setStrategy] = useState<BpStrategy>("react");
  const [instruction, setInstruction] = useState("");
  const [constraint, setConstraint] = useState("");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tasks = useMemo(() => taskStore.list(agentId), [agentId, open]);
  const tools = useMemo(() => toolStore.list(agentId), [agentId, open]);

  const isDefault = bp?.isDefault;

  useEffect(() => {
    if (!open) return;
    setName(bp?.name ?? "");
    setDescription(bp?.description ?? "");
    setSample(bp?.sample ?? "");
    setGoal(bp?.goal ?? "");
    setStrategy(bp?.strategy ?? "react");
    setInstruction(bp?.instruction ?? "");
    setConstraint(bp?.constraint ?? "");
    setTaskIds(bp?.taskIds ?? []);
    setToolIds(bp?.toolIds ?? []);
    setErrors({});
  }, [open, bp]);

  // Tool Execution = exactly one Task XOR one Tool
  const handleStrategyChange = (s: BpStrategy) => {
    setStrategy(s);
    if (s === "tool_execution") {
      // keep at most one
      if (toolIds.length > 0) {
        setToolIds([toolIds[0]]);
        setTaskIds([]);
      } else if (taskIds.length > 0) {
        setTaskIds([taskIds[0]]);
        setToolIds([]);
      }
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const tn = name.trim();
    if (!tn) e.name = "The business process name is required.";
    else if (tn.length > NAME_MAX) e.name = `Max ${NAME_MAX} characters.`;
    else if (businessProcessStore.isDuplicateName(agentId, tn, bp?.id))
      e.name = "The business process name is existed in the system.";
    if (!description.trim()) e.description = "The description is required.";
    else if (description.length > DESC_MAX) e.description = `Max ${DESC_MAX} characters.`;
    if (sample.length > SAMPLE_MAX) e.sample = `Max ${SAMPLE_MAX} characters.`;
    if (!goal.trim()) e.goal = "The goal is required.";
    else if (goal.length > GOAL_MAX) e.goal = `Max ${GOAL_MAX} characters.`;
    if (!instruction.trim()) e.instruction = "The instruction is required.";
    if (constraint.length > CONSTRAINT_MAX) e.constraint = `Max ${CONSTRAINT_MAX} characters.`;
    if (strategy === "tool_execution" && taskIds.length === 0 && toolIds.length === 0) {
      e.selection = "Please select at least one Task or Tool.";
    }
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      sample: sample.trim() || undefined,
      goal: goal.trim(),
      strategy,
      instruction: instruction.trim(),
      constraint: constraint.trim() || undefined,
      taskIds,
      toolIds,
    };

    if (mode === "create") {
      const rec = businessProcessStore.create(agentId, payload);
      toast.success("The business process is successfully created.");
      onSubmitted?.(rec);
    } else if (bp) {
      businessProcessStore.update(agentId, bp.id, payload);
      toast.success("The business process has been updated successfully.");
      onSubmitted?.({ ...bp, ...payload, updatedAt: Date.now() });
    }
    onOpenChange(false);
  };

  const toggleTask = (id: string) => {
    if (strategy === "tool_execution") {
      setTaskIds([id]);
      setToolIds([]);
    } else {
      setTaskIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }
  };
  const toggleTool = (id: string) => {
    if (strategy === "tool_execution") {
      setToolIds([id]);
      setTaskIds([]);
    } else {
      setToolIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Create business process" : "Edit business process"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "Create a new business process for a business area."
              : "Update an existing business process."}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <Field
            label="Name"
            required
            counter={`${name.length}/${NAME_MAX}`}
            error={errors.name}
          >
            <input
              autoFocus
              value={name}
              disabled={isDefault}
              maxLength={NAME_MAX + 20}
              onChange={e => setName(e.target.value)}
              placeholder="Enter a concise and recognizable name"
              className={inputCls(!!errors.name) + (isDefault ? " opacity-60 cursor-not-allowed" : "")}
            />
          </Field>

          {/* Description */}
          <Field label="Description" required counter={`${description.length}/${DESC_MAX}`} error={errors.description}>
            <textarea
              value={description}
              rows={3}
              maxLength={DESC_MAX + 50}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief overview of what this business process does"
              className={textareaCls(!!errors.description)}
            />
          </Field>

          {/* Sample */}
          <Field label="Sample" counter={`${sample.length}/${SAMPLE_MAX}`} error={errors.sample}>
            <textarea
              value={sample}
              rows={2}
              maxLength={SAMPLE_MAX + 50}
              onChange={e => setSample(e.target.value)}
              placeholder="Example user utterances that should trigger this business process"
              className={textareaCls(!!errors.sample)}
            />
          </Field>

          {/* Goal */}
          <Field label="Goal" required counter={`${goal.length}/${GOAL_MAX}`} error={errors.goal}>
            <input
              value={goal}
              maxLength={GOAL_MAX + 20}
              onChange={e => setGoal(e.target.value)}
              placeholder="The objective this business process aims to achieve"
              className={inputCls(!!errors.goal)}
            />
          </Field>

          {/* Strategy */}
          <Field label="Strategy" required>
            <div className="grid sm:grid-cols-3 gap-2">
              {STRATEGY_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleStrategyChange(opt.value)}
                  className={`text-left rounded-lg border p-2.5 transition-base ${
                    strategy === opt.value
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/40 bg-surface"
                  }`}
                >
                  <div className="text-[12px] font-semibold flex items-center gap-1.5">
                    {strategy === opt.value && <Check size={11} className="text-primary" />}
                    {opt.label}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Instruction */}
          <Field
            label="Instruction"
            required
            error={errors.instruction}
            hint="Tip: describe instructions clearly using sequence numbers or bullet points."
          >
            <textarea
              value={instruction}
              rows={4}
              onChange={e => setInstruction(e.target.value)}
              placeholder="Step-by-step guidance the Agent must follow to execute this business process correctly"
              className={textareaCls(!!errors.instruction)}
            />
          </Field>

          {/* Tasks selector */}
          <Field
            label={strategy === "tool_execution" ? "Task (select one)" : "Tasks"}
            error={!errors.selection ? undefined : strategy === "tool_execution" ? errors.selection : undefined}
          >
            <MultiSelect
              placeholder="Select task"
              items={tasks.map(t => ({ id: t.id, label: t.name, sub: t.kind === "system" ? "System" : "User" }))}
              selected={taskIds}
              onToggle={toggleTask}
              disabled={strategy === "tool_execution" && toolIds.length > 0}
              singleSelect={strategy === "tool_execution"}
            />
          </Field>

          {/* Tools selector */}
          <Field
            label={strategy === "tool_execution" ? "Tool (select one)" : "Tools"}
            error={errors.selection && strategy === "tool_execution" ? errors.selection : undefined}
          >
            <MultiSelect
              placeholder="Select tool"
              items={tools.map(t => ({ id: t.id.replace(`${agentId}:`, ""), label: t.name, sub: t.source ?? "" }))}
              selected={toolIds}
              onToggle={toggleTool}
              disabled={strategy === "tool_execution" && taskIds.length > 0}
              singleSelect={strategy === "tool_execution"}
            />
          </Field>

          {/* Constraint */}
          <Field label="Constraint" counter={`${constraint.length}/${CONSTRAINT_MAX}`} error={errors.constraint}>
            <textarea
              value={constraint}
              rows={2}
              maxLength={CONSTRAINT_MAX + 50}
              onChange={e => setConstraint(e.target.value)}
              placeholder="Limitations or conditions the Agent must respect when executing this business process"
              className={textareaCls(!!errors.constraint)}
            />
          </Field>
        </div>

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Cancel
          </button>
          <button type="button" onClick={submit} className="btn-primary h-9 px-4">
            {mode === "create" ? "Save & Process" : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- helpers ---------- */
const inputCls = (err: boolean) =>
  `w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
    err ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
  }`;
const textareaCls = (err: boolean) =>
  `w-full px-3 py-2 rounded-lg border bg-surface text-sm outline-none resize-none transition-base ${
    err ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
  }`;

function Field({
  label, required, counter, error, hint, children,
}: { label: string; required?: boolean; counter?: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground flex items-center justify-between mb-1.5">
        <span>
          {label} {required && <span className="text-destructive">*</span>}
        </span>
        {counter && <span className="text-[10px] font-mono text-muted-foreground">{counter}</span>}
      </label>
      {hint && <div className="text-[10.5px] italic text-muted-foreground mb-1">{hint}</div>}
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function MultiSelect({
  items, selected, onToggle, placeholder, disabled, singleSelect,
}: {
  items: { id: string; label: string; sub?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
  singleSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = items.filter(i => selected.includes(i.id));
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full min-h-9 px-2 py-1 rounded-lg border bg-surface text-sm outline-none flex items-center gap-1.5 transition-base text-left ${
          disabled ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:border-primary/40"
        }`}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {sel.length === 0 ? (
            <span className="text-muted-foreground px-1">{placeholder}</span>
          ) : (
            sel.map(s => (
              <span
                key={s.id}
                className="chip chip-primary text-[11px]"
                onClick={e => { e.stopPropagation(); onToggle(s.id); }}
              >
                {s.label} <X size={9} />
              </span>
            ))
          )}
        </div>
        <ChevronDown size={13} className="text-muted-foreground shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-elev">
          {items.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-muted-foreground italic">No items available.</div>
          )}
          {items.map(i => {
            const active = selected.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => { onToggle(i.id); if (singleSelect) setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-left hover:bg-surface-muted transition-base ${
                  active ? "bg-primary-soft/40" : ""
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${active ? "bg-primary border-primary" : "border-border"}`}>
                  {active && <Check size={9} className="text-primary-foreground" />}
                </div>
                <span className="flex-1 truncate">{i.label}</span>
                {i.sub && <span className="text-[10px] text-muted-foreground">{i.sub}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
