import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { credentialStore, type CredentialAuthType, type CredentialRecord } from "./credentialStore";

const NAME_MAX = 50;

const AUTH_TYPE_LABEL: Record<CredentialAuthType, string> = {
  bearer: "Bearer Token",
  basic: "Basic Auth",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  authType: CredentialAuthType;
  onCreated: (rec: CredentialRecord) => void;
}

export default function CreateCredentialDialog({ open, onOpenChange, authType, onCreated }: Props) {
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; token?: string; username?: string; password?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName("");
    setToken("");
    setUsername("");
    setPassword("");
    setErrors({});
  }, [open]);

  const submit = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "The name is required";
    else if (name.trim().length > NAME_MAX) e.name = `Name must be ≤ ${NAME_MAX} characters`;
    else if (credentialStore.isDuplicateName(name)) e.name = "A credential with this name already exists";
    if (authType === "bearer" && !token.trim()) e.token = "The token is required";
    if (authType === "basic" && !username.trim()) e.username = "The Username is required";
    if (authType === "basic" && !password.trim()) e.password = "The password is required";
    setErrors(e);
    if (Object.keys(e).length) return;

    const rec = credentialStore.create({
      name: name.trim(),
      authType,
      ...(authType === "bearer" ? { token: token.trim() } : { username: username.trim(), password: password.trim() }),
    });
    toast.success("Credential created");
    onCreated(rec);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">Create credential</DialogTitle>
          <DialogDescription>Add credentials so your Agent can securely access external services.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium flex items-center justify-between mb-1.5">
              <span>Credential name <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </label>
            <div className="relative">
              <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={name}
                onChange={e => { setName(e.target.value); if (errors.name) setErrors(er => ({ ...er, name: undefined })); }}
                placeholder="Enter credential name"
                className={`w-full h-9 pl-8 pr-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                  errors.name ? "border-destructive" : "border-border focus:border-primary"
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block">Auth type <span className="text-destructive">*</span></label>
            <select disabled value={authType} className="ds-input h-9 opacity-60 cursor-not-allowed">
              <option value={authType}>{AUTH_TYPE_LABEL[authType]}</option>
            </select>
          </div>

          {authType === "bearer" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block">Token <span className="text-destructive">*</span></label>
              <input
                type="password"
                value={token}
                onChange={e => { setToken(e.target.value); if (errors.token) setErrors(er => ({ ...er, token: undefined })); }}
                placeholder="Enter token"
                className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                  errors.token ? "border-destructive" : "border-border focus:border-primary"
                }`}
              />
              {errors.token && <p className="mt-1 text-[11px] text-destructive">{errors.token}</p>}
            </div>
          )}

          {authType === "basic" && (
            <>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Username <span className="text-destructive">*</span></label>
                <input
                  value={username}
                  onChange={e => { setUsername(e.target.value); if (errors.username) setErrors(er => ({ ...er, username: undefined })); }}
                  placeholder="Enter username"
                  className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                    errors.username ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
                {errors.username && <p className="mt-1 text-[11px] text-destructive">{errors.username}</p>}
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Password <span className="text-destructive">*</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(er => ({ ...er, password: undefined })); }}
                  placeholder="Enter password"
                  className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                    errors.password ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
                {errors.password && <p className="mt-1 text-[11px] text-destructive">{errors.password}</p>}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Cancel
          </button>
          <button type="button" onClick={submit} className="btn-primary h-9 px-4">
            Create credential
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
