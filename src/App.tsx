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
import AgentBuilder from "./pages/AgentBuilder";
import AgentScaffold from "./pages/AgentScaffold";
import Inventor from "./pages/Inventor";
import TaskEditor from "./pages/TaskEditor";
import ToolBuilder from "./pages/ToolBuilder";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import PlaceholderPage from "./pages/PlaceholderPage";
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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
            <Route path="/" element={<Home />} />
            <Route path="/my-agents" element={<MyAgents />} />
            <Route path="/agents" element={<AgentsList />} />
            <Route path="/agents/new" element={<AgentScaffold />} />
            <Route path="/agents/:id" element={<AgentBuilder />} />
            <Route path="/agents/:id/tasks/:taskId" element={<TaskEditor />} />
          </Route>
          <Route path="/inventor" element={<RequireAuth><Inventor /></RequireAuth>} />
          <Route path="/agents/:id/tools/new" element={<RequireAuth><ToolBuilder /></RequireAuth>} />
          <Route path="/agents/:id/tools/:toolId" element={<RequireAuth><ToolBuilder /></RequireAuth>} />
          <Route element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
            <Route path="/knowledge" element={<PlaceholderPage title="Workspace Knowledge" />} />
            <Route path="/settings" element={<WorkspaceSettings />} />
            <Route path="/templates" element={<PlaceholderPage title="Template Store" />} />
            <Route path="/tools" element={<PlaceholderPage title="Skills" />} />
            <Route path="/api-keys" element={<PlaceholderPage title="API Keys" />} />
            <Route path="/docs" element={<PlaceholderPage title="Document Center" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
