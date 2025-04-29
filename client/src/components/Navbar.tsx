import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const Navbar: React.FC = () => {
  const { user, isLoggedIn } = useUser();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Footb-AI</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        {isLoggedIn ? (
          <>
            <Link to="/create-team">Create Team</Link>
            <Link to="/match">Match</Link>
            <span className="user-name">{user?.name}</span>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 