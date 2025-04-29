import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Layout = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex bg-footbai-background text-white">
      {/* Sidebar with dynamic width */}
      <div
        className={`fixed h-screen transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <Sidebar isCollapsed={!sidebarOpen} onToggle={handleToggle} />
      </div>

      {/* Main content - with left padding that adjusts based on sidebar state */}
      <main
        className={`flex-grow bg-footbai-background p-4 md:p-6 overflow-auto transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-16"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
