import React from 'react';
import { Navigate } from 'react-router-dom';

// 1. Import Auth Context
import { useAuth } from '../context/AuthContext'; 

// 2. Import Your New DataPulse Components
import Navbar from '../components/website-ui/Navbar';
import Hero from '../components/website-ui/Hero';
import Features from '../components/website-ui/Features';
import Architecture from '../components/website-ui/Architecture';
import About from '../components/website-ui/About'; // <--- NEW IMPORT
import Team from '../components/website-ui/Teams';
import Footer from '../components/website-ui/Footer';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    // Page Wrapper (Clean Light Theme)
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navigation Bar */}
      <Navbar />
      
      {/* Main Sections */}
      <main className="flex flex-col">
        
        {/* Hero Section */}
        <Hero />
        
        {/* Features Grid */}
        <Features />
        
        {/* Architecture Diagram */}
        <Architecture />

        {/* About / Tech Stack (THIS WAS MISSING) */}
        <About />
        
        {/* The Team */}
        <Team />
        
      </main>

      {/* Footer */}
      <Footer />
      
    </div>
  );
};

export default LandingPage;