import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { credentialStore, type CredentialAuthType, type CredentialRecord } from "./credentialStore";

const NAME_MAX = 50;
const SECRET_MIN = 8;
const SECRET_MAX = 512;

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
    if (!name.trim()) e.name = "Vui lòng nhập tên credential.";
    else if (name.trim().length > NAME_MAX) e.name = `Tên credential không quá ${NAME_MAX} ký tự.`;
    else if (credentialStore.isDuplicateName(name)) e.name = "Tên credential này đã tồn tại. Hãy đặt tên khác.";
    if (authType === "bearer") {
      const len = token.trim().length;
      if (!len) e.token = "Vui lòng nhập token.";
      else if (len < SECRET_MIN || len > SECRET_MAX) e.token = `Token phải có từ ${SECRET_MIN} đến ${SECRET_MAX} ký tự.`;
    }
    if (authType === "basic") {
      if (!username.trim()) e.username = "Vui lòng nhập username.";
      const len = password.trim().length;
      if (!len) e.password = "Vui lòng nhập password.";
      else if (len < SECRET_MIN || len > SECRET_MAX) e.password = `Password phải có từ ${SECRET_MIN} đến ${SECRET_MAX} ký tự.`;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    const rec = credentialStore.create({
      name: name.trim(),
      authType,
      ...(authType === "bearer" ? { token: token.trim() } : { username: username.trim(), password: password.trim() }),
    });
    toast.success("Đã tạo credential.");
    onCreated(rec);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">Tạo credential mới</DialogTitle>
          <DialogDescription>Thêm credential để agent truy cập an toàn vào dịch vụ bên ngoài.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium flex items-center justify-between mb-1.5">
              <span>Tên credential <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-mono text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </label>
            <div className="relative">
              <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={name}
                onChange={e => { setName(e.target.value); if (errors.name) setErrors(er => ({ ...er, name: undefined })); }}
                placeholder="Nhập tên credential"
                className={`w-full h-9 pl-8 pr-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                  errors.name ? "border-destructive" : "border-border focus:border-primary"
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block">Loại xác thực <span className="text-destructive">*</span></label>
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
                placeholder="Nhập token"
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
                  placeholder="Nhập username"
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
                  placeholder="Nhập password"
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
            Huỷ
          </button>
          <button type="button" onClick={submit} className="btn-primary h-9 px-4">
            Tạo credential
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
