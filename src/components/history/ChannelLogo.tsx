import { HugeiconsIcon } from "@hugeicons/react";
import { CHANNEL_META, type ConversationChannel } from "./historyStore";

/** Small square badge — brand icon (via HugeiconsIcon) or a colored text mark for channels with no icon match. */
export default function ChannelLogo({ channel, size = 20 }: { channel: ConversationChannel; size?: number }) {
  const meta = CHANNEL_META[channel];
  return (
    <span
      className="inline-flex items-center justify-center rounded-md bg-white border border-border shrink-0"
      style={{ width: size, height: size, color: meta.color }}
    >
      {meta.icon ? (
        <HugeiconsIcon icon={meta.icon} size={Math.round(size * 0.62)} />
      ) : (
        <span className="font-bold leading-none" style={{ fontSize: Math.round(size * 0.32) }}>{meta.textBadge}</span>
      )}
    </span>
  );
}
