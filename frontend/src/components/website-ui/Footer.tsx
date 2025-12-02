import React, { useState } from 'react'; 
import { Mail, MapPin, ChevronDown } from 'lucide-react'; 
// Adjust import path: Go up two levels to reach 'src/hooks'
import { useInView } from './hooks/useInView'; 
import { useNavigate } from "react-router-dom";
// --- FOOTER LINK COMPONENT ---
// Professional hover states and transitions
const FooterLink: React.FC<{ onClick?: () => void; href?: string; children: React.ReactNode }> = ({ onClick, href, children }) => (
  <li>
    <a
      href={href || "#"}
      onClick={(e) => {
        if (onClick) {
            e.preventDefault();
            onClick();
        }
      }}
      className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium block w-full py-1.5"
    >
      {children}
    </a>
  </li>
);

// --- ACCORDION COMPONENT (Mobile Only) ---
const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="md:hidden border-b border-slate-100 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-left py-4"
                aria-expanded={isOpen}
            >
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {title}
                </h4>
                <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-64 opacity-100 pb-4' : 'max-h-0 opacity-0'}`}
            >
                {children}
            </div>
        </div>
    );
};

export default function Footer() {
  const [footerRef, isFooterVisible] = useInView({ threshold: 0.1 });
  const navigate = useNavigate();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Content Groups
  const platformLinks = (
       <ul className="space-y-1">
            <FooterLink onClick={scrollToTop} href="/">Home</FooterLink>
            <FooterLink onClick={scrollToTop} href="/#about">About Us</FooterLink>
       </ul>
  );

   const featureLinks = (
        <ul className="space-y-1">
            <FooterLink href="#features">Real-Time Monitoring</FooterLink>
            <FooterLink href="#features">AI Schema Insights</FooterLink>
            <FooterLink href="#features">Team Collaboration</FooterLink>
            <FooterLink href="#features">PostgreSQL Security</FooterLink>
        </ul>
   );

  return (
    <footer 
      ref={footerRef}
      className={`relative bg-white text-slate-500 py-16 px-6 sm:px-10 lg:px-16 
                  border-t border-slate-200
                  scroll-fade-in ${isFooterVisible ? 'is-visible' : ''}`} 
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* 1. Brand Column */}
          <div className="md:col-span-1 lg:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
                {/* Logo Icon */}
                <img 
                  src="/DPLogo2.png" 
                  alt="DataPulse" 
                  className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
                
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">DataPulse</h3>
            </div>
            
            <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
              The mission control for your data infrastructure. Monitor, analyze, and secure your databases with precision.
            </p>
            
            {/* Socials */}
            {/* <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
            </div> */}
          </div>
          
          {/* Mobile Accordions */}
          <div className="md:hidden border-t border-slate-100 mt-4">
             <AccordionItem title="Platform">{platformLinks}</AccordionItem>
             <AccordionItem title="Features">{featureLinks}</AccordionItem>
          </div>
          
          {/* Desktop Columns */}
          <div className="hidden md:block">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Platform</h4>
            {platformLinks}
          </div>

          <div className="hidden md:block">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Features</h4>
            {featureLinks}
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Contact</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:support@datapulse.com" className="flex items-start gap-3 group">
                  <div className="mt-1 p-1.5 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-sm">
                    <span className="block text-slate-900 font-medium group-hover:text-blue-600 transition-colors">Email Us</span>
                    <span className="text-slate-500">datapulseapp@gmail.com</span>
                  </div>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 p-1.5 rounded-md bg-blue-50 text-blue-600">
                   <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="text-sm text-slate-500">
                  <span className="block text-slate-900 font-medium">Location</span>
                  Hyderabad, India
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-400">
      <p>&copy; {new Date().getFullYear()} DataPulse Inc. All rights reserved.</p>

      <div className="flex gap-8">
        <button
          onClick={() => navigate("/legal")}
          className="hover:text-slate-600 transition-colors"
        >
          Privacy Policy
        </button>
        <button
          onClick={() => navigate("/legal")}
          className="hover:text-slate-600 transition-colors"
        >
          Terms of Service
        </button>
        <button
          onClick={() => navigate("/legal")}
          className="hover:text-slate-600 transition-colors"
        >
          Cookie Settings
        </button>
      </div>
    </div>

      </div>
    </footer>
  );
}