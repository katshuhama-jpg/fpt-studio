import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { knowledgeBaseStore, CURRENT_USER, type Sharing, type SharingMode } from "./knowledgeBaseStore";
import MemberPicker from "./MemberPicker";

const NAME_MAX = 50;
const DESC_MAX = 256;

const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được kho này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

type TestState = "idle" | "testing" | "success" | "failure";

function isValidHttpsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ConnectExternalKnowledgeBaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [sharingMode, setSharingMode] = useState<SharingMode>("private");
  const [people, setPeople] = useState<Sharing["people"]>([]);
  const [endpointTouched, setEndpointTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [testState, setTestState] = useState<TestState>("idle");
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = name.trim();
  const endpointValid = endpoint.trim().length > 0 && isValidHttpsUrl(endpoint.trim());
  const endpointError = endpointTouched && endpoint.trim().length > 0
    ? !endpoint.trim().toLowerCase().startsWith("https://")
      ? "Vui lòng dùng đường dẫn https:// để đảm bảo an toàn dữ liệu."
      : !endpointValid
        ? "Đường dẫn API chưa đúng định dạng. Ví dụ: https://api.example.com/v1/retrieve"
        : null
    : null;

  const canTest = endpointValid && apiKey.trim().length > 0;
  const canSubmit = trimmedName.length > 0 && trimmedName.length <= NAME_MAX && endpointValid && apiKey.trim().length > 0
    && (sharingMode !== "specific" || people.length > 0);

  const runTest = (): Promise<boolean> =>
    new Promise(resolve => {
      setTestState("testing");
      setTimeout(() => {
        // Deterministic mock: a key containing "invalid" fails, everything else passes.
        const ok = !apiKey.toLowerCase().includes("invalid");
        setTestState(ok ? "success" : "failure");
        resolve(ok);
      }, 900);
    });

  const submit = async () => {
    setEndpointTouched(true);
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (testState !== "success") {
      const ok = await runTest();
      if (!ok) return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const sharing: Sharing = { mode: sharingMode, people: sharingMode === "specific" ? people : [] };
      knowledgeBaseStore.create({
        name: trimmedName, description: description.trim(), type: "external_api",
        sharing, apiEndpoint: endpoint.trim(), hasApiKey: true,
      });
      toast.success(`Đã kết nối kho tri thức "${trimmedName}".`);
      setSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Kết nối kho tri thức ngoài</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <p className="text-sm text-muted-foreground">Kết nối tới một kho tri thức có sẵn qua API. Nội dung không được sao chép về hệ thống.</p>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Tên hiển thị <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </div>
            <input
              value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Mô tả</label>
              <span className="text-xs text-muted-foreground">{description.length}/{DESC_MAX}</span>
            </div>
            <textarea
              rows={2} maxLength={DESC_MAX} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">API Endpoint <span className="text-destructive">*</span></label>
            <input
              value={endpoint}
              onChange={e => { setEndpoint(e.target.value); setTestState("idle"); }}
              onBlur={() => setEndpointTouched(true)}
              placeholder="https://api.example.com/v1/retrieve"
              className={`w-full h-10 px-3 rounded-lg border bg-white text-sm font-mono outline-none focus:ring-2 transition-base ${
                endpointError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
              }`}
            />
            {endpointError && <p className="text-xs text-destructive mt-1">{endpointError}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">API Key <span className="text-destructive">*</span></label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setTestState("idle"); }}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-border bg-white text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
              />
              <button
                type="button" onClick={() => setShowKey(v => !v)} aria-label={showKey ? "Ẩn API Key" : "Hiện API Key"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-base"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quyền truy cập</label>
            <div className="space-y-2">
              {SHARING_OPTIONS.map(opt => {
                const selected = sharingMode === opt.value;
                return (
                  <div key={opt.value}>
                    <div
                      onClick={() => setSharingMode(opt.value)}
                      className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
                        selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{opt.label}</div>
                        {opt.helper && <div className="text-xs text-muted-foreground mt-0.5">{opt.helper}</div>}
                      </div>
                    </div>
                    {selected && opt.value === "specific" && (
                      <div className="mt-2 pl-3.5">
                        <MemberPicker value={people} onChange={setPeople} ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }} />
                        {submitAttempted && sharingMode === "specific" && people.length === 0 && (
                          <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={!canTest || testState === "testing"}
              onClick={() => void runTest()}
              className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Kiểm tra kết nối
            </button>
            {testState === "testing" && (
              <p className="flex items-center gap-1.5 text-xs text-info mt-2"><Loader2 size={12} className="animate-spin" /> Đang kiểm tra kết nối...</p>
            )}
            {testState === "success" && (
              <p className="flex items-center gap-1.5 text-xs text-success mt-2"><Check size={12} /> Kết nối thành công. Đã nhận được phản hồi từ API.</p>
            )}
            {testState === "failure" && (
              <div className="mt-2">
                <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle size={12} /> Chưa kết nối được. Kiểm tra lại API Endpoint và API Key.</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">HTTP 401 · Unauthorized</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button
            onClick={() => void submit()}
            disabled={!canSubmit || submitting || testState === "testing"}
            className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Kết nối
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
