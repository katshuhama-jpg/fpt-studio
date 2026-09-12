// Fixed catalog of built-in connectors an Agent can attach directly (Gmail, Drive, Sheets, ...).
// This file used to also export a standalone "Connections" tab component for Agent Details —
// that tab was removed (the real product has no equivalent left-nav tab; Connector management
// now lives only at Console, on WorkspaceConnectors.tsx, and inside an Agent's Instructions tab,
// via ConnectorsInner in AgentBuilder.tsx). Kept as a data-only module because
// TriggerBlockedByConnectorNotice.tsx and TriggerFormDialog.tsx still resolve a connector's
// display name from this same catalog when explaining why a trigger is blocked.
export const CATALOG = [
  { id: "gmail", name: "Gmail", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg", desc: "Search, create, and manage emails on this agent's behalf." },
  { id: "gdrive", name: "Google Drive", logo: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg", desc: "Search and retrieve files and folders from Drive." },
  { id: "sheets", name: "Google Sheets", logo: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Google_Sheets_2020_Logo.svg", desc: "Read and write rows, ranges, and formulas." },
  { id: "slack", name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg", desc: "Read channels, send messages, and search conversations." },
  { id: "notion", name: "Notion", logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png", desc: "Read, create, and update pages and databases." },
  { id: "hubspot", name: "HubSpot", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg", desc: "Query and update contacts, deals, and companies in your CRM." },
];
