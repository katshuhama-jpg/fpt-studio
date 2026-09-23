// sessionStorage-backed WORKSPACE-level registry of Shared connector accounts — the accounts
// authorised once and then reused by any agent in the workspace ("một tài khoản dùng chung cho
// cả workspace"). Deliberately separate from agentConnectorStore.ts, which only records WHICH
// account a given agent picked: the account itself outlives any single agent, which is exactly
// why connecting Gmail on a second agent can offer the account a first agent already authorised.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export interface SharedConnectorAccount {
  id: string;
  connectorId: string;
  /** The authenticated account, shown verbatim as "Connected as <email>". */
  email: string;
  connectedAt: number;
  /** Display name of whoever ran the OAuth flow — the account is shared, but it's still useful
   * to see who put it there when several exist for one connector. */
  connectedBy: string;
}

const STORE_KEY = "shared_connector_accounts_v1";
const SEEDED_KEY = "shared_connector_accounts_seeded_v1";
const store = loadMap<string, SharedConnectorAccount>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

/** Seeded so all three connect cases are reachable without setup: Slack has two accounts (the
 * dropdown case), Gmail has one (the "use this / connect a different one" case), and every
 * other connector has none (the straight-to-OAuth case). */
function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (a: SharedConnectorAccount) => store.set(a.id, a);
  put({ id: "sa-gmail-1", connectorId: "gmail", email: "trangnh47@fpt.com", connectedAt: now - 12 * DAY, connectedBy: "Nguyễn Huyền Trang" });
  put({ id: "sa-slack-1", connectorId: "slack", email: "workspace-bot@fpt.com", connectedAt: now - 30 * DAY, connectedBy: "Tran Nam" });
  put({ id: "sa-slack-2", connectorId: "slack", email: "support@fpt.com", connectedAt: now - 5 * DAY, connectedBy: "Nguyễn Huyền Trang" });
  persist();
}

export const sharedConnectorAccountStore = {
  /** Every Shared account the workspace has authorised for this connector, oldest first so the
   * long-standing account stays at the top of the picker rather than jumping around. */
  listForConnector(connectorId: string): SharedConnectorAccount[] {
    seed();
    return [...store.values()]
      .filter(a => a.connectorId === connectorId)
      .sort((a, b) => a.connectedAt - b.connectedAt);
  },
  get(accountId: string): SharedConnectorAccount | undefined {
    seed();
    return store.get(accountId);
  },
  /** Records the account an OAuth run just authorised. Re-authorising an email that already
   * exists for this connector returns the existing record instead of creating a duplicate —
   * two identical rows in the account dropdown would be indistinguishable to the user. */
  add(connectorId: string, email: string, connectedBy: string): SharedConnectorAccount {
    seed();
    const trimmed = email.trim();
    const existing = [...store.values()].find(
      a => a.connectorId === connectorId && a.email.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const account: SharedConnectorAccount = {
      id: `sa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      connectorId,
      email: trimmed,
      connectedAt: Date.now(),
      connectedBy,
    };
    store.set(account.id, account);
    persist();
    return account;
  },
};
