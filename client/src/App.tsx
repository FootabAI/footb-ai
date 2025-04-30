import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./contexts/GameContext";
import { UserProvider, useUser } from "./contexts/UserContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import CreateTeam from "./pages/CreateTeam";
import Dashboard from "./pages/Dashboard";
import TeamOverview from "./pages/TeamOverview";
import PlayMatch from "./pages/PlayMatch";
import MatchSimulation from "./pages/MatchSimulation";
import MatchSummary from "./pages/MatchSummary";
import Login from './pages/Login';
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { TeamCreationProvider } from "./contexts/TeamCreationContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-footbai-background">
        <Loader2 className="h-8 w-8 animate-spin text-footbai-accent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes with Sidebar */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute>
              <TeamOverview />
            </ProtectedRoute>
          } />
          <Route path="/play" element={
            <ProtectedRoute>
              <PlayMatch />
            </ProtectedRoute>
          } />
          <Route path="/simulation" element={
            <ProtectedRoute>
              <MatchSimulation />
            </ProtectedRoute>
          } />
          <Route path="/summary" element={
            <ProtectedRoute>
              <MatchSummary />
            </ProtectedRoute>
          } />
        </Route>

        {/* Protected Routes without Sidebar */}
        <Route path="/create-team" element={
          <ProtectedRoute>
            <TeamCreationProvider>
              <CreateTeam />
            </TeamCreationProvider>
          </ProtectedRoute>
        } />

        {/* Catch all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <GameProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </GameProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;