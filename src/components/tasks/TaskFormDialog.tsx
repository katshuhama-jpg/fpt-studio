import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { taskStore, type TaskRecord } from "./taskStore";
import { toast } from "sonner";

const NAME_MAX = 50;
const PURPOSE_MAX = 255;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  agentId: string;
  task?: TaskRecord;
  onSubmitted?: (task: TaskRecord) => void;
}

export default function TaskFormDialog({ open, onOpenChange, mode, agentId, task, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [errors, setErrors] = useState<{ name?: string; purpose?: string }>({});
  const [touched, setTouched] = useState({ name: false, purpose: false });

  useEffect(() => {
    if (open) {
      setName(task?.name ?? "");
      setPurpose(task?.purpose ?? "");
      setErrors({});
      setTouched({ name: false, purpose: false });
    }
  }, [open, task]);

  const validate = (n: string, p: string) => {
    const e: { name?: string; purpose?: string } = {};
    const tn = n.trim(), tp = p.trim();
    if (!tn) e.name = "The Name is required";
    else if (tn.length > NAME_MAX) e.name = `Name must be no more than ${NAME_MAX} characters`;
    else if (taskStore.isDuplicateName(agentId, tn, task?.id)) e.name = "Task name already exists in the system";
    if (!tp) e.purpose = "The Purpose is required";
    else if (tp.length > PURPOSE_MAX) e.purpose = `Purpose must be no more than ${PURPOSE_MAX} characters`;
    return e;
  };

  const submit = () => {
    const e = validate(name, purpose);
    setErrors(e);
    setTouched({ name: true, purpose: true });
    if (Object.keys(e).length) return;

    if (mode === "create") {
      const rec = taskStore.create(agentId, name, purpose);
      toast.success("Task created successfully");
      onSubmitted?.(rec);
    } else if (task) {
      taskStore.update(agentId, task.id, { name: name.trim(), purpose: purpose.trim() });
      toast.success("Task updated successfully");
      onSubmitted?.({ ...task, name: name.trim(), purpose: purpose.trim() });
    }
    onOpenChange(false);
  };

  const nameErr = touched.name ? errors.name : undefined;
  const purposeErr = touched.purpose ? errors.purpose : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Create new task" : "Edit task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground flex items-center justify-between mb-1.5">
              <span>Name <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </label>
            <input
              autoFocus
              value={name}
              maxLength={NAME_MAX + 20}
              onChange={e => { setName(e.target.value); if (touched.name) setErrors(validate(e.target.value, purpose)); }}
              onBlur={() => { setTouched(t => ({ ...t, name: true })); setErrors(validate(name, purpose)); }}
              placeholder="A clear and memorable name…"
              className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                nameErr ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {nameErr && <p className="mt-1 text-[11px] text-destructive">{nameErr}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-foreground flex items-center justify-between mb-1.5">
              <span>Purpose <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-mono text-muted-foreground">{purpose.length}/{PURPOSE_MAX}</span>
            </label>
            <textarea
              value={purpose}
              rows={3}
              maxLength={PURPOSE_MAX + 50}
              onChange={e => { setPurpose(e.target.value); if (touched.purpose) setErrors(validate(name, e.target.value)); }}
              onBlur={() => { setTouched(t => ({ ...t, purpose: true })); setErrors(validate(name, purpose)); }}
              placeholder="Expected outcome of executing this task"
              className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm outline-none resize-none transition-base ${
                purposeErr ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {purposeErr && <p className="mt-1 text-[11px] text-destructive">{purposeErr}</p>}
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
          <button
            type="button"
            onClick={submit}
            className="btn-primary h-9 px-4"
          >
            {mode === "create" ? "Create" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
