import ResourceAccessModal from "./ResourceAccessModal";
import { type Sharing } from "./guardrailSharing";
import GuardrailMemberPicker from "./GuardrailMemberPicker";

/** "Quyền truy cập" popup for a guardrail - same options, copy and confirmations as Knowledge
 * (see ResourceAccessModal.tsx). */
export default function GuardrailShareModal(props: {
  open: boolean;
  onClose: () => void;
  name: string;
  ownerName: string;
  sharing: Sharing;
  onSave: (sharing: Sharing) => void;
  resourceOwnerId?: string;
  attachedAgentIds?: string[];
  agentOnlyFor?: string;
}) {
  return (
    <ResourceAccessModal
      {...props}
      noun="guardrail"
      renderPicker={p => <GuardrailMemberPicker {...p} />}
    />
  );
}
