import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CircleArrowReload01Icon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { agentCapabilityStore } from "./agentCapabilityStore";
import { handoffStore, channelName } from "./handoffStore";

const HANDOFF = "handoff";

/** Build › Cài đặt nâng cao › Khả năng của Nhân sự số. Every capability is listed in full; switches
 * edit a draft, and "Lưu thay đổi" only appears once the draft differs from what's saved.
 * "Khôi phục mặc định" puts the draft back to the defaults (the nine on, "Chuyển cho nhân viên"
 * off) — still to be saved. */
export default function CapabilitiesEditor({ agentId }: { agentId: string }) {
  const [, setParams] = useSearchParams();
  const capabilities = agentCapabilityStore.list();
  const readSaved = () => ({
    ...Object.fromEntries(capabilities.map(c => [c.id, agentCapabilityStore.isOn(agentId, c.id)])),
    [HANDOFF]: handoffStore.capabilityOn(agentId),
  }) as Record<string, boolean>;
  const [saved, setSaved] = useState(readSaved);
  const [draft, setDraft] = useState(saved);
  const defaults = useMemo(() => ({ ...Object.fromEntries(capabilities.map(c => [c.id, true])), [HANDOFF]: false }) as Record<string, boolean>, [capabilities]);

  const same = (a: Record<string, boolean>, b: Record<string, boolean>) => Object.keys(a).every(k => a[k] === b[k]);
  const dirty = !same(draft, saved);
  const atDefault = same(draft, defaults);
  const onCount = capabilities.filter(c => draft[c.id]).length;
  const set = (id: string, v: boolean) => setDraft(d => ({ ...d, [id]: v }));

  const save = () => {
    for (const c of capabilities) agentCapabilityStore.setOn(agentId, c.id, draft[c.id]);
    handoffStore.setCapability(agentId, draft[HANDOFF]);
    const next = readSaved();
    setSaved(next);
    setDraft(next);
    toast.success("Đã lưu thay đổi.");
  };

  const conn = handoffStore.connection(agentId);
  const active = handoffStore.activeChannels(agentId);
  const handoffStatus = active.length && conn
    ? `Đang hoạt động trên: ${active.map(channelName).join(", ")} (EOS Contact Center)`
    : conn ? "Đã liên kết EOS Contact Center theo tài khoản của bạn, chưa bật kênh nào." : "Tài khoản của bạn chưa có EOS Contact Center.";

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Khả năng của Nhân sự số</h2>
          <span className="text-xs font-medium tabular-nums rounded-sm px-1.5 py-0.5 bg-muted text-muted-foreground">{onCount}/{capabilities.length}</span>
          {dirty && <span className="text-xs text-muted-foreground">· Có thay đổi chưa lưu</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={atDefault} title={atDefault ? "Đang ở cấu hình mặc định." : undefined} onClick={() => setDraft(defaults)}>
            <HugeiconsIcon icon={CircleArrowReload01Icon} size={16} strokeWidth={1.5} /> Khôi phục mặc định
          </Button>
          {dirty && (
            <Button type="button" size="sm" onClick={save}>
              <HugeiconsIcon icon={FloppyDiskIcon} size={16} strokeWidth={1.5} /> Lưu thay đổi
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start gap-4 rounded-md border p-3.5">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium flex items-center gap-2 ${draft[HANDOFF] ? "" : "text-muted-foreground"}`}>
              Chuyển cho nhân viên
              <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Mới</span>
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">Cho phép Nhân sự số chuyển hội thoại cho nhân viên CSKH trên Contact Center khi không xử lý tiếp được hoặc khách muốn gặp người thật.</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {handoffStatus}{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setParams({ tab: "channels", ctab: "external" })}>Mở Kênh triển khai</button>
            </p>
            {!draft[HANDOFF] && active.length > 0 && (
              <p className="text-xs text-warning mt-1">Còn {active.length} kênh đang bật chuyển cho nhân viên — sẽ có cảnh báo khi Publish.</p>
            )}
          </div>
          <Switch checked={draft[HANDOFF]} onCheckedChange={v => set(HANDOFF, v)} aria-label="Chuyển cho nhân viên" className="shrink-0 mt-0.5" />
        </div>

        {capabilities.map(cap => (
          <div key={cap.id} className="flex items-start gap-4 rounded-md border p-3.5">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${draft[cap.id] ? "" : "text-muted-foreground"}`}>{cap.name}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{cap.description}</p>
            </div>
            <Switch checked={draft[cap.id]} onCheckedChange={v => set(cap.id, v)} aria-label={cap.name} className="shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
