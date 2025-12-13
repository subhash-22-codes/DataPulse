import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { Loader2 } from 'lucide-react'; 

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { WakeUpScreen } from './components/WakeUpScreen'; 

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

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
         <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
         <p className="text-sm font-medium text-gray-400 animate-pulse">Verifying session...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/home" /> : <LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path='/legal' element={<Legal />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
      <Route path="/trash" element={
        <ProtectedRoute>
            <Trash />
        </ProtectedRoute>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  // Two states to handle the smooth transition
  const [isBackendReady, setIsBackendReady] = useState(false); // 1. Server is Awake
  const [showApp, setShowApp] = useState(false);               // 2. Animation Finished, Show App

  const pollUntilAwake = useCallback(async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const pingApi = axios.create({ baseURL: baseUrl });
    
    let attempts = 0;
    const maxAttempts = 90; // 180s coverage
    
    while (attempts < maxAttempts) {
      try {
        await pingApi.get('/'); 
        console.log("✅ Backend is awake! Starting 100% animation...");
        setIsBackendReady(true); // <--- Triggers the WakeUpScreen animation
        return; 
      } catch (error) {
        console.error(error);
        attempts++;
        if (attempts % 5 === 0) console.log(`Backend sleeping... Attempt ${attempts}/${maxAttempts}`);
        await wait(2000); 
      }
    }
    console.error("❌ Backend unresponsive after 3 minutes.");
  }, []);

  useEffect(() => {
    pollUntilAwake();
  }, [pollUntilAwake]);

  return (
    <Router>
      {/* FIX: Add key={isBackendReady.toString()}. 
        This forces React to destroy and re-build AuthProvider 
        only AFTER the backend is actually awake. 
      */}
      <AuthProvider key={isBackendReady.toString()}>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '8px',
                background: '#333',
                color: '#fff',
                fontSize: '0.9rem',
              },
              success: { iconTheme: { primary: '#4CAF50', secondary: '#fff' } },
              error: { iconTheme: { primary: '#F44336', secondary: '#fff' } },
            }}
          />
          
          {/* Logic: Show WakeUpScreen until the animation is fully complete */}
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