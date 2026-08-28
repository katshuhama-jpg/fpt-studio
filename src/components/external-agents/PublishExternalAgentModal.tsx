import { useEffect, useState } from "react";
import { X, Globe, MessageCircle, Facebook, Slack, Users, Webhook, Building2 } from "lucide-react";
import { externalAgentStore, PUBLISH_CHANNELS } from "./externalAgentStore";
import { UnpublishExternalAgentDialog } from "./ExternalAgentDialogs";
import { toast } from "sonner";

const CHANNEL_ICONS: Record<string, any> = {
  web: Globe, zalo: MessageCircle, messenger: Facebook, slack: Slack, teams: Users, api: Webhook, workspace: Building2,
};

export default function PublishExternalAgentModal({ open, agentId, agentName, currentChannels, alreadyApproved, onClose, onPublished }: {
  open: boolean; agentId: string; agentName: string; currentChannels: string[];
  /** Whether this connection has already been approved — if not, confirming here sends the
   * connection for approval instead of publishing immediately. */
  alreadyApproved: boolean;
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
  // "Manage channels" mode (already published, already approved) allows dropping to zero
  // selected — that's how you unpublish from everything. A first-time publish/approval
  // request must have at least one channel selected.
  const manageMode = wasPublished && alreadyApproved;

  const doConfirm = () => {
    if (selected.size === 0) {
      if (manageMode) {
        setShowUnpublishConfirm(true);
        return;
      }
      return; // primary button is disabled at 0 selected outside manage mode
    }
    if (alreadyApproved) {
      externalAgentStore.publish(agentId, [...selected]);
      toast.success(`"${agentName}" is now published.`);
    } else {
      externalAgentStore.publishOrSubmit(agentId, [...selected]);
      toast.success("Sent for approval. We'll let you know once it's reviewed.");
    }
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
            <h3 className="font-display text-base font-semibold">{manageMode ? "Manage channels" : `Publish "${agentName}"`}</h3>
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
            <p className={`text-xs ${selected.size === 0 && !manageMode ? "text-warning" : "text-muted-foreground"}`}>
              {selected.size > 0
                ? `Publishing to ${selected.size} channel${selected.size > 1 ? "s" : ""}`
                : manageMode ? "No channels selected" : "Select at least one channel."}
            </p>
            {!alreadyApproved && selected.size > 0 && (
              <p className="text-xs text-muted-foreground mt-1">This connection hasn't been approved yet — confirming will send it for approval.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">
              Cancel
            </button>
            <button
              onClick={doConfirm}
              disabled={selected.size === 0 && !manageMode}
              className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none"
            >
              {manageMode ? "Save changes" : "Publish"}
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
