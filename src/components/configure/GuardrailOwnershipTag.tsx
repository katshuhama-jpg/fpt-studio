import type { Guardrail } from "./guardrailConsoleStore";

/** Owner/sharing chip pair for a guardrail — used in the Agent's Guardrails tab, which has no
 * ownership filter tab of its own (unlike the Console /guardrails list, which has its own local,
 * tab-aware chip instead — see ShareStatusChip in WorkspaceGuardrails.tsx). */
export default function GuardrailOwnershipTag({ g, userId }: { g: Guardrail; userId: string }) {
  if (!g.ownerId || !g.sharing) return null;
  if (g.ownerId === userId) {
    return (
      <>
        <span className="chip chip-muted">Của tôi</span>
        {g.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {g.sharing.mode === "specific" && g.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {g.sharing.people.length} người</span>
        )}
      </>
    );
  }
  return <span className="chip chip-muted">Được chia sẻ · {g.ownerName ?? "—"}</span>;
}
