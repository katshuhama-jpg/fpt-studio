import ResourceAccessModal from "./ResourceAccessModal";
import { type Sharing } from "./customConnectorSharing";
import CustomConnectorMemberPicker from "./CustomConnectorMemberPicker";

/** "Quyền truy cập" popup for a custom connector or API Tool - same options, copy and confirmations as Knowledge
 * (see ResourceAccessModal.tsx). */
export default function CustomConnectorShareModal(props: {
  open: boolean;
  onClose: () => void;
  name: string;
  ownerName: string;
  sharing: Sharing;
  onSave: (sharing: Sharing) => void;
  resourceOwnerId?: string;
  attachedAgentIds?: string[];
  agentOnlyFor?: string;
  /** Space library: name of the Agent the resource came from (labels the switch). */
  originAgentName?: string;
  /** Kept for callers; the popup title is always "Quyền truy cập". */
  title?: string;
  /** "API Tool" when reused for an API Tool. */
  noun?: string;
}) {
  return (
    <ResourceAccessModal
      {...props}
      noun={props.noun === "API Tool" ? "API Tool" : "kết nối"}
      renderPicker={p => <CustomConnectorMemberPicker {...p} />}
    />
  );
}
