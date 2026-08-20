// In-memory credential store for the Webhook-trigger authentication prototype.
export type CredentialAuthType = "bearer" | "basic";

export interface CredentialRecord {
  id: string;
  name: string;
  authType: CredentialAuthType;
  token?: string;      // authType === "bearer"
  username?: string;   // authType === "basic"
  password?: string;   // authType === "basic"
  createdAt: number;
}

const store: CredentialRecord[] = [];

export const credentialStore = {
  list(authType?: CredentialAuthType): CredentialRecord[] {
    return (authType ? store.filter(c => c.authType === authType) : [...store])
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  isDuplicateName(name: string): boolean {
    return store.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  },
  create(data: Omit<CredentialRecord, "id" | "createdAt">): CredentialRecord {
    const rec: CredentialRecord = {
      ...data,
      id: `cred-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    store.push(rec);
    return rec;
  },
};
