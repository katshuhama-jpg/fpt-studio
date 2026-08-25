// Shared channel catalogue — backs both the Publish modal's channel picker and the
// Channels tab (and any other place a channel needs a name/icon), so the two screens can
// never list different channels.
import {
  Globe02Icon, ApiIcon, MessengerIcon, WhatsappIcon, TelegramIcon,
} from "@hugeicons/core-free-icons";

export interface ChannelCatalogEntry {
  id: string; name: string; sub: string; group: "core" | "messaging";
  icon: any | null; color: string; logoUrl?: string;
  /** false = not wired to a real setup flow yet ("Sắp có" in the Publish modal's channel picker). Defaults to true. */
  available?: boolean;
}

export const CHANNEL_CATALOG: ChannelCatalogEntry[] = [
  { id: "web",       name: "Web widget", sub: "Web",       group: "core",      icon: Globe02Icon,  color: "text-foreground" },
  { id: "api",       name: "API",        sub: "API",       group: "core",      icon: ApiIcon,      color: "text-foreground" },
  { id: "zalo",      name: "Zalo",       sub: "Messaging", group: "messaging", icon: null,         color: "", available: false },
  { id: "messenger", name: "Messenger",  sub: "Messaging", group: "messaging", icon: MessengerIcon, color: "text-[#0084FF]", available: false },
  { id: "whatsapp",  name: "WhatsApp",   sub: "Messaging", group: "messaging", icon: WhatsappIcon,  color: "text-[#25D366]", available: false },
  { id: "telegram",  name: "Telegram",   sub: "Messaging", group: "messaging", icon: TelegramIcon,  color: "text-[#26A5E4]", available: false },
  { id: "slack",     name: "Slack",      sub: "Messaging", group: "messaging", icon: null,         color: "", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
];

export function getChannelName(id: string): string {
  return CHANNEL_CATALOG.find(c => c.id === id)?.name ?? id;
}
