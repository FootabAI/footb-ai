import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-footbai-background p-4">
      <div className="text-center bg-footbai-container border border-footbai-header rounded-lg p-8 max-w-md">
        <h1 className="text-6xl font-bold mb-4 text-footbai-accent">404</h1>
        <p className="text-xl text-gray-300 mb-6">Page not found</p>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button 
          onClick={() => navigate("/")} 
          className="bg-footbai-accent hover:bg-footbai-accent/80 text-black"
        >
          <Home size={18} className="mr-2" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;