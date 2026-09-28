// sessionStorage-backed per-agent on/off state for the platform's DEFAULT CAPABILITIES — the
// behaviours every agent ships with (memory, web search, planning, sandbox...) as opposed to
// skills (builtinSkillStore.ts) or connectors. Only the capabilities the platform actually lets
// a builder switch off live here; the always-on ones are listed below for documentation but are
// never rendered as toggles.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export interface AgentCapability {
  id: string;
  /** Vietnamese label, matching the capability analysis doc. */
  name: string;
  description: string;
  /** Extra line shown under the description when the capability only applies in some setups —
   * the runtime conditions from the doc, worth stating because a toggle that's on can still be
   * inert (e.g. sub-agent delegation with no sub-agents configured). */
  note?: string;
}

/** The nine capabilities the platform allows an agent to turn off. Order follows the doc. */
export const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    id: "memory",
    name: "Bộ nhớ dài hạn",
    description: "Cho phép Agent cá nhân hóa trải nghiệm của bạn dựa trên các cuộc trò chuyện.",
    note: "Cần có store để lưu; Agent không ghi trực tiếp vào preferences.md.",
  },
  {
    id: "web-search",
    name: "Tìm kiếm web",
    description: "Cho phép Agent search web để tìm kiếm thông tin khi cần thiết.",
  },
  {
    id: "planning",
    name: "Lập kế hoạch",
    description: "Cho phép Agent tạo todolist.",
  },
  {
    id: "file-write",
    name: "Hệ thống file ảo — ghi file",
    description: "Cho phép Agent thao tác với hệ thống file — thêm, sửa, xóa.",
    note: "Chỉ ghi được trong /memories/ và /artifacts/; các file cấu hình luôn bị từ chối.",
  },
  {
    id: "sandbox",
    name: "Chạy code / sandbox",
    description: "Cho phép Agent thực thi code trong sandbox.",
    note: "Tắt sandbox sẽ gỡ tool execute khỏi danh sách tool của Agent.",
  },
  {
    id: "ask-user",
    name: "Hỏi lại người dùng (HITL)",
    description: "Cho phép Agent sinh ra khung chat chứa câu hỏi và lựa chọn khi hỏi lại người dùng.",
    note: "Một số kênh không hiển thị được khung câu hỏi — tắt nếu kênh triển khai không hỗ trợ.",
  },
  {
    id: "rich-carousel",
    name: "Tin nhắn dạng Carousel",
    description: "Cho phép Agent sinh ra định dạng Carousel.",
    note: "Một số kênh không hiển thị được ảnh/tiêu đề dạng khung — tắt nếu kênh không hỗ trợ.",
  },
  {
    id: "sub-agent-delegation",
    name: "Giao việc cho sub-agent",
    description: "Cho phép Agent giao nhiệm vụ cho sub-agent thực thi.",
    note: "Sub-agent nhận nguyên danh sách tool của Agent cha.",
  },
  {
    id: "inline-citation",
    name: "Inline Citation",
    description: "Cho phép Agent sinh câu trả lời kèm theo trích dẫn trong văn bản.",
  },
];

/** Capabilities the platform keeps on permanently — kept here so the list isn't lost, and so a
 * future "what can this agent do" view has one source. Never rendered as a toggle: Knowledge
 * follows whether a corpus exists, office/design document generation is toggled in Skills
 * (see builtinSkillStore.ts), and the rest are structural. */
export const ALWAYS_ON_CAPABILITIES: { name: string; reason: string }[] = [
  { name: "Knowledge (RAG)", reason: "Bật/tắt theo việc Agent có tri thức hay không." },
  { name: "Tạo tài liệu văn phòng / thiết kế", reason: "Bật/tắt ở phần Skills mặc định." },
  { name: "Tự cấu hình agent", reason: "Chỉ chạy ở chế độ refine, tự tắt ở chế độ chat." },
  { name: "Trả file cho người dùng", reason: "Năng lực cố định." },
  { name: "Đọc ảnh", reason: "Năng lực cố định." },
  { name: "Hệ thống file ảo — đọc file", reason: "Agent đọc skills dựa trên năng lực này." },
];

// Only OFF states are stored, keyed `${agentId}:${capabilityId}` — every capability ships on, so
// an absent key means "on". That keeps a brand-new agent (and any agent created before this
// feature existed) correct without a seed step.
const OFF_KEY = "agent_capability_off_v1";
const off = loadMap<string, boolean>(OFF_KEY);
const k = (agentId: string, capabilityId: string) => `${agentId}:${capabilityId}`;
const persist = () => saveMap(OFF_KEY, off);

export const agentCapabilityStore = {
  list(): AgentCapability[] {
    return AGENT_CAPABILITIES;
  },
  isOn(agentId: string, capabilityId: string): boolean {
    return off.get(k(agentId, capabilityId)) !== true;
  },
  setOn(agentId: string, capabilityId: string, on: boolean) {
    if (on) off.delete(k(agentId, capabilityId));
    else off.set(k(agentId, capabilityId), true);
    persist();
  },
  onCount(agentId: string): number {
    return AGENT_CAPABILITIES.filter(c => this.isOn(agentId, c.id)).length;
  },
  isAtDefault(agentId: string): boolean {
    return AGENT_CAPABILITIES.every(c => this.isOn(agentId, c.id));
  },
  restoreDefaults(agentId: string) {
    for (const c of AGENT_CAPABILITIES) off.delete(k(agentId, c.id));
    persist();
  },
};
