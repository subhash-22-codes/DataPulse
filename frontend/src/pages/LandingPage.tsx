import React from 'react';
import { Navigate } from 'react-router-dom';

// 1. Import Auth Context
import { useAuth } from '../context/AuthContext'; 

// 2. Import Your New DataPulse Components
import Navbar from '../components/website-ui/Navbar';
import Hero from '../components/website-ui/Hero';
import Problem from '../components/website-ui/Problem';
import HowItWorks from '../components/website-ui/HowItWorks';
import Features from '../components/website-ui/Features';
// import Architecture from '../components/website-ui/Architecture';
import Team from '../components/website-ui/Teams';
import Footer from '../components/website-ui/Footer';
import SocialProof from '../components/website-ui/SocialProof';
import Screenshots from '../components/website-ui/Screenshots';
import WhoItsFor from '../components/website-ui/WhoItsFor';
import FinalCTA from '../components/website-ui/FinalCTA';
import TrustSection from '../components/website-ui/TrustSection';
import Pricing from '../components/website-ui/Pricing';
import Faq from '../components/website-ui/Faq';
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
        
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Screenshots />
        <WhoItsFor />
        <SocialProof />
        <TrustSection />
        <Pricing />
        <Faq />
        <Team />
        <FinalCTA />
                
        {/* Architecture Diagram
        <Architecture /> */}
        
        {/* The Team */}
        
        
      </main>

      {/* Footer */}
      <Footer />
      
    </div>
  );
};

export default LandingPage;