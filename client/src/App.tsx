import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useUserStore } from "./stores/useUserStore";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import CreateTeam from "./pages/CreateTeam";
import Dashboard from "./pages/Dashboard";
import TeamOverview from "./pages/TeamOverview";
import PlayMatch from "./pages/PlayMatch";
import MatchSimulation from "./pages/MatchSimulation";
import MatchSummary from "./pages/MatchSummary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Loader from "./components/Loader";
import { useTeamStore } from "./stores/useTeamStore";
import { useBotTeamStore } from "./stores/useBotTeamStore";
import { useEffect } from "react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, isLoading: isLoadingUser } = useUserStore();
  const { team, isLoading: isTeamLoading } = useTeamStore();
  const { fetchBotTeams } = useBotTeamStore();

  useEffect(() => {
    if (user) {
      fetchBotTeams();
    }
  }, [user, fetchBotTeams]);

  console.log('App loading states:', { isLoadingUser, isTeamLoading });

  if (isLoadingUser || isTeamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root path redirects based on auth status */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Public Routes */}
        <Route path="/home" element={<Home />} />
        <Route
          path="/login"
          element={
            <ProtectedRoute>
              <Login />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes with Sidebar */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <TeamOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/play"
            element={
              <ProtectedRoute>
                <PlayMatch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulation"
            element={
              <ProtectedRoute>
                <MatchSimulation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary"
            element={
              <ProtectedRoute>
                <MatchSummary />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Protected Routes without Sidebar */}
        <Route
          path="/create-team"
          element={
            <ProtectedRoute>
              <CreateTeam />
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
