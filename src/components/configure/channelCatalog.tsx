// Shared channel catalogue — backs both the Publish modal's channel picker and the
// Channels tab (and any other place a channel needs a name/icon), so the two screens can
// never list different channels.
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon, ApiIcon, MessengerIcon, WhatsappIcon, TelegramIcon,
} from "@hugeicons/core-free-icons";

export interface ChannelCatalogEntry {
  id: string; name: string; sub: string; group: "core" | "messaging";
  icon: any | null; color: string; logoUrl?: string;
  /** false = not wired to a real setup flow yet ("Coming soon" in the Publish modal's channel picker). Defaults to true. */
  available?: boolean;
}

// Fixed order — the Publish modal and the Channels tab both render this list unfiltered,
// in this order, so they can never show a different set of channels from each other.
export const CHANNEL_CATALOG: ChannelCatalogEntry[] = [
  { id: "web",       name: "Web widget", sub: "Web",       group: "core",      icon: Globe02Icon,  color: "text-foreground" },
  { id: "api",       name: "API",        sub: "API",       group: "core",      icon: ApiIcon,      color: "text-foreground" },
  { id: "slack",     name: "Slack",      sub: "Messaging", group: "messaging", icon: null,         color: "", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
  { id: "zalo",      name: "Zalo",       sub: "Messaging", group: "messaging", icon: null,         color: "", available: false },
  { id: "messenger", name: "Messenger",  sub: "Messaging", group: "messaging", icon: MessengerIcon, color: "text-[#0084FF]", available: false },
  { id: "whatsapp",  name: "WhatsApp",   sub: "Messaging", group: "messaging", icon: WhatsappIcon,  color: "text-[#25D366]", available: false },
  { id: "telegram",  name: "Telegram",   sub: "Messaging", group: "messaging", icon: TelegramIcon,  color: "text-[#26A5E4]", available: false },
];

export function getChannelName(id: string): string {
  return CHANNEL_CATALOG.find(c => c.id === id)?.name ?? id;
}

/** Renders a catalog entry's icon — a HugeIcon, an external logo image, or (for entries with
 * neither, like Zalo) a small text fallback. Shared by the internal Agent's Publish modal /
 * Deploy tab and the External Agent's equivalents, so every channel row looks the same
 * wherever it's used. */
export function ChannelIcon({ ch, size = 16 }: { ch: ChannelCatalogEntry; size?: number }) {
  if (ch.icon) return <HugeiconsIcon icon={ch.icon} size={size} className={ch.color} />;
  if (ch.logoUrl) return <img src={ch.logoUrl} alt={ch.name} className="object-contain" style={{ width: size, height: size }} />;
  if (ch.id === "zalo") return <span className="text-[11px] font-bold" style={{ color: "#0068FF" }}>Zalo</span>;
  return <span className="text-[10px] font-bold text-muted-foreground">{ch.name[0]}</span>;
}
