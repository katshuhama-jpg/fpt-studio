// In-memory connected-account store for the External-trigger "Connected accounts" step.
import type { ExternalApp } from "./triggerStore";

export interface ConnectedAccount {
  id: string;
  app: ExternalApp;
  email: string;
  connectedAt: number;
  expired?: boolean;
}

const now = Date.now();
const store: ConnectedAccount[] = [
  { id: "acct-gmail-1", app: "gmail", email: "automation@fpt.com.vn", connectedAt: now - 86_400_000 * 30 },
  { id: "acct-gdrive-1", app: "gdrive", email: "tudq1989@gmail.com", connectedAt: now - 86_400_000 * 20 },
  { id: "acct-teams-1", app: "teams", email: "workspace@fptsmartcloud.com", connectedAt: now - 86_400_000 * 60, expired: true },
];

export const connectedAccountStore = {
  list(app: ExternalApp): ConnectedAccount[] {
    return store.filter(a => a.app === app).sort((a, b) => b.connectedAt - a.connectedAt);
  },
  get(id: string): ConnectedAccount | undefined {
    return store.find(a => a.id === id);
  },
  connect(app: ExternalApp, email: string): ConnectedAccount {
    const acct: ConnectedAccount = { id: `acct-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, app, email, connectedAt: Date.now() };
    store.push(acct);
    return acct;
  },
  reconnect(id: string): ConnectedAccount | undefined {
    const acct = store.find(a => a.id === id);
    if (acct) acct.expired = false;
    return acct;
  },
};
