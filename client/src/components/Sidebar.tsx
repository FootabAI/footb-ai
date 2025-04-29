import { NavLink } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  Play,
  LogOut,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ isCollapsed = false, onToggle }: SidebarProps) => {
  const { userTeam, calculateTeamStrength } = useGame();
  const { handleLogout } = useUser();

  // Add state to track text visibility with delay for different elements
  const [showHeaderText, setShowHeaderText] = useState(!isCollapsed);
  const [showNavText, setShowNavText] = useState(!isCollapsed);
  const [showFooterText, setShowFooterText] = useState(!isCollapsed);

  useEffect(() => {
    let headerTimeoutId: NodeJS.Timeout;
    let navTimeoutId: NodeJS.Timeout;
    let footerTimeoutId: NodeJS.Timeout;

    if (!isCollapsed) {
      // Add a small delay before showing the header text when expanding
      headerTimeoutId = setTimeout(() => {
        setShowHeaderText(true);
      }, 150); // 150ms delay for smooth transition

      // Add a slightly longer delay for navigation links
      navTimeoutId = setTimeout(() => {
        setShowNavText(true);
      }, 200); // 200ms delay for navigation items

      // Add the longest delay for footer buttons
      footerTimeoutId = setTimeout(() => {
        setShowFooterText(true);
      }, 250); // 250ms delay for footer buttons
    } else {
      // Hide text immediately when collapsing
      setShowHeaderText(false);
      setShowNavText(false);
      setShowFooterText(false);
    }

    return () => {
      // Clean up timeouts on unmount or when dependencies change
      if (headerTimeoutId) clearTimeout(headerTimeoutId);
      if (navTimeoutId) clearTimeout(navTimeoutId);
      if (footerTimeoutId) clearTimeout(footerTimeoutId);
    };
  }, [isCollapsed]);

  if (!userTeam) return null;
  const teamStrength = calculateTeamStrength(userTeam);

  const handleLogoutClick = async () => {
    await handleLogout();
  };

  const handleDeleteTeam = async () => {
    await handleLogout();
  };

  return (
    <div className="h-full h-screen bg-footbai-container p-4 border-r border-footbai-header  px-[11px] relative">
      <div className="absolute right-0 top-[50%] z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggle}
          className="bg-footbai-hover hover:text-white hover:bg-footbai-accent text-white border-none h-10 w-7 rounded-tl-[4px] rounded-bl-[4px] rounded-tr-none rounded-br-none"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>
      <div className="flex flex-col h-full">
        {/* App logo and name */}
        <div
          className={`mb-6 flex items-center ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-8 h-8 bg-footbai-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-black">FB</span>
          </div>
          {!isCollapsed && showHeaderText && (
            <h1 className="text-xl font-bold ml-2 text-white transition-opacity duration-200">
              FOOTB-AI
            </h1>
          )}
        </div>

        {/* Border for separation */}
        <div className="border-b border-footbai-header mb-6"></div>

        {/* Navigation */}
        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-footbai-accent text-black"
                      : "text-white hover:bg-footbai-hover"
                  } ${isCollapsed ? "justify-center" : ""}`
                }
              >
                <Home size={20} />
                {!isCollapsed && showNavText && (
                  <span className="ml-2 transition-opacity duration-200">
                    Dashboard
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-footbai-accent text-black"
                      : "text-white hover:bg-footbai-hover"
                  } ${isCollapsed ? "justify-center" : ""}`
                }
              >
                <Users size={20} />
                {!isCollapsed && showNavText && (
                  <span className="ml-2 transition-opacity duration-200">
                    Team
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/play"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-footbai-accent text-black"
                      : "text-white hover:bg-footbai-hover"
                  } ${isCollapsed ? "justify-center" : ""}`
                }
              >
                <Play size={20} />
                {!isCollapsed && showNavText && (
                  <span className="ml-2 transition-opacity duration-200">
                    Play
                  </span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Footer buttons */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className={`w-full justify-start ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={handleLogoutClick}
          >
            <LogOut size={20} />
            {!isCollapsed && showFooterText && (
              <span className="ml-2 transition-opacity duration-200">
                Logout
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className={`w-full justify-start ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={handleDeleteTeam}
          >
            <Trash2 size={20} />
            {!isCollapsed && showFooterText && (
              <span className="ml-2 transition-opacity duration-200">
                Delete Team
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
