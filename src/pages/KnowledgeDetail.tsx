import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import KnowledgeBaseView from "@/components/knowledge/KnowledgeBaseView";
import { knowledgeBaseStore } from "@/components/knowledge/knowledgeBaseStore";
import { getAgent } from "@/components/configure/agentStore";

/** /knowledge/:id and /knowledge/:id/files/:fileId/chunks (same URLs as Production).
 * Opening a document pushes its URL, so the browser Back button returns to the list. */
export default function KnowledgeDetail() {
  const { id = "", fileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const viaAgent = params.get("viaAgent");
  const query = viaAgent ? `?viaAgent=${viaAgent}` : "";

  // An Agent's own knowledge base isn't in the Space library - it belongs under that Agent.
  const kb = knowledgeBaseStore.get(id);
  const ownerAgent = kb?.agentOnlyFor;
  const backHref = ownerAgent ? `/agents/${ownerAgent}?tab=build&section=knowledge` : "/knowledge";
  const backLabel = ownerAgent ? `Tri thức của ${getAgent(ownerAgent).name}` : "Kho tri thức";

  return (
    <div className="h-full overflow-y-auto bg-background">
      <KnowledgeBaseView
        kbId={id}
        variant="space"
        agentId={viaAgent}
        backLabel={backLabel}
        onBack={() => navigate(backHref)}
        openDocId={fileId ?? null}
        onOpenDoc={docId => navigate(`/knowledge/${id}/files/${docId}/chunks${query}`, { state: { drill: "file" } })}
        onCloseDoc={() => {
          if ((location.state as { drill?: string } | null)?.drill === "file") navigate(-1);
          else navigate(`/knowledge/${id}${query}`, { replace: true });
        }}
        onDeleted={() => navigate(backHref)}
      />
    </div>
  );
}
