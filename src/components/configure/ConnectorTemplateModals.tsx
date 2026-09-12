// Connect + Manage modals for pre-built "Connector Template" entries (FCI CRM/Member/Tickets) under
// Custom Connectors. Mirrors the real product's FCI CRM connect flow (named "Credential name" +
// credential fields) and FCI Member manage flow (Configure tab with a multi-account table + "Thêm
// account khác", Available permissions tab with Ask/Auto governance badges) — ported here because
// these internal systems moved out of Marketplace into Custom, but the real field/behaviour set
// should carry over unchanged.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  connectorTemplateStore, type ConnectorTemplateDef, type TemplateAccount,
} from "./connectorTemplateStore";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ─── Connect modal ──────────────────────────────────── */
export function ConnectorTemplateConnectModal({ template, onClose, onConnected }: {
  template: ConnectorTemplateDef; onClose: () => void; onConnected: () => void;
}) {
  const [credentialName, setCredentialName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!credentialName.trim()) e.credentialName = "Vui lòng nhập tên credential.";
    else if (connectorTemplateStore.isDuplicateCredentialName(template.id, credentialName)) {
      e.credentialName = "Tên credential này đã tồn tại. Hãy đặt tên khác.";
    }
    for (const f of template.fields) {
      if (!values[f.key]?.trim()) e[f.key] = `Vui lòng nhập ${f.label.toLowerCase()}.`;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    connectorTemplateStore.addAccount(template.id, credentialName);
    toast.success(`Đã kết nối ${template.name}.`);
    onConnected();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[460px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-up">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <h2 className="font-display text-lg font-semibold">Kết nối {template.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{template.helperNote}</p>

          <div>
            <label className="text-xs font-medium mb-1.5 block">Tên credential <span className="text-destructive">*</span></label>
            <input
              autoFocus
              value={credentialName}
              onChange={e => { setCredentialName(e.target.value); if (errors.credentialName) setErrors(er => ({ ...er, credentialName: undefined })); }}
              placeholder="Vd: Team A token"
              className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                errors.credentialName ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {errors.credentialName && <p className="mt-1 text-[11px] text-destructive">{errors.credentialName}</p>}
          </div>

          {template.fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium mb-1.5 block">{f.label} <span className="text-destructive">*</span></label>
              <input
                type={f.type}
                value={values[f.key] ?? ""}
                onChange={e => { setValues(v => ({ ...v, [f.key]: e.target.value })); if (errors[f.key]) setErrors(er => ({ ...er, [f.key]: undefined })); }}
                placeholder={`Nhập ${f.label.toLowerCase()}`}
                className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                  errors[f.key] ? "border-destructive" : "border-border focus:border-primary"
                }`}
              />
              {errors[f.key] && <p className="mt-1 text-[11px] text-destructive">{errors[f.key]}</p>}
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground leading-relaxed">Giá trị header là thông tin bí mật — được lưu trữ an toàn và không chia sẻ với Agent.</p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Hủy</button>
          <button onClick={submit} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">Kết nối</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Manage modal ───────────────────────────────────── */
type ManageTab = "configure" | "permissions";

export function ConnectorTemplateManageModal({ template, onClose, onChanged }: {
  template: ConnectorTemplateDef; onClose: () => void; onChanged: () => void;
}) {
  const [tab, setTab] = useState<ManageTab>("configure");
  const [tick, setTick] = useState(0);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TemplateAccount | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const accounts = connectorTemplateStore.listAccounts(template.id);
  void tick;
  const refresh = () => setTick(t => t + 1);

  useEffect(() => {
    if (accounts.length === 0) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length]);

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-up">
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-display text-lg font-semibold">{template.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Connector template nội bộ</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-1 px-6 pt-3 border-b border-border shrink-0">
              {([
                { key: "configure" as ManageTab, label: "Cấu hình" },
                { key: "permissions" as ManageTab, label: `Quyền hạn khả dụng (${template.permissions.length})` },
              ]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 pb-3 text-sm font-medium border-b-2 -mb-px transition-base ${
                    tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >{t.label}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === "configure" ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">Các credential đang kết nối tới {template.name} trong workspace của bạn.</p>
                    <button
                      onClick={() => setShowAddAccount(true)}
                      className="h-8 px-3 rounded-lg border border-border hover:bg-surface-muted text-xs font-medium transition-base inline-flex items-center gap-1 shrink-0"
                    >
                      <Plus size={12} /> Thêm account khác
                    </button>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-muted text-[11px] text-muted-foreground uppercase tracking-wide">
                          <th className="text-left font-medium px-3 py-2">Tên credential</th>
                          <th className="text-left font-medium px-3 py-2">Người kết nối</th>
                          <th className="text-left font-medium px-3 py-2">Ngày kết nối</th>
                          <th className="text-left font-medium px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map(a => (
                          <tr key={a.id} className="border-t border-border">
                            <td className="px-3 py-2 font-medium">{a.credentialName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.connectedByName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatDate(a.connectedAt)}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Đang hoạt động
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => setRemoveTarget(a)}
                                aria-label="Xóa credential"
                                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-base"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">Bạn sẽ cấu hình chế độ cho từng quyền cụ thể sau khi gắn connector này vào một Agent.</p>
                  {template.permissions.map(p => (
                    <div key={p.name} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-surface">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.mode === "ask" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"
                      }`}>
                        {p.mode === "ask" ? "Ask" : "Auto"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => setConfirmDisconnect(true)} className="h-9 px-4 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 text-sm font-medium transition-base">Ngắt kết nối</button>
              <button onClick={onClose} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">Đóng</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showAddAccount && (
        <ConnectorTemplateConnectModal
          template={template}
          onClose={() => setShowAddAccount(false)}
          onConnected={() => { setShowAddAccount(false); refresh(); onChanged(); }}
        />
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={v => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa credential "{removeTarget?.credentialName}"?</AlertDialogTitle>
            <AlertDialogDescription>Các Agent đang dùng credential này sẽ mất quyền truy cập {template.name} qua credential đó. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (removeTarget) { connectorTemplateStore.removeAccount(removeTarget.id); refresh(); onChanged(); } setRemoveTarget(null); }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ngắt kết nối {template.name}?</AlertDialogTitle>
            <AlertDialogDescription className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
              <span>Toàn bộ {accounts.length} credential đã kết nối sẽ bị xóa. Các Agent đang dùng {template.name} sẽ mất quyền truy cập ngay lập tức.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { connectorTemplateStore.disconnectAll(template.id); toast.success(`Đã ngắt kết nối ${template.name}.`); setConfirmDisconnect(false); onChanged(); onClose(); }}
            >
              Ngắt kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
