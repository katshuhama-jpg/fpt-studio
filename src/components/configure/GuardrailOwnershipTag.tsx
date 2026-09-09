import type { Guardrail } from "./guardrailConsoleStore";

/** Owner/sharing chip pair for a guardrail — shared between the Console /guardrails list and
 * every Agent's Guardrails tab so the same guardrail always reads the same way everywhere. */
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
