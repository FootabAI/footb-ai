import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./contexts/GameContext";
import { UserProvider } from "./contexts/UserContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CreateTeam from "./pages/CreateTeam";
import Dashboard from "./pages/Dashboard";
import TeamOverview from "./pages/TeamOverview";
import PlayMatch from "./pages/PlayMatch";
import MatchSimulation from "./pages/MatchSimulation";
import MatchSummary from "./pages/MatchSummary";
import Login from './pages/Login';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <GameProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/create-team" element={<CreateTeam />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/team" element={<TeamOverview />} />
                <Route path="/play" element={<PlayMatch />} />
                <Route path="/simulation" element={<MatchSimulation />} />
                <Route path="/summary" element={<MatchSummary />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GameProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;