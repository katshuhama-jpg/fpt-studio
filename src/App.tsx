import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";
import Home from "./pages/Home";
import MyAgents from "./pages/MyAgents";
import AgentsList from "./pages/AgentsList";
import ExternalAgentsList from "./pages/ExternalAgentsList";
import ExternalAgentDetail from "./pages/ExternalAgentDetail";
import PerUserConnectorGuide from "./pages/PerUserConnectorGuide";
import AgentBuilder from "./pages/AgentBuilder";
import AgentScaffold from "./pages/AgentScaffold";
import Inventor from "./pages/Inventor";
import TaskEditor from "./pages/TaskEditor";
import ToolBuilder from "./pages/ToolBuilder";
import OrgGeneral from "./pages/organization/General";
import OrgStructure from "./pages/organization/Structure";
import OrgMembers from "./pages/organization/Members";
import OrgRoles from "./pages/organization/Roles";
import { RolesProvider } from "./pages/organization/rolesStore";
import { OrgProvider } from "./pages/organization/orgStore";
import { ConflictsProvider } from "./pages/organization/conflictsStore";
import PlaceholderPage from "./pages/PlaceholderPage";
import Skills from "./pages/Skills";
import WorkspaceGuardrails from "./pages/WorkspaceGuardrails";
import WorkspaceConnectors from "./pages/WorkspaceConnectors";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import { getUser } from "@/lib/onboarding";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const user = getUser();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (
    user.firstTime &&
    loc.pathname !== "/onboarding" &&
    loc.pathname !== "/inventor"
  )
    return <Navigate to="/onboarding?step=industry" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RolesProvider>
        <OrgProvider>
        <ConflictsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
              <Route path="/" element={<Home />} />
              <Route path="/my-agents" element={<MyAgents />} />
              <Route path="/agents" element={<AgentsList />} />
              <Route path="/agents/new" element={<AgentBuilder />} />
              <Route path="/agents/:id" element={<AgentBuilder />} />
              <Route path="/agents/:id/tasks/:taskId" element={<TaskEditor />} />
              <Route path="/external-agents" element={<ExternalAgentsList />} />
              <Route path="/external-agents/guides/per-user-connector" element={<PerUserConnectorGuide />} />
              <Route path="/external-agents/:id" element={<ExternalAgentDetail />} />
            </Route>
            <Route path="/inventor" element={<RequireAuth><Inventor /></RequireAuth>} />
            <Route path="/agents/:id/tools/new" element={<RequireAuth><ToolBuilder /></RequireAuth>} />
            <Route path="/agents/:id/tools/:toolId" element={<RequireAuth><ToolBuilder /></RequireAuth>} />
            <Route element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
              <Route path="/knowledge" element={<PlaceholderPage title="Workspace Knowledge" />} />
              <Route path="/members" element={<OrgMembers />} />
              <Route path="/roles" element={<OrgRoles />} />
              <Route path="/organization" element={<OrgGeneral />} />
              <Route path="/organization/structure" element={<OrgStructure />} />
              <Route path="/connectors" element={<WorkspaceConnectors />} />
              <Route path="/tools" element={<Skills />} />
              <Route path="/guardrails" element={<WorkspaceGuardrails />} />
              <Route path="/api-keys" element={<PlaceholderPage title="API Keys" />} />
              <Route path="/docs" element={<PlaceholderPage title="Document Center" />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ConflictsProvider>
        </OrgProvider>
      </RolesProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
