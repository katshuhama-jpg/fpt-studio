import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { customConnectorStore, type ConnectorAuthType, type ConnectorHeader, type CustomConnector } from "./customConnectorStore";
import { type SharingMode, type SharedPerson, type Sharing } from "./customConnectorSharing";
import CustomConnectorMemberPicker from "./CustomConnectorMemberPicker";

const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được custom connector này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

const AUTH_OPTIONS: { value: ConnectorAuthType; label: string }[] = [
  { value: "none", label: "No authentication" },
  { value: "static_headers", label: "Static Headers" },
];

/** "Add custom MCP" — the one creation form for a Custom Connector, opened both from the Console
 * Connectors page ("Custom Connectors" tab) and inline from an Agent's own "+ Thêm Connector"
 * picker (Dùng chung scope only), mirroring the dual creation entry points already established
 * for Knowledge/Guardrails/Skills. Field set and copy mirror the real product's own "Add custom
 * MCP" modal (console-agents.fpt.ai/connectors) — Name / URL / Authentication, with OAuth 2.1
 * shown as "Soon" since the real product hasn't shipped it either. The one addition beyond the
 * real product: "Ai có quyền truy cập" at the bottom, since the real product currently has no
 * ownership/sharing concept at all for Custom Connectors (private-by-default + explicit Console
 * share, same as Knowledge, per the approved design). */
export default function AddCustomConnectorModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (connector: CustomConnector) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<ConnectorAuthType>("none");
  const [headers, setHeaders] = useState<ConnectorHeader[]>([{ key: "", value: "" }]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [sharingMode, setSharingMode] = useState<SharingMode>("private");
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const duplicateName = name.trim() !== "" && customConnectorStore.isDuplicateName(name);
  const peopleError = sharingMode === "specific" && people.length === 0;
  const canSubmit = !!name.trim() && !!url.trim() && !duplicateName && !peopleError;

  const setHeaderField = (i: number, field: "key" | "value", v: string) =>
    setHeaders(hs => hs.map((h, idx) => (idx === i ? { ...h, [field]: v } : h)));
  const removeHeader = (i: number) => setHeaders(hs => hs.filter((_, idx) => idx !== i));
  const toggleReveal = (i: number) =>
    setRevealed(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const submit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const sharing: Sharing = { mode: sharingMode, people: sharingMode === "specific" ? people : [] };
    const connector = customConnectorStore.create({
      name: name.trim(), url: url.trim(), authType,
      headers: headers.filter(h => h.key.trim()), sharing,
    });
    onCreated(connector);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-up">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Add custom MCP</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Connect an MCP server to give your agents its tools.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-mcp-server"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
            />
            {duplicateName && <p className="text-xs text-destructive mt-1.5">Đã có custom connector với tên này.</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">URL <span className="text-destructive">*</span></label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.example.com/mcp"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Authentication</label>
            <div className="space-y-2">
              {AUTH_OPTIONS.map(opt => {
                const selected = authType === opt.value;
                return (
                  <div key={opt.value}>
                    <div
                      onClick={() => setAuthType(opt.value)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
                        selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-border"}`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    {selected && opt.value === "static_headers" && (
                      <div className="mt-2 pl-3.5 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground block">Headers (optional)</label>
                        {headers.map((h, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              value={h.key}
                              onChange={e => setHeaderField(i, "key", e.target.value)}
                              placeholder="Authorization"
                              className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base"
                            />
                            <div className="relative flex-1">
                              <input
                                type={revealed.has(i) ? "text" : "password"}
                                value={h.value}
                                onChange={e => setHeaderField(i, "value", e.target.value)}
                                placeholder="Bearer ..."
                                className="w-full h-9 pl-2.5 pr-8 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base"
                              />
                              <button type="button" onClick={() => toggleReveal(i)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {revealed.has(i) ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                            <button type="button" onClick={() => removeHeader(i)} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-destructive transition-base">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setHeaders(hs => [...hs, { key: "", value: "" }])}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Plus size={12} /> Add header
                        </button>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Optional shared key for the whole workspace. Leave empty to let each person connect their own in Workspace.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border opacity-45 cursor-not-allowed">
                <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                <span className="text-sm font-medium">OAuth 2.1 (Auto) · Soon</span>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border opacity-45 cursor-not-allowed">
                <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                <span className="text-sm font-medium">OAuth 2.1 (Manual) · Soon</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Use static headers (e.g. an API key) to authenticate. OAuth 2.1 is coming soon.</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ai có quyền truy cập</label>
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
                        <CustomConnectorMemberPicker
                          value={people}
                          onChange={setPeople}
                          ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }}
                        />
                        {peopleError && submitAttempted && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
          <button onClick={submit} disabled={!canSubmit} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed">
            Save server
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
