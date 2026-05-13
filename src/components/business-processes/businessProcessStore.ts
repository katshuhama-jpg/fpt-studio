// In-memory store for Business Processes (BP).
// Mirrors taskStore pattern.

export type BpStrategy = "react" | "predefined" | "tool_execution";
export type IndexingStatus = "completed" | "not_indexed";

export interface BusinessProcess {
  id: string;
  agentId: string;
  name: string;
  description: string;
  sample?: string;
  goal: string;
  strategy: BpStrategy;
  instruction: string;
  constraint?: string;
  taskIds: string[];
  toolIds: string[];
  enabled: boolean;
  isDefault?: boolean;
  indexingStatus: IndexingStatus;
  updatedAt: number;
}

const store = new Map<string, BusinessProcess>();
const k = (a: string, id: string) => `${a}:${id}`;

const DEFAULT_OTHERS: Omit<BusinessProcess, "agentId"> = {
  id: "others",
  name: "others",
  description:
    "Khả năng cơ bản của Agent có thể tham gia vào các cuộc trò chuyện và trả lời câu hỏi của người dùng đưa ra dựa vào knowledge/tool/task có thể truy cập.",
  goal: "Trả lời các câu hỏi chung của người dùng dựa trên knowledge/tool/task có thể truy cập.",
  strategy: "react",
  instruction:
    "Sinh ra câu trả lời dựa trên knowledge được truy xuất để trả lời câu hỏi của người dùng đưa ra.",
  taskIds: ["sys-generate-knowledge-response"],
  toolIds: [],
  enabled: true,
  isDefault: true,
  indexingStatus: "not_indexed",
  updatedAt: Date.now(),
};

function seedAgent(agentId: string) {
  if ([...store.keys()].some(key => key.startsWith(`${agentId}:`))) return;
  const now = Date.now();
  const seed: Omit<BusinessProcess, "agentId">[] = [
    DEFAULT_OTHERS,
    {
      id: "verify-customer",
      name: "verify_customer",
      description: "Xác thực khách hàng qua số điện thoại trước khi xử lý nghiệp vụ nhạy cảm.",
      goal: "Đảm bảo người yêu cầu là chủ tài khoản.",
      strategy: "predefined",
      instruction:
        "1) Hỏi số điện thoại đăng ký.\n2) Gọi tool verify_customer.\n3) Nếu thất bại, đề nghị thử lại hoặc chuyển TVV.",
      taskIds: [],
      toolIds: ["verify-customer"],
      enabled: true,
      indexingStatus: "completed",
      updatedAt: now - 86_400_000 * 2,
    },
    {
      id: "lock-card",
      name: "lock_card",
      description: "Khoá thẻ ngay khi khách báo mất, lộ thông tin hoặc nghi ngờ gian lận.",
      goal: "Khoá thẻ trong thời gian ngắn nhất, sau khi đã xác thực khách hàng.",
      strategy: "predefined",
      instruction:
        "1) Yêu cầu BP verify_customer chạy trước.\n2) Hỏi 4 số cuối thẻ + lý do.\n3) Gọi tool lock_card.\n4) Thông báo kết quả và mã ticket.",
      constraint: "Không khoá thẻ khi chưa xác thực thành công.",
      taskIds: ["lock-card"],
      toolIds: ["lock-card"],
      enabled: true,
      indexingStatus: "completed",
      updatedAt: now - 3_600_000,
    },
  ];
  for (const s of seed) store.set(k(agentId, s.id), { ...s, agentId });
}

export const businessProcessStore = {
  list(agentId: string): BusinessProcess[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(b => b.agentId === agentId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  },
  get(agentId: string, id: string) {
    seedAgent(agentId);
    return store.get(k(agentId, id));
  },
  isDuplicateName(agentId: string, name: string, excludeId?: string) {
    return this.list(agentId).some(
      b => b.name.trim().toLowerCase() === name.trim().toLowerCase() && b.id !== excludeId,
    );
  },
  create(agentId: string, data: Omit<BusinessProcess, "id" | "agentId" | "updatedAt" | "indexingStatus" | "enabled"> & { enabled?: boolean }) {
    const id = `bp-${Date.now().toString(36)}`;
    const rec: BusinessProcess = {
      ...data,
      id,
      agentId,
      enabled: data.enabled ?? true,
      indexingStatus: "not_indexed",
      updatedAt: Date.now(),
    };
    store.set(k(agentId, id), rec);
    return rec;
  },
  update(agentId: string, id: string, patch: Partial<BusinessProcess>) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    // Default BP: cannot rename
    const safe = cur.isDefault ? { ...patch, name: cur.name } : patch;
    store.set(k(agentId, id), { ...cur, ...safe, updatedAt: Date.now() });
  },
  toggle(agentId: string, id: string, enabled: boolean) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, enabled, updatedAt: Date.now() });
  },
  remove(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur || cur.isDefault) return;
    store.delete(k(agentId, id));
  },
  resetDefault(agentId: string) {
    seedAgent(agentId);
    store.set(k(agentId, "others"), { ...DEFAULT_OTHERS, agentId, updatedAt: Date.now() });
  },
};

export const STRATEGY_OPTIONS: { value: BpStrategy; label: string; desc: string }[] = [
  { value: "react", label: "ReAct", desc: "Agent reasons step-by-step then chooses tools/tasks dynamically." },
  { value: "predefined", label: "Predefined Plan", desc: "Agent follows the instruction in a fixed order." },
  { value: "tool_execution", label: "Tool Execution", desc: "Agent directly executes a selected tool or task without reasoning." },
];
