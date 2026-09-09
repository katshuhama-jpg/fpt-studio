import type { Guardrail } from "./guardrailConsoleStore";

/** Owner/sharing chip pair for a guardrail — shared between the Console /guardrails list and
 * every Agent's Guardrails tab so the same guardrail always reads the same way everywhere. The
 * active ownership tab (when given, i.e. on the Console list) already tells the viewer which
 * category they're looking at, so the tag is trimmed to match: dropped entirely on "mine",
 * shortened to "· <tên>" on "shared", full text otherwise/on "all" (including the Agent tab,
 * which has no such tab and always gets the full text). The share-status tag ("Dùng chung" /
 * "Chia sẻ với N người") is unaffected in every case. */
export default function GuardrailOwnershipTag({ g, userId, tab = "all" }: { g: Guardrail; userId: string; tab?: "all" | "mine" | "shared" }) {
  if (!g.ownerId || !g.sharing) return null;
  if (g.ownerId === userId) {
    return (
      <>
        {tab !== "mine" && <span className="chip chip-muted">Của tôi</span>}
        {g.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {g.sharing.mode === "specific" && g.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {g.sharing.people.length} người</span>
        )}
      </>
    );
  }
  return <span className="chip chip-muted">{tab === "shared" ? `· ${g.ownerName ?? "—"}` : `Được chia sẻ · ${g.ownerName ?? "—"}`}</span>;
}
