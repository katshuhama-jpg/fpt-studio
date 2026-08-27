import { useEffect, useState } from "react";
import { X, Globe, MessageCircle, Facebook, Slack, Users, Webhook, Building2 } from "lucide-react";
import { externalAgentStore, PUBLISH_CHANNELS } from "./externalAgentStore";
import { UnpublishExternalAgentDialog } from "./ExternalAgentDialogs";
import { toast } from "sonner";

const CHANNEL_ICONS: Record<string, any> = {
  web: Globe, zalo: MessageCircle, messenger: Facebook, slack: Slack, teams: Users, api: Webhook, workspace: Building2,
};

export default function PublishExternalAgentModal({ open, agentId, agentName, currentChannels, onClose, onPublished }: {
  open: boolean; agentId: string; agentName: string; currentChannels: string[];
  onClose: () => void; onPublished: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentChannels));
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  useEffect(() => {
    if (open) setSelected(new Set(currentChannels));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const toggle = (id: string) => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const wasPublished = currentChannels.length > 0;

  const doPublish = () => {
    if (selected.size === 0) {
      if (wasPublished) {
        setShowUnpublishConfirm(true);
        return;
      }
      toast.error("Select at least one channel to publish this agent.");
      return;
    }
    externalAgentStore.publish(agentId, [...selected]);
    toast.success(`"${agentName}" is now published.`);
    onPublished();
    onClose();
  };

  const confirmUnpublish = () => {
    externalAgentStore.publish(agentId, []);
    toast.success(`"${agentName}" was unpublished from all channels.`);
    setShowUnpublishConfirm(false);
    onPublished();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-border shadow-lg animate-fade-up flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h3 className="font-display text-base font-semibold">Publish "{agentName}"</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground shrink-0">
              <X size={14} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-1.5 overflow-y-auto">
            {PUBLISH_CHANNELS.map(ch => {
              const Icon = CHANNEL_ICONS[ch.id];
              const checked = selected.has(ch.id);
              return (
                <label
                  key={ch.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-base cursor-pointer ${
                    checked ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(ch.id)}
                    className="w-4 h-4 rounded accent-primary shrink-0"
                  />
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{ch.name}</span>
                </label>
              );
            })}
          </div>

          <div className="px-5 pb-1 shrink-0">
            <p className="text-xs text-muted-foreground">
              {selected.size > 0 ? `Publishing to ${selected.size} channel${selected.size > 1 ? "s" : ""}` : "No channels selected"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">
              Cancel
            </button>
            <button onClick={doPublish} className="btn-primary h-9">
              Publish
            </button>
          </div>
        </div>
      </div>

      <UnpublishExternalAgentDialog
        name={agentName}
        open={showUnpublishConfirm}
        onOpenChange={setShowUnpublishConfirm}
        onConfirm={confirmUnpublish}
      />
    </>
  );
}
