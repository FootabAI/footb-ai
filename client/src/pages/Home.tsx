import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamStore } from "@/stores/useTeamStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";
import logo from "@/assets/logo.png";
const Home = () => {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn } = useUserStore();
  const { team } = useTeamStore();
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();
  const handleLogin = () => {
    setLoading(true);
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  const handleCreateTeam = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-footbai-background">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex flex-row items-center justify-center gap-4 mb-8">
          <img src={logo} alt="footb-ai" className="object-contain" width={60} />
          <h1 className="text-4xl sm:text-6xl font-bold text-white pt-2">
            Footb-<span className="text-footbai-accent">AI</span>
          </h1>
        </div>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl">
          Create your football club, customize your team's attributes, and
          simulate matches in this interactive football simulation game.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          {isLoggedIn ? (
            <Button
              size="lg"
              onClick={handleCreateTeam}
              className="bg-footbai-accent hover:bg-footbai-accent/80 text-black font-bold"
            >
              {team ? "Continue Playing" : "Create Your Team"}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleLogin}
              className="bg-footbai-accent hover:bg-footbai-accent/80 text-black font-bold"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In to Play"}
            </Button>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl w-full">
          <Card className="bg-footbai-container border-footbai-header hover:border-footbai-accent transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-footbai-accent/20 flex items-center justify-center mb-4">
                <div className="h-6 w-6 text-footbai-accent font-bold">⚽</div>
              </div>
              <h3 className="text-lg font-bold mb-2">Create Your Club</h3>
              <p className="text-gray-400 text-sm">
                Design your team logo and customize club attributes to match
                your strategy.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-footbai-container border-footbai-header hover:border-footbai-accent transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-footbai-accent/20 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-footbai-accent" />
              </div>
              <h3 className="text-lg font-bold mb-2">Manage Your Squad</h3>
              <p className="text-gray-400 text-sm">
                Choose tactics and formations to get the most out of your team's
                strengths.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-footbai-container border-footbai-header hover:border-footbai-accent transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-footbai-accent/20 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-footbai-accent" />
              </div>
              <h3 className="text-lg font-bold mb-2">Match Simulation</h3>
              <p className="text-gray-400 text-sm">
                Experience dynamic match simulations with real-time events and
                statistics.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-footbai-container border-footbai-header hover:border-footbai-accent transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-footbai-accent/20 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-footbai-accent" />
              </div>
              <h3 className="text-lg font-bold mb-2">Earn Points</h3>
              <p className="text-gray-400 text-sm">
                Win matches to earn points and upgrade your team's attributes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 border-t border-footbai-header text-center text-sm text-gray-500">
        FOOTB-AI &copy; {new Date().getFullYear()} - Football Simulation Game
      </footer>
    </div>
  );
};

export default Home;
