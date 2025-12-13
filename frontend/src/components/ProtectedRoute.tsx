import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      // UX IMPROVEMENT: Background matches standard dashboard colors (slate-50)
      // to prevents "visual flashing" when the real layout loads.
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        
        {/* OPTIONAL: Add your Logo here for better branding */}
        {/* <img src="/logo-icon.svg" className="h-10 w-10 mb-4 animate-bounce" /> */}

        {/* UI IMPROVEMENT: Double-layer spinner for a more "engineered" look */}
        <div className="relative">
            {/* Outer Ring (Faint) */}
            <div className="h-12 w-12 rounded-full border-4 border-slate-200"></div>
            {/* Inner Ring (Spinning & Colored) */}
            <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>

        {/* UX IMPROVEMENT: Micro-copy informs the user the app isn't stuck */}
        <p className="text-slate-500 text-sm font-medium animate-pulse">
          Securely signing you in...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;