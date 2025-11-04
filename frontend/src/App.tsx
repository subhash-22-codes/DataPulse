import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import WorkspaceDetail from './pages/WorkSpaceDetail';
import ForgotPassword from './pages/ForgotPassword';
import { Legal } from './pages/Legal';
import LandingPage from './pages/LandingPage';
import PageNotFound from './pages/PageNotFound';
import { Toaster } from 'react-hot-toast';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { WakeUpScreen } from './components/WakeUpScreen'; 

// --- 1. IMPORT AXIOS DIRECTLY ---
// We need this to create a special ping client.
import axios from 'axios';

// (Your main `api` import from api.ts is no longer needed here,
// but it's okay if other files still use it.)

// --- Your AppRoutes component is unchanged ---
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/home" /> : <LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path='/legal' element={<Legal />} />
      {/* Protected routes */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
      {/* Fallback route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

// --- Helper function to wait (utility) ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Your main App component is UPDATED ---
function App() {
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    // This is the new, robust wake-up logic
    const pollUntilAwake = async () => {
      console.log("Pinging backend to wake it up...");
      
      // --- 2. THE FIX: Create a NEW ping client ---
      // Get the base URL from your .env file
      // This is the *ONLY* place we need to use import.meta.env
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      // Create a new instance that hits the ROOT, not /api
      const pingApi = axios.create({ baseURL: baseUrl });
      // --- END FIX ---
      
      let attempts = 0;
      const maxAttempts = 15; // Max 15 attempts (e.g., 15 * 5s = 75s)
      
     while (attempts < maxAttempts) {
        try {
          await pingApi.get('/');
          console.log("✅ Backend is awake! Proceeding to app.");
          setIsAwake(true);
          return;
          
        } catch (error: unknown) { // <-- 1. Use 'unknown' instead of 'any'
          attempts++;

          // 2. Check the type of the error before using it
          let errorMessage = "Server is still sleeping.";
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          console.warn(`Attempt ${attempts}: Server ping failed. Retrying in 5 seconds...`, errorMessage);
          await wait(5000); 
        }
      }
      
      // 7. If we get here, the server failed to wake up after max attempts.
      console.error("❌ Backend failed to wake up after max attempts. Proceeding anyway.");
      setIsAwake(true); // Still show the app, but log the error
    };

    pollUntilAwake();
  }, []); // The empty array [] means this runs only once.

  return (
    <Router>
      <AuthProvider>
      
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
        
        {/* --- 7. Conditional Rendering Logic --- */}
        {!isAwake ? (
          // If backend is not awake, show the loading screen
          <WakeUpScreen />
        ) : (
          // Once awake, render your real application
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