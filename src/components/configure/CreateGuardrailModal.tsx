import { useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { ActionKind, Guardrail } from "./guardrailConsoleStore";
import { type SharingMode, type SharedPerson } from "./guardrailSharing";
import GuardrailMemberPicker from "./GuardrailMemberPicker";

const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được guardrail này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

type ResponseKind = "auto" | "fixed" | null;

export interface CreateGuardrailData {
  name: string; desc: string; action: ActionKind; allAgents: boolean; enabled: boolean;
  ownerId: string; ownerName: string; sharing: { mode: SharingMode; people: SharedPerson[] };
}

/** THE ONE guardrail creation/edit/view form product-wide — used by the Console /guardrails
 * page and every Agent's Guardrails tab, so there is exactly one guardrail data model and one
 * creation form anywhere a guardrail gets created or edited. */
export default function CreateGuardrailModal({ onClose, onSubmit, initialData, currentUser, readOnly }: {
  onClose: () => void;
  onSubmit: (g: CreateGuardrailData) => void;
  initialData?: Guardrail;
  currentUser: { id: string; name: string; email: string };
  /** Opened for a view-only shared guardrail — every field is inert and there's no primary
   * button, just "Đóng". */
  readOnly?: boolean;
}) {
  const isEdit = !!initialData;
  const actionToResponse = (a?: ActionKind): ResponseKind => {
    if (a === "Autogenerate response") return "auto";
    if (a === "Custom response") return "fixed";
    return null;
  };
  const [topic, setTopic]       = useState(initialData?.name ?? "");
  const [desc, setDesc]         = useState(initialData?.desc ?? "");
  const [samples, setSamples]   = useState("");
  const [response, setResponse] = useState<ResponseKind>(actionToResponse(initialData?.action));
  const [fixedText, setFixedText] = useState("");
  const [allAgents, setAllAgents] = useState(initialData?.allAgents ?? false);
  const [sharingMode, setSharingMode] = useState<SharingMode>(initialData?.sharing?.mode ?? "private");
  const [people, setPeople] = useState<SharedPerson[]>(initialData?.sharing?.people ?? []);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const actionFromResponse = (): ActionKind => {
    if (response === "auto")  return "Autogenerate response";
    if (response === "fixed") return "Custom response";
    return "Autogenerate response";
  };

  const peopleError = sharingMode === "specific" && people.length === 0;
  const canSubmit = !!topic.trim() && !peopleError;

  const submit = () => {
    setSubmitAttempted(true);
    if (readOnly || !canSubmit) return;
    onSubmit({
      name: topic.trim(), desc: desc.trim(), action: actionFromResponse(), allAgents,
      enabled: initialData?.enabled ?? true,
      ownerId: initialData?.ownerId ?? currentUser.id,
      ownerName: initialData?.ownerName ?? currentUser.name,
      sharing: { mode: sharingMode, people: sharingMode === "specific" ? people : [] },
    });
    onClose();
  };

  const responseOptions: { key: ResponseKind; title: string; desc: string }[] = [
    { key: "auto",  title: "Autogenerate response",                 desc: "Agent automatically rewrites responses based on your instructions." },
    { key: "fixed", title: "Custom response", desc: "Agent replies using the exact text you provide." },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{animation:"fadeScaleIn 0.18s ease"}}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">{readOnly ? initialData?.name : isEdit ? "Edit Guardrail" : "Create Guardrail"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{readOnly ? "Bạn chỉ có quyền xem guardrail này." : "Define the rule and choose how the agent responds."}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5"><HugeiconsIcon icon={Cancel01Icon} size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-4">Define the rule</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
                  <span className="text-xs text-muted-foreground">{topic.length}/100</span>
                </div>
                <input
                  autoFocus={!readOnly}
                  disabled={readOnly}
                  maxLength={100}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base disabled:bg-surface-muted disabled:text-muted-foreground"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                  <span className="text-xs text-muted-foreground">{desc.length}/800</span>
                </div>
                <textarea
                  disabled={readOnly}
                  maxLength={800}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none disabled:bg-surface-muted disabled:text-muted-foreground"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Samples</label>
                  <span className="text-xs text-muted-foreground">{samples.length}/2000</span>
                </div>
                <p className="text-xs text-primary mb-1.5 italic">Tip: Each sample must be separated by a line break.</p>
                <textarea
                  disabled={readOnly}
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none disabled:bg-surface-muted disabled:text-muted-foreground"
                  value={samples}
                  onChange={e => setSamples(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Response</h3>
            <p className="text-xs text-muted-foreground mb-4">Choose what the agent does when this rule triggers.</p>
            <div className="space-y-3">
              {responseOptions.map(opt => {
                const selected = response === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => !readOnly && setResponse(opt.key)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-base ${readOnly ? "cursor-default" : "cursor-pointer"} ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-base ${
                      selected ? "border-primary" : "border-border"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{opt.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      {selected && opt.key === "fixed" && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold mb-1.5">Fixed paragraph <span className="text-destructive">*</span></label>
                          <div className="relative">
                            <textarea
                              disabled={readOnly}
                              rows={4}
                              maxLength={300}
                              placeholder="Write the exact reply the agent should send."
                              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none disabled:bg-surface-muted disabled:text-muted-foreground"
                              value={fixedText}
                              onChange={e => { e.stopPropagation(); setFixedText(e.target.value); }}
                              onClick={e => e.stopPropagation()}
                            />
                            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{fixedText.length}/300</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <label className={`mt-3 flex items-center gap-2.5 select-none ${readOnly ? "" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={allAgents}
                onChange={e => setAllAgents(e.target.checked)}
                className="w-4 h-4 accent-primary shrink-0"
              />
              <div>
                <span className="text-sm font-medium">Apply for all agents</span>
                <p className="text-xs text-muted-foreground">This guardrail will be assigned to every agent in the workspace.</p>
              </div>
            </label>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quyền truy cập</label>
            <div className="space-y-2">
              {SHARING_OPTIONS.map(opt => {
                const selected = sharingMode === opt.value;
                return (
                  <div key={opt.value}>
                    <div
                      onClick={() => !readOnly && setSharingMode(opt.value)}
                      className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border transition-base ${readOnly ? "cursor-default" : "cursor-pointer"} ${
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
                        {readOnly ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 px-1 py-1.5 text-sm">
                              <span className="font-medium">{initialData?.ownerName ?? currentUser.name}</span>
                              <span className="text-xs text-muted-foreground">Chủ sở hữu</span>
                            </div>
                            {people.map(p => (
                              <div key={p.userId} className="flex items-center justify-between gap-2.5 px-1 py-1.5 text-sm">
                                <span className="font-medium truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{p.access === "edit" ? "Có thể chỉnh sửa" : "Có thể xem"}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <GuardrailMemberPicker
                              value={people}
                              onChange={setPeople}
                              ownerRow={{ name: initialData?.ownerName ?? currentUser.name, email: initialData?.ownerId === currentUser.id || !initialData ? currentUser.email : "" }}
                            />
                            {peopleError && submitAttempted && (
                              <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-white">
          {readOnly ? (
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base ml-auto">Đóng</button>
          ) : (
            <>
              <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
              <button onClick={submit} disabled={!topic.trim()} className="h-9 px-6 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed">
                {isEdit ? "Save changes" : "Create guardrail"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>,
    document.body
  );
}
