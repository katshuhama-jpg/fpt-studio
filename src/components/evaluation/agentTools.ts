import { agentSkillStore } from "@/components/configure/agentSkillStore";
import { agentConnectorStore } from "@/components/configure/agentConnectorStore";
import type { ToolMode } from "./evaluationStore";

/** Connectors that write data (send mail, create tickets…) - Simulated by default when testing. */
export const WRITE_CONNECTORS = ["gmail", "outlook", "slack", "teams", "jira", "gcalendar", "salesforce", "hubspot", "zoom", "gdrive"];

export function agentTools(agentId: string): string[] {
  return [
    ...agentConnectorStore.list(agentId).map(c => c.connectorId),
    ...agentSkillStore.list(agentId).map(s => s.name),
  ];
}

export function defaultToolModes(agentId: string): Record<string, ToolMode> {
  const out: Record<string, ToolMode> = {};
  agentTools(agentId).forEach(t => { out[t] = WRITE_CONNECTORS.includes(t) ? "simulated" : "live"; });
  return out;
}
