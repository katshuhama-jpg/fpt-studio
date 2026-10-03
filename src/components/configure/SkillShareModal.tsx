import ResourceAccessModal from "./ResourceAccessModal";
import { type Sharing } from "./skillSharing";
import SkillMemberPicker from "./SkillMemberPicker";

/** "Quyền truy cập" popup for a skill - same options, copy and confirmations as Knowledge
 * (see ResourceAccessModal.tsx). */
export default function SkillShareModal(props: {
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
      noun="skill"
      renderPicker={p => <SkillMemberPicker {...p} />}
    />
  );
}
