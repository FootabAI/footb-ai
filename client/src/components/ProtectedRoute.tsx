import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';
import { useTeamStore } from '@/stores/useTeamStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoggedIn, isLoading: isUserLoading } = useUserStore();
  const { team, isLoading: isTeamLoading } = useTeamStore();
  const location = useLocation();

  // If we're on the login page, just render the children
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  // Show loader only if we're loading and not on login page
  if (isUserLoading || isTeamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-footbai-background">
        <Loader2 className="h-8 w-8 animate-spin text-footbai-accent" />
      </div>
    );
  }

  // Handle protected routes
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!team && location.pathname !== '/create-team') {
    return <Navigate to="/create-team" replace />;
  }

  if (team && location.pathname === '/create-team') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 