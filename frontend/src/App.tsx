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
function App() {
  // 3. Add state to track if the backend is awake
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    // 4. This effect runs ONCE when the app first loads
    const wakeUpBackend = async () => {
      console.log("Pinging backend to wake it up...");
      try {
        // 5. Send a simple "ping" to your backend's root URL
        // This is the request that wakes up Render.
        await api.get('/'); 
        
      } catch (error) {
        console.error("Error waking up backend:", error);
        // Even if the ping fails (e.g., 404, 500), the server is now awake.
        console.warn("Wake-up ping finished, proceeding to app.");
      } finally {
        // 6. Set 'isAwake' to true to show the real app.
        setIsAwake(true);
      }
    };

    wakeUpBackend();
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