import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // 🛡️ Use authPhase for precise control
  const { user, authPhase } = useAuth();
  const location = useLocation();

  // 1. THE GATEKEEPER (Checking Phase)
  // If we are still checking (or retrying), we MUST stay on the loader.
  // We do not redirect because we don't have a "Final No" from the server yet.
  if (authPhase === "checking") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-slate-200"></div>
            <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">
          Verifying secure session...
        </p>
      </div>
    );
  }

  // 2. THE ESCAPE HATCH (Unreachable Phase)
  // If the server is dead (unreachable), we stop the loader but we DO NOT 
  // redirect to login. We want to stay exactly where we are so that 
  // when the server wakes up, the user is still on the correct page.
  if (authPhase === "unreachable") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-slate-400 text-sm font-medium">
                DataPulse servers are currently unreachable. 
                <br /> 
                Retrying connection...
            </p>
        </div>
    );
  }

  // 3. THE DECISION (Resolved Phase)
  // Only now, once the server has explicitly answered "No User Found",
  // do we perform the redirect to the login page.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is authenticated and resolved, show the dashboard!
  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;