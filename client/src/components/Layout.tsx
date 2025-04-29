import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Layout = () => {
  const { isLoggedIn } = useUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="min-h-screen flex bg-footbai-background text-white">
      {/* Sidebar with dynamic width */}
      <div className={`fixed h-screen transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <Sidebar isCollapsed={!sidebarOpen} />
      </div>
      
      {/* Toggle button for sidebar */}
      <div className="fixed left-0 bottom-6 z-50 ml-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-footbai-container hover:bg-footbai-hover text-white border-footbai-header rounded-full shadow-lg"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </Button>
      </div>
      
      {/* Main content - with left padding that adjusts based on sidebar state */}
      <main className={`flex-grow bg-footbai-background p-4 md:p-6 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;