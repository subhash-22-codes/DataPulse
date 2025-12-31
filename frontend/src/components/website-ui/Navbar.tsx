import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, ArrowRight, LogIn, Activity, Brain, ShieldCheck, Database } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface Service {
  id: string;
  name: string;
  subdomains: string[];
  icon: React.ElementType; // Use Lucide Icon component type
  color: string; // Add color for "Notion-like" feel
}

// --- MEGA MENU (Desktop) ---
const FeaturesMenu: React.FC<{
  items: Service[]; 
  handleItemClick: (id: string) => void;
}> = ({ items, handleItemClick }) => (
   <div 
     className="absolute top-full left-1/2 -translate-x-1/2 mt-3 
               bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_40px_100px_-20px_rgba(50,50,93,0.15)] 
               border border-white/20 ring-1 ring-slate-900/5
               w-[640px] p-6 grid grid-cols-2 gap-x-6 gap-y-4
               animate-fadeInUp z-50"
     style={{ animationDuration: '200ms' }}
   >
     {/* Glass Arrow */}
     <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/80 border-t border-l border-white/20 rotate-45 backdrop-blur-xl"></div>

     {items.map((item) => (
       <button
         key={item.id}
         onClick={() => handleItemClick(item.id)}
         className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/60 transition-all duration-200 text-left border border-transparent hover:border-slate-100/50"
       >
         {/* Notion-style Icon Container */}
         <div className={`p-2.5 rounded-lg ${item.color} text-slate-700 group-hover:scale-110 transition-transform shrink-0 shadow-sm border border-black/5`}>
           <item.icon className="w-5 h-5" />
         </div>
         <div>
           <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors text-sm mb-1">
             {item.name}
           </div>
           <p className="text-xs text-slate-500 leading-relaxed font-medium">
             {item.subdomains.slice(0, 2).join(', ')}...
           </p>
         </div>
       </button>
     ))}
     
     <div className="col-span-2 mt-2 pt-4 border-t border-slate-100/50 flex justify-between items-center px-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Explore Platform</span>
        <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
     </div>
   </div>
);

// --- MAIN NAVBAR ---
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isMobileFeaturesOpen, setIsMobileFeaturesOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { 
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { 
      const handleClickOutside = (event: MouseEvent) => {
        if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
          setIsFeaturesOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFeaturesOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);
  
  // UPDATED: Specific Icons & Colors for Notion-like feel
  const featuresList: Service[] = [ 
    { 
      id: 'monitoring', 
      name: 'Real-Time Monitoring', 
      subdomains: ['Live Metrics', 'Anomaly Detection', 'Zero Latency'],
      icon: Activity,
      color: 'bg-blue-100' 
    },
    { 
      id: 'ai-insights', 
      name: 'AI & Analytics', 
      subdomains: ['Schema Analysis', 'Performance Tips', 'Auto-Scaling'],
      icon: Brain,
      color: 'bg-purple-100'
    },
    { 
      id: 'security', 
      name: 'Security & Access', 
      subdomains: ['RBAC', 'Audit Logs', 'SSO Integration'],
      icon: ShieldCheck,
      color: 'bg-emerald-100'
    },
    { 
      id: 'integrations', 
      name: 'Data Integrations', 
      subdomains: ['PostgreSQL', 'Redis', 'Custom APIs'],
      icon: Database,
      color: 'bg-orange-100'
    }
  ];

  const handleScrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    setIsFeaturesOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };
const handleItemClick = () => {
  const section = document.getElementById('features');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

  

  return (
    <header 
      // Reduced height to h-[72px] for a slightly more compact "Hard Prod" look
      className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300`}
    >
      {/* 1. SEPARATE BACKGROUND LAYER (Higher Blur, Less Opacity) */}
      <div 
        className={`absolute inset-0 transition-all duration-300 border-b border-transparent
          ${isScrolled 
            ? 'bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]' 
            : 'bg-white/0 border-transparent'
          }`}
      />

      {/* 2. NAVBAR CONTENT */}
      <div className="relative z-50 h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          
          {/* === LOGO === */}
          <Link
            to="/"
            className="flex items-center gap-3 focus:outline-none group"
            aria-label="DataPulse Home"
          >
            <img 
              src="/DPLogo2.png" 
              alt="DataPulse" 
              className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* === DESKTOP NAV === */}
          <div className="hidden lg:flex items-center gap-1">
            <Link 
              to="/" 
              className="px-4 py-2 font-poppins text-sm font-semibold text-slate-600 rounded-full transition-all hover:bg-slate-100/50 hover:text-blue-700"
            >
              Home
            </Link>
            
            {/* Features Dropdown */}
            <div className="relative" ref={featuresRef}>
               <button
                 onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                 className={`px-4 py-2 text-sm font-semibold font-poppins rounded-full transition-all flex items-center gap-1.5 hover:bg-slate-100/50 hover:text-blue-700 ${isFeaturesOpen ? 'text-blue-700 bg-blue-50/30' : 'text-slate-600'}`}
                 aria-haspopup="true"
                 aria-expanded={isFeaturesOpen}
               >
                 Features
                 <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFeaturesOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
               </button>
               {isFeaturesOpen && (
                 <FeaturesMenu 
                  items={featuresList} 
                  handleItemClick={() => {
                    handleItemClick();       // scroll to section
                    setIsFeaturesOpen(false);  // close dropdown
                  }} 
                />

               )}
            </div>
            
            <button 
              onClick={() => handleScrollToSection('architecture')} 
              className="px-4 py-2 font-poppins text-sm font-semibold text-slate-600 rounded-full transition-all hover:bg-slate-100/50 hover:text-blue-700"
            >
              Architecture
            </button>
            <button 
              onClick={() => handleScrollToSection('about')} 
              className="px-4 py-2 font-poppins text-sm font-semibold text-slate-600 rounded-full transition-all hover:bg-slate-100/50 hover:text-blue-700"
            >
              About
            </button>
          </div>

          {/* === DESKTOP ACTIONS === */}
          <div className="hidden lg:flex items-center gap-4">
            <Link 
              to="/login"
              className="text-sm font-poppins font-semibold text-slate-600 hover:text-blue-700 transition-colors"
            >
              Log in
            </Link>

            <Link
              to="/register" 
              className="group relative font-poppins inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-full overflow-hidden transition-all hover:bg-blue-700 hover:shadow-lg  active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* === MOBILE TOGGLE === */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -mr-2 text-slate-600 rounded-lg hover:bg-slate-100/50 active:scale-95 transition-all"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
      </div>

      {/* === MOBILE MENU OVERLAY (FIXED & POLISHED) === */}
      <div 
          className={`lg:hidden fixed inset-0 z-40 bg-white/80 backdrop-blur-2xl transition-all duration-300 ease-in-out 
            ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      >
          {/* pt-24 aligns with the new h-[72px] navbar + spacing */}
          <div className="flex flex-col h-full w-full pt-24 pb-10 px-6 overflow-y-auto">
            
            <div className="space-y-1 py-4">
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="font-poppins flex items-center justify-between w-full py-3.5 text-lg font-semibold text-slate-800 border-b border-slate-200/50 active:bg-white/50 rounded-lg px-2"
                >
                  Home
                </Link>
                <button 
                  onClick={() => handleScrollToSection('architecture')} 
                  className="font-poppins flex items-center justify-between w-full text-left py-3.5 text-lg font-semibold text-slate-800 border-b border-slate-200/50 active:bg-white/50 rounded-lg px-2"
                >
                  Architecture
                </button>
                <button 
                  onClick={() => handleScrollToSection('about')} 
                  className="font-poppins flex items-center justify-between w-full text-left py-3.5 text-lg font-semibold text-slate-800 border-b border-slate-200/50 active:bg-white/50 rounded-lg px-2"
                >
                  About
                </button>

                {/* Features Accordion - Minimal & Modern */}
                <div className="pt-2">
                   <button
                     onClick={() => setIsMobileFeaturesOpen(!isMobileFeaturesOpen)}
                     className="font-poppins flex items-center justify-between w-full py-3.5 text-lg font-semibold text-slate-800 rounded-lg px-2 active:bg-white/50"
                   >
                     <span>Features</span>
                     <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isMobileFeaturesOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                   </button>
                   
                   <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMobileFeaturesOpen ? 'max-h-[400px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                     <div className="grid gap-2 pl-4">
                       {featuresList.map((item) => (
                         <div key={item.id} className="font-manrope flex items-center gap-3 text-slate-600 py-3 px-3 rounded-xl active:bg-white/60 border border-transparent active:border-slate-100" onClick={() => setIsMobileMenuOpen(false)}>
                           <div className={`p-1.5 rounded-md ${item.color} text-slate-700`}>
                              <item.icon className="w-4 h-4" />
                           </div>
                           <span className="font-medium text-base text-slate-700">{item.name}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 space-y-3 pt-6 border-t border-slate-200/50">
              <Link 
                 to="/login"
                 className="font-poppins flex items-center justify-center w-full py-3.5 font-semibold text-slate-700 bg-white/80 border border-slate-200 rounded-xl active:bg-white transition-all shadow-sm backdrop-blur-sm"
               >
                 <LogIn className="w-4 h-4 mr-2" />
                 Log in
               </Link>
               <Link
                 to="/register"
                 className="font-poppins flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white font-semibold text-base rounded-xl shadow-lg shadow-blue-600/20 active:bg-blue-700 transition-all"
               >
                 Get Started
                 <ArrowRight className="w-4 h-4" />
               </Link>
            </div>

          </div>
      </div>
    </header>
  );
}