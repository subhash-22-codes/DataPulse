import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { WakeUpScreen } from './components/WakeUpScreen'; 

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import WorkspaceDetail from './pages/WorkSpaceDetail';
import ForgotPassword from './pages/ForgotPassword';
import { Legal } from './pages/Legal';
import LandingPage from './pages/LandingPage';
import PageNotFound from './pages/PageNotFound';

// --- AppRoutes Component ---
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      {/* If logged in, go to Home. If not, show the Landing Page */}
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

// --- Helper function to wait ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main App Component ---
function App() {
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    const pollUntilAwake = async () => {
      console.log("Pinging backend to wake it up...");
      
      // Get the base URL from your .env file
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      // Create a new instance that hits the ROOT, not /api
      const pingApi = axios.create({ baseURL: baseUrl });
      
      let attempts = 0;
      const maxAttempts = 15; // Max 15 attempts (e.g., 15 * 5s = 75s)
      
      while (attempts < maxAttempts) {
        try {
          await pingApi.get('/');
          console.log("✅ Backend is awake! Proceeding to app.");
          setIsAwake(true);
          return;
          
        } catch (error: unknown) {
          attempts++;
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
      
      console.error("❌ Backend failed to wake up after max attempts. Proceeding anyway.");
      setIsAwake(true); // Still show the app, but log the error
    };

    pollUntilAwake();
  }, []);

  return (
    <Router>
      <AuthProvider>
        {/* WRAP CONTENT IN THEME PROVIDER SO NAVBAR WORKS */}
          
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