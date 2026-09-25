// Type-specific "what actually is this thing" content for a standalone Resource's Request Detail
// page (Knowledge/Skill/Guardrail/Connector) — the piece that was completely missing before: a
// Tenant Admin could see a name and a one-line submitter note, nothing that lets them judge the
// resource itself. Each type surfaces the fields that matter for THAT type's risk profile (a
// Connector's auth/endpoint, a Skill's actual instructions, a Knowledge base's size/source,
// a Guardrail's real rule) rather than one generic template. Paired with `ResourceUsageSection`
// (blast-radius: which Agents already depend on this) from `resourceUsage.ts`.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Globe, Lock, Users, ExternalLink } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResourceTypeIcon } from "./governanceUi";
import { knowledgeBaseStore } from "@/components/knowledge/knowledgeBaseStore";
import { skillStore } from "../configure/skillStore";
import { guardrailConsoleStore, actionLabelVi } from "../configure/guardrailConsoleStore";
import { customConnectorStore } from "../configure/customConnectorStore";
import { listResourceUsage } from "./resourceUsage";
import type { GovResourceType } from "./governanceStore";

export type ResourceReqType = Exclude<GovResourceType, "agent">;

/** Defensive masking for a header/secret value — the seed data already stores pre-masked demo
 * values (e.g. "Bearer ••••••••"), but this guards real data too: a reviewer approving Tenant-wide
 * sharing should never need to see the literal secret to judge whether a Connector is safe to
 * share, only that one exists. */
function maskSecret(v: string): string {
  if (!v) return v;
  if (v.includes("•")) return v;
  if (v.length <= 4) return "••••";
  return `${v.slice(0, 2)}••••${v.slice(-2)}`;
}

/** One consistent heading — "Nội dung & cấu hình" — across all 4 resource types, rather than a
 * different word per type ("Cấu hình Connector" vs "Nội dung Knowledge" vs ...). The type itself
 * is already visible in the badge next to the resource name above, so repeating it here just adds
 * a second, inconsistently-worded label for the same fact; one fixed heading reads as the same
 * section every time a Tenant Admin opens a different resource type's request. */
function ContentBlock({ type, children }: { type: ResourceReqType; children: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <ResourceTypeIcon type={type} size={14} className="text-muted-foreground" /> Nội dung & cấu hình
      </p>
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/** The actual configuration/content of the resource being requested — what a Tenant Admin needs
 * to read before letting other Builders reuse it Tenant-wide. Returns null if the underlying
 * resource has since been deleted (mirrors the drift-banner "resource might be gone" handling
 * elsewhere on this page — content just quietly omits rather than crashing). */
export function ResourceContentSection({ type, id }: { type: ResourceReqType; id: string }) {
  if (type === "connector") {
    const c = customConnectorStore.get(id);
    if (!c) return null;
    return (
      <ContentBlock type={type}>
        <Field label="Endpoint">
          <span className="font-mono text-xs break-all">{c.url}</span>
        </Field>
        <Field label="Xác thực">
          {c.authType === "none" ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Globe size={13} /> Không cần xác thực</span>
          ) : (
            <span className="inline-flex items-center gap-1.5"><KeyRound size={13} className="text-warning" /> Header tĩnh (static headers) — có secret đi kèm</span>
          )}
        </Field>
        {c.authType === "static_headers" && c.headers.length > 0 && (
          <Field label={`Headers (${c.headers.length})`}>
            <div className="space-y-1.5">
              {c.headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">{h.key}:</span>
                  <span className="flex items-center gap-1 text-foreground"><Lock size={11} className="text-muted-foreground" /> {maskSecret(h.value)}</span>
                </div>
              ))}
            </div>
          </Field>
        )}
      </ContentBlock>
    );
  }

  if (type === "knowledge") {
    const kb = knowledgeBaseStore.get(id);
    if (!kb) return null;
    return (
      <ContentBlock type={type}>
        <Field label="Loại">
          {kb.type === "internal" ? "Nội bộ — tài liệu / URL / FAQ tải lên Console" : "Kết nối API ngoài"}
        </Field>
        {kb.type === "internal" ? (
          <Field label="Quy mô nội dung">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>{kb.stats.docs} tài liệu</span>
              <span>{kb.stats.urls} URL</span>
              <span>{kb.stats.faqs} FAQ</span>
              <span>{kb.stats.chunks} chunk</span>
            </div>
          </Field>
        ) : (
          <>
            <Field label="API endpoint">
              <span className="font-mono text-xs break-all">{kb.apiEndpoint || "(chưa có)"}</span>
            </Field>
            <Field label="Xác thực">
              {kb.hasApiKey ? (
                <span className="inline-flex items-center gap-1.5"><KeyRound size={13} className="text-warning" /> Có API key đi kèm</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Globe size={13} /> Không có API key</span>
              )}
            </Field>
          </>
        )}
        {kb.description && <Field label="Mô tả"><p className="leading-relaxed">{kb.description}</p></Field>}
      </ContentBlock>
    );
  }

  if (type === "skill") {
    const s = skillStore.get(id);
    if (!s) return null;
    return (
      <ContentBlock type={type}>
        {s.description && <Field label="Mô tả"><p className="leading-relaxed">{s.description}</p></Field>}
        <Field label="Instructions">
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted border border-border/70 p-3 text-xs font-mono leading-relaxed text-foreground">
            {s.body || "(chưa có nội dung)"}
          </pre>
        </Field>
      </ContentBlock>
    );
  }

  const g = guardrailConsoleStore.get(id);
  if (!g) return null;
  return (
    <ContentBlock type={type}>
      <Field label="Mô tả"><p className="leading-relaxed">{g.desc}</p></Field>
      <Field label="Hành động khi vi phạm">{actionLabelVi(g.action)}</Field>
      <Field label="Trạng thái">
        {g.enabled ? (
          <span className="inline-flex items-center gap-1.5 text-success"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Đang bật</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Đang tắt</span>
        )}
      </Field>
    </ContentBlock>
  );
}

/** Blast radius: every Agent that already references this resource today, and whether it's live
 * (Published) or still a Draft. This is the number a Tenant Admin actually needs before rejecting
 * or approving — "0 Agent dùng" reads very differently from "12 Agent dùng, 9 đã Published". */
export function ResourceUsageSection({ type, id }: { type: ResourceReqType; id: string }) {
  const usage = listResourceUsage(type, id);
  const liveCount = usage.filter(u => u.status === "Published").length;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Users size={14} className="text-muted-foreground" /> Agent đang sử dụng thành phần này ({usage.length})
        </p>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Giải thích thêm" className="text-muted-foreground hover:text-foreground transition-colors">
              <HugeiconsIcon icon={InformationCircleIcon} size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={6} className="max-w-xs">
            Đây là phạm vi ảnh hưởng nếu bạn từ chối — các Agent đã Published vẫn tiếp tục chạy bình thường với bản riêng của mình, không bị gỡ.
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        {usage.length === 0
          ? "Chưa có Agent nào dùng thành phần này."
          : liveCount > 0
            ? `${liveCount}/${usage.length} Agent đã Published.`
            : `Cả ${usage.length} Agent đang ở trạng thái Draft.`}
      </p>
      {usage.length > 0 && (
        <div className="space-y-2">
          {usage.map(u => (
            <div key={u.agentId} className="rounded-xl border border-border bg-surface flex items-center gap-3 px-4 py-3">
              <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-base border border-border/60">{u.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border whitespace-nowrap ${
                u.status === "Published" ? "bg-success/10 text-success border-success/20" : "bg-surface-muted text-muted-foreground border-border"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Published" ? "bg-success" : "bg-muted-foreground"}`} />
                {u.status === "Published" ? "Đã publish" : "Draft"}
              </span>
              <Link to={`/agents/${u.agentId}`} className="text-muted-foreground hover:text-foreground shrink-0" title="Xem Agent">
                <ExternalLink size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Simulated connectivity check for the sidebar "Test kết nối" action — a Connector is the one
 * Resource type where an actual reachability check is meaningful before approving it Tenant-wide
 * (mirrors the Agent side's real "Test" action). The other 3 types don't have an equivalent
 * live-check operation, so no button is shown for them — their content section above already
 * surfaces everything there is to review. Deterministic for the prototype: resolves after a short
 * delay so the button reads as doing real work. */
export function testConnector(url: string): Promise<{ ok: boolean; message: string }> {
  return new Promise(resolve => {
    setTimeout(() => resolve({ ok: true, message: `Kết nối thành công tới ${url}` }), 900);
  });
}
