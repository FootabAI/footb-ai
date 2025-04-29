import { NavLink } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Home, Users, Play, LogOut, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SidebarProps {
  isCollapsed?: boolean;
}

const Sidebar = ({
  isCollapsed = false
}: SidebarProps) => {
  const {
    userTeam,
    calculateTeamStrength,
  } = useGame();
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
  
  return <div className="h-full h-screen bg-footbai-container p-4 border-r border-footbai-header overflow-y-auto px-[11px]">
      <div className="flex flex-col h-full">
        {/* App logo and name */}
        <div className={`mb-6 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-footbai-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-black">FB</span>
          </div>
          {!isCollapsed && showHeaderText && (
            <h1 className="text-xl font-bold ml-2 text-white transition-opacity duration-200">FOOTB-AI</h1>
          )}
        </div>
        
        {/* Border for separation */}
        <div className="border-b border-footbai-header mb-6"></div>
        
        {/* Navigation */}
        <nav className="space-y-2 flex-grow">
          <NavLink to="/dashboard" className={({
          isActive
        }) => `flex items-center p-3 ${isCollapsed ? 'justify-center' : ''} rounded-lg transition-colors h-[42px] ${isActive ? "bg-footbai-accent text-black font-medium" : "hover:bg-footbai-hover"}`}>
            <Home size={18} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && showNavText && (
              <span className="transition-opacity duration-200">Dashboard</span>
            )}
          </NavLink>
          
          <NavLink to="/team" className={({
          isActive
        }) => `flex items-center p-3 ${isCollapsed ? 'justify-center' : ''} rounded-lg transition-colors h-[42px] ${isActive ? "bg-footbai-accent text-black font-medium" : "hover:bg-footbai-hover"}`}>
            <Users size={18} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && showNavText && (
              <span className="transition-opacity duration-200">My Team</span>
            )}
          </NavLink>
          
          <NavLink to="/play" className={({
          isActive
        }) => `flex items-center p-3 ${isCollapsed ? 'justify-center' : ''} rounded-lg transition-colors h-[42px] ${isActive ? "bg-footbai-accent text-black font-medium" : "hover:bg-footbai-hover"}`}>
            <Play size={18} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && showNavText && (
              <span className="transition-opacity duration-200">Play Match</span>
            )}
          </NavLink>
        </nav>
        
        {/* Footer with Logout and Delete Team buttons */}
        <div className="mt-auto pt-6 border-t border-footbai-header space-y-2">
          <Button variant="outline" className={`${isCollapsed ? 'justify-center p-2' : 'justify-start'} w-full text-gray-400 hover:text-white hover:bg-footbai-hover h-[38px]`} onClick={handleLogoutClick} title={isCollapsed ? "Log Out" : ""}>
            <LogOut size={18} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && showFooterText && (
              <span className="transition-opacity duration-200">Log Out</span>
            )}
          </Button>
          
          <Button variant="outline" className={`${isCollapsed ? 'justify-center p-2' : 'justify-start'} w-full text-red-500 hover:bg-red-900/20 hover:text-red-400 h-[38px]`} onClick={handleDeleteTeam} title={isCollapsed ? "Delete Team" : ""}>
            <Trash2 size={18} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && showFooterText && (
              <span className="transition-opacity duration-200">Delete Team</span>
            )}
          </Button>
        </div>
      </div>
    </div>;
};

export default Sidebar;