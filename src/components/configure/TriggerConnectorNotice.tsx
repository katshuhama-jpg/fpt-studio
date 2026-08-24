import { AlertTriangle } from "lucide-react";

/** Shared amber, non-blocking inline notice for the trigger↔personal-connector conflict —
 * one component, one string per direction, used everywhere this rule is communicated so the
 * wording can't drift between the Connect modal and the Triggers page. */
export default function TriggerConnectorNotice({ message, linkLabel, onLinkClick }: {
  message: string;
  linkLabel?: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-warning bg-[hsl(var(--warning-soft))] border border-warning/25 rounded-lg px-3 py-2.5">
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <p>
        {message}{" "}
        {onLinkClick && linkLabel && (
          <button type="button" onClick={onLinkClick} className="font-semibold hover:underline">
            {linkLabel}
          </button>
        )}
      </p>
    </div>
  );
}
