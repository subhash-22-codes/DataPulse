import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { Loader2, RefreshCw } from 'lucide-react'; 

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { WakeUpScreen } from './components/WakeUpScreen'; 
import { NotificationsPage } from './components/NotificationsPage';

// Pages
import { Trash } from './pages/Trash';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import WorkspaceDetail from './pages/WorkSpaceDetail';
import ForgotPassword from './pages/ForgotPassword';
import { Legal } from './pages/Legal';
import LandingPage from './pages/LandingPage';
import PageNotFound from './pages/PageNotFound';
import { Account } from './pages/Accounts';

/**
 * AppRoutes handles the actual routing logic.
 */
function AppRoutes() {
  const { isAuthenticated, authPhase } = useAuth();

  // 1. STATE: SERVER IS BUSY CHECKING
  if (authPhase === "checking") {
    return (
      <div id="session-verify-loader" className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
         <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
         <p className="text-sm font-medium text-gray-500 animate-pulse">Verifying secure session...</p>
      </div>
    );
  }

  // 2. STATE: SERVER IS UNREACHABLE (Laptop Sleep / DNS Fail / Offline)
 if (authPhase === "unreachable") {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4">
      
      {/* Subtle ambient depth (very restrained) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 
                        -translate-x-1/2 -translate-y-1/2 
                        w-[420px] h-[420px] 
                        bg-blue-600/5 
                        rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm sm:max-w-md text-center">
        
        {/* Title */}
        <h1 className="text-slate-900 text-lg sm:text-xl font-semibold tracking-tight mb-2">
          Service unavailable
        </h1>

        {/* Description */}
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          We’re unable to reach the DataPulse service right now.  
          This may be due to a temporary network issue.
        </p>

       {/* Primary Action */}
        <button
          onClick={() => window.location.reload()}
          className="
            w-full
            flex items-center justify-center gap-2
            h-10 px-6
            rounded-sm
            bg-slate-900 hover:bg-slate-800
            text-white
            text-[13px] font-bold tracking-widest font-manrope
            transition-all
            active:scale-[0.98]
            shadow-sm
          "
        >
          <RefreshCw className="w-3.5 h-3.5 stroke-[3]" />
          Retry
        </button>

        {/* Brand signature (very subtle) */}
        <p className="mt-10 text-[10px] text-slate-400 uppercase tracking-widest">
          DataPulse
        </p>
      </div>
    </div>
  );
}


  // 3. STATE: RESOLVED (The Decision is Final)
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/home" /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/home" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/home" /> : <Register />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/home" /> : <ForgotPassword />} />
      <Route path='/legal' element={<Legal />} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [showApp, setShowApp] = useState(sessionStorage.getItem('backend_awake') === 'true');

  const pollUntilAwake = useCallback(async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const pingApi = axios.create({ baseURL: baseUrl });

    if (sessionStorage.getItem('backend_awake') === 'true') {
      setIsBackendReady(true);
      setShowApp(true);
      return;
    }

    let attempts = 0;
    while (attempts < 60) {
      try {
        await pingApi.get('/'); 
        setIsBackendReady(true);
        sessionStorage.setItem('backend_awake', 'true');
        return;
      } catch {
        // 🚨 Reset flag if ping fails during polling
        setIsBackendReady(false);
        attempts++;
        await wait(2000);
      }
    }
  }, []);

  useEffect(() => {
    pollUntilAwake();
  }, [pollUntilAwake]);

  return (
    <Router>
      {/* Using isBackendReady in the key ensures that if the server goes down 
        and then wakes up, the AuthProvider is forced to re-mount and 
        re-run its session check logic automatically.
      */}
      <AuthProvider key={`backend-state-${isBackendReady}`}>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#fff',
                fontSize: '0.9rem',
              }
            }}
          />
          
          {!showApp ? (
              <WakeUpScreen
                isSystemReady={isBackendReady}
                onAnimationComplete={() => setShowApp(true)}
              />
            ) : (
              <>
                <AppRoutes />
                <CookieConsentBanner />
              </>
            )}
      </AuthProvider>
    </Router>
  );
}

export default App;