import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";
import Home from "./pages/Home";
import MyAgents from "./pages/MyAgents";
import AgentsList from "./pages/AgentsList";
import AgentBuilder from "./pages/AgentBuilder";
import AgentScaffold from "./pages/AgentScaffold";
import TaskEditor from "./pages/TaskEditor";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<WorkspaceLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/my-agents" element={<MyAgents />} />
            <Route path="/agents" element={<AgentsList />} />
            <Route path="/agents/new" element={<AgentScaffold />} />
            <Route path="/agents/:id" element={<AgentBuilder />} />
            <Route path="/agents/:id/tasks/:taskId" element={<TaskEditor />} />
            <Route path="/knowledge" element={<PlaceholderPage title="Workspace Knowledge" />} />
            <Route path="/settings" element={<WorkspaceSettings />} />
            <Route path="/templates" element={<PlaceholderPage title="Template Store" />} />
            <Route path="/tools" element={<PlaceholderPage title="Tool Store" />} />
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
