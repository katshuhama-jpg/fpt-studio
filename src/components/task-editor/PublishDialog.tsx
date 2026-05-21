import { useEffect, useState } from "react";
import { Rocket, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { businessProcessStore } from "@/components/business-processes/businessProcessStore";
import { triggerStore } from "@/components/configure/triggerStore";
import { taskStore } from "@/components/tasks/taskStore";

interface Props {
  open: boolean;
  onClose: () => void;
  agentId: string;
  taskId: string;
  taskName: string;
  existingNames: string[];
  defaultVersionName: string;
  onPublish: (name: string, note: string) => void;
}

export default function PublishDialog({ open, onClose, agentId, taskId, taskName, existingNames, defaultVersionName, onPublish }: Props) {
  const [vname, setVname] = useState(defaultVersionName);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setVname(defaultVersionName); setNote(""); } }, [open, defaultVersionName]);

  const dupName = existingNames.some(n => n.toLowerCase() === vname.trim().toLowerCase());
  const nameOk = vname.trim().length > 0 && vname.length <= 50 && !dupName;
  const noteOk = note.length <= 1000;

  // Mock cross-references
  const bps = businessProcessStore.list(agentId).filter(b => b.taskIds?.includes(taskId));
  const triggers = (() => { try { return triggerStore.list(agentId).filter((t: any) => t.taskId === taskId || (t.taskIds || []).includes(taskId)); } catch { return []; } })();
  const tasks = taskStore.list(agentId).filter(t => t.id !== taskId && (t.purpose || "").toLowerCase().includes(taskName.toLowerCase()));
  const refs = [
    ...bps.map(b => ({ kind: "Business Process", name: b.name })),
    ...triggers.map((t: any) => ({ kind: "Trigger", name: t.name || t.id })),
    ...tasks.map(t => ({ kind: "Task", name: t.name })),
  ];

  const submit = () => {
    if (!nameOk || !noteOk) return;
    setSubmitting(true);
    setTimeout(() => {
      onPublish(vname.trim(), note.trim());
      setSubmitting(false);
      toast.success(`Published ${vname.trim()}`);
      onClose();
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Rocket size={16} /> Publish workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Version name <span className="text-destructive">*</span></label>
            <input
              autoFocus value={vname} maxLength={50}
              onChange={e => setVname(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary"
            />
            {dupName && <p className="text-[11px] text-destructive mt-1">Version name already exists.</p>}
            <p className="text-[10px] text-muted-foreground mt-1">{vname.length}/50</p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Release note (optional)</label>
            <textarea
              rows={3} value={note} maxLength={1000}
              onChange={e => setNote(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary resize-none"
              placeholder="What changed in this version?"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{note.length}/1000</p>
          </div>

          {refs.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-warning mb-1.5">
                <AlertTriangle size={12} /> This task is used elsewhere
              </div>
              <ul className="space-y-0.5 text-foreground/80">
                {refs.slice(0, 6).map((r, i) => (
                  <li key={i}><span className="font-mono text-[10px] uppercase mr-1">{r.kind}</span>{r.name}</li>
                ))}
                {refs.length > 6 && <li className="text-muted-foreground">+ {refs.length - 6} more…</li>}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">After publishing, the Task remains a workflow inside the Agent and can be exported to JSON.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={!nameOk || !noteOk || submitting}
            className="btn-primary h-9 px-4 disabled:opacity-50">
            <Rocket size={13} /> {submitting ? "Publishing…" : "Publish"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
