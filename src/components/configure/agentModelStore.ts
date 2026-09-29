// Per-Agent model choice — the single source of truth for "which model does this Agent run on".
// Before this, the model lived in 4 unrelated places (the Builder dropdown's local component
// state, the Agents-list card reading AgentRecord.model, the Publish modal's mocked diff, and the
// governance request reading AgentRecord.model), so the same Agent showed 4 different models.
// Now the Builder dropdown writes here, and every other surface reads from here.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export const MODEL_CATALOG = [
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
  { id: "glm-5-1", name: "GLM 5.1" },
  { id: "deepseek-v4", name: "DeepSeek V4" },
  { id: "qwen-turbo", name: "Qwen Turbo" },
] as const;

export const DEFAULT_MODEL_ID = "deepseek-v4-flash";

const KEY = "agent_model_store_v1";
const store = loadMap<string, string>(KEY);

export const agentModelStore = {
  get(agentId: string): string {
    return store.get(agentId) ?? DEFAULT_MODEL_ID;
  },
  set(agentId: string, modelId: string) {
    store.set(agentId, modelId);
    saveMap(KEY, store);
  },
  /** Display name of the Agent's current model (falls back to the raw id). */
  label(agentId: string): string {
    return modelName(this.get(agentId));
  },
};

export function modelName(modelId: string): string {
  return MODEL_CATALOG.find(m => m.id === modelId)?.name ?? modelId;
}
