import React, { useState, useEffect } from 'react'; // <-- ADDED useState and useEffect
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

// --- 1. Import your new WakeUpScreen ---
// (Make sure you have created this file in src/components/WakeUpScreen.tsx)
import { WakeUpScreen } from './components/WakeUpScreen'; 

// --- 2. Import your pre-configured axios instance ---
// (Make sure this path to your api.ts file is correct)
import { api } from './services/api';

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

// --- Your main App component is UPDATED ---
// --- Helper function to wait (utility) ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Your main App component is UPDATED ---
function App() {
  // 1. Add state to track if the backend is awake
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    // 2. This is the new, robust wake-up logic
    const pollUntilAwake = async () => {
      console.log("Pinging backend to wake it up...");
      
      let attempts = 0;
      const maxAttempts = 15; // Max 15 attempts (e.g., 15 * 5s = 75s)
      
      while (attempts < maxAttempts) {
        try {
          // 3. Send the "ping"
          await api.get('/');
          
          // 4. If the request SUCCEEDS (no error), the server is awake!
          console.log("✅ Backend is awake! Proceeding to app.");
          setIsAwake(true);
          return; // Exit the loop and the function
          
        } catch (error) {
          console.error("❗ Ping failed:", error);
          // 5. If it fails (502, 504, timeout), the server is still sleeping.
          attempts++;
          console.warn(`Attempt ${attempts}: Server is still sleeping. Retrying in 5 seconds...`);
          // 6. Wait 5 seconds before the next attempt
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