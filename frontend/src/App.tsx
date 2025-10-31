import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import WorkspaceDetail from './pages/WorkSpaceDetail'; // This import is correct
import ForgotPassword from './pages/ForgotPassword';
import { Legal } from './pages/Legal';
import LandingPage from './pages/LandingPage';
import PageNotFound from './pages/PageNotFound';
import { Toaster } from 'react-hot-toast';
import { CookieConsentBanner } from './components/CookieConsentBanner';
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
      {/* Protected routes (cleaned up layout) */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />

      {/* Fallback route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
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
        
        <AppRoutes />
       <CookieConsentBanner />
      </AuthProvider>
    </Router>
  );
}

export default App;