import { useState } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon, HistoryIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CHANNEL_CATALOG, ChannelIcon, getChannelName } from "@/components/configure/channelCatalog";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { governanceStore, externalSnapOf } from "@/components/governance/governanceStore";
import { auditLogStore } from "@/components/governance/auditLogStore";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { externalAgentStore, type ExternalAgent } from "./externalAgentStore";

/** External Agent "Kênh triển khai" — same rules as the internal Agent's Channels tab: external
 * channels are their own publish scope (outside Agent Workspace), so switching one ON sends an
 * Org/Unit Admin request (kind "channels") whatever the Workspace scope is; switching one OFF
 * applies immediately. Live state is read from agentPublishStore (the shared publish model). */
export default function ExternalAgentChannelsTab({ agent, onRefresh, onViewVersions }: {
  agent: ExternalAgent; onRefresh: () => void; onViewVersions?: () => void;
}) {
  const [tick, setTick] = useState(0);
  void tick;
  const pub = agentPublishStore.get(agent.id);
  const isLive = pub.placement !== null && agent.status !== "paused";
  const channelRequest = governanceStore.getOpenRequestForResource("agent", agent.id, "channels");
  const pendingChannels = new Set(channelRequest?.channelsAdded ?? []);
  const [confirm, setConfirm] = useState<{ id: string; mode: "on" | "off" } | null>(null);
  const refresh = () => { setTick(t => t + 1); onRefresh(); };

  const requestOn = (id: string) => {
    governanceStore.submit({
      kind: "channels", channelsAdded: [id], channels: pub.channels,
      resourceType: "agent", resourceId: agent.id, resourceName: agent.name, resourceIcon: agent.emoji,
      requesterId: CURRENT_USER.id, requesterName: CURRENT_USER.name,
      audience: pub.audience === "community" ? "community" : pub.audience === "group" ? "group" : "org",
      scopeSummary: pub.scopeSummary, version: pub.version,
      note: `Bật kênh ${getChannelName(id)} cho bản đang live ${pub.version}.`,
      externalSnap: externalSnapOf(agent.id),
    });
    toast.success(`Đã gửi yêu cầu bật ${getChannelName(id)}. Kênh sẽ hoạt động khi Org/Unit Admin duyệt.`);
    refresh();
  };
  const turnOff = (id: string) => {
    const next = pub.channels.filter(c => c !== id);
    agentPublishStore.setChannels(agent.id, next);
    externalAgentStore.applyGovernance(agent.id, { channels: next }, `Tắt kênh ${getChannelName(id)}`);
    auditLogStore.log({
      actorId: CURRENT_USER.id, actorName: CURRENT_USER.name, action: "channel_off",
      resourceType: "agent", resourceId: agent.id, resourceName: agent.name, note: `Tắt kênh ${getChannelName(id)}`, at: Date.now(),
    });
    toast.success(`Đã tắt ${getChannelName(id)}. Agent không còn nhận tin nhắn từ kênh này.`);
    refresh();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-[1040px] mx-auto px-8 py-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={GridViewIcon} size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Kênh triển khai</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Agent đang chạy ở đâu và người dùng đang dùng phiên bản nào.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface flex items-center justify-between px-5 py-4 mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-10 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phiên bản đang chạy</p>
              <p className="text-base font-semibold font-mono">{isLive ? pub.version : "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Workspace</p>
              <p className="text-base font-semibold">{isLive ? (pub.scopeSummary ?? "Chỉ mình tôi") : agent.status === "paused" ? "Đang tạm dừng" : "Chưa publish"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Kênh đang live</p>
              <p className="text-base font-semibold">{isLive ? pub.channels.length : 0}</p>
            </div>
          </div>
          {onViewVersions && (
            <button onClick={onViewVersions} className="btn-secondary">
              <HugeiconsIcon icon={HistoryIcon} size={14} /> Xem phiên bản
            </button>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Kênh ngoài</h2>
          <div className="grid grid-cols-3 gap-3">
            {CHANNEL_CATALOG.map(ch => {
              const live = isLive && pub.channels.includes(ch.id);
              const pending = isLive && !live && pendingChannels.has(ch.id);
              const unavailable = !isLive || ch.available === false;
              return (
                <div key={ch.id} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left ${!unavailable ? "border-border bg-surface" : "border-border bg-surface-muted/40 opacity-70"}`}>
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                    <ChannelIcon ch={ch} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ch.name}</p>
                    <p className={`text-xs truncate ${live ? "text-success" : pending ? "text-warning" : "text-muted-foreground"}`}>
                      {ch.available === false ? "Sắp có" : !isLive ? "Publish Agent trước để bật kênh" : live ? `Live · ${pub.version}` : pending ? "Chờ duyệt bật kênh" : "Chưa bật"}
                    </p>
                  </div>
                  {!unavailable && (live ? (
                    <button onClick={() => setConfirm({ id: ch.id, mode: "off" })} className="h-7 px-2.5 rounded-md border border-border text-xs font-medium hover:bg-surface-muted shrink-0">Tắt</button>
                  ) : pending ? (
                    <Link to={`/governance/requests/${channelRequest!.id}`} target="_blank" rel="noopener noreferrer" className="h-7 px-2 rounded-md text-xs font-medium text-primary hover:bg-primary-soft flex items-center shrink-0">Xem yêu cầu</Link>
                  ) : (
                    <button onClick={() => setConfirm({ id: ch.id, mode: "on" })} className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shrink-0">Bật</button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.mode === "on" ? `Gửi yêu cầu bật ${confirm ? getChannelName(confirm.id) : ""}?` : `Tắt ${confirm ? getChannelName(confirm.id) : ""}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === "on"
                ? `Kênh ngoài đưa Agent ra ngoài Agent Workspace nên cần Org/Unit Admin duyệt trước khi hoạt động. Bản live ${pub.version} và phạm vi Workspace giữ nguyên.`
                : "Agent sẽ ngừng nhận tin nhắn từ kênh này ngay. Muốn bật lại sẽ cần gửi duyệt."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (!confirm) return; confirm.mode === "on" ? requestOn(confirm.id) : turnOff(confirm.id); setConfirm(null); }}
              className={confirm?.mode === "off" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {confirm?.mode === "on" ? "Gửi yêu cầu" : "Tắt kênh"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
