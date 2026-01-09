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
    className="
      /* Alignment Fix: Centers it perfectly under the button */
      absolute top-full left-1/2 -translate-x-1/2 mt-3 
      
      /* Responsive Width: 600px on big screens, shrinks on smaller ones */
      w-[90vw] max-w-[600px] 
      
      bg-white rounded-xl shadow-xl border border-slate-100 
      p-3 grid grid-cols-1 sm:grid-cols-2 gap-1 z-50
      animate-in fade-in zoom-in-95 duration-200
    "
  >
    {items.map((item) => (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        className="
          group flex items-center gap-4 p-3 
          rounded-lg hover:bg-slate-50 transition-colors text-left
        "
      >
        {/* Simple Minimal Icon */}
        <div className={`
          flex shrink-0 items-center justify-center 
          h-10 w-10 rounded-lg border border-slate-50
          ${item.color.replace('bg-', 'bg-opacity-10 bg-')} 
        `}>
          <item.icon className="w-5 h-5 text-slate-600" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold font-manrope text-slate-900 group-hover:text-blue-600 transition-colors">
            {item.name}
          </span>
          <p className="text-xs text-slate-500 truncate">
            {item.subdomains.slice(0, 2).join(' & ')}
          </p>
        </div>
      </button>
    ))}

    {/* Footer Link: Minimal & Clean */}
    <div className="sm:col-span-2 mt-2 px-3 py-3 bg-slate-50/50 rounded-lg flex justify-between items-center border border-slate-100/50">
      <span className="text-[12px] font-manrope text-slate-500">
        Ready to monitor your infrastructure?
      </span>
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
    name: 'Stay on Top of Data Changes', 
    subdomains: [
      'Track updates in your data',
      'Spot structural changes early',
      'Understand metric differences'
    ],
    icon: Activity,
    color: 'bg-blue-100' 
  },
  { 
    id: 'ai-insights', 
    name: 'Clear Explanations', 
    subdomains: [
      'Understand why data changed',
      'Get context for new fields',
      'Helpful summaries, not raw diffs'
    ],
    icon: Brain,
    color: 'bg-purple-100'
  },
  { 
    id: 'security', 
    name: 'Built with Security in Mind', 
    subdomains: [
      'Protected accounts',
      'Controlled team access',
      'Activity visibility'
    ],
    icon: ShieldCheck,
    color: 'bg-emerald-100'
  },
  { 
    id: 'integrations', 
    name: 'Works with Your Data', 
    subdomains: [
      'CSV uploads',
      'Databases',
      'APIs'
    ],
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
          <div className="hidden lg:flex items-center gap-2">
            <Link 
              to="/" 
              className="
                px-3 py-2 
                text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em] 
                rounded-sm transition-all 
                hover:bg-slate-50 hover:text-slate-900
              "
            >
              Home
            </Link>
            
            {/* Features Dropdown */}
            <div className="relative" ref={featuresRef}>
              <button
                onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                className={`
                  px-3 py-2 
                  text-[12px] font-bold font-manrope tracking-[0.2em] 
                  rounded-sm transition-all 
                  flex items-center gap-2
                  ${isFeaturesOpen 
                    ? 'text-blue-600 bg-slate-50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
                aria-haspopup="true"
                aria-expanded={isFeaturesOpen}
              >
                Features
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 stroke-[3] ${isFeaturesOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
              </button>
              
              {isFeaturesOpen && (
                <div className="absolute top-full left-0 mt-1">
                  <FeaturesMenu 
                    items={featuresList} 
                    handleItemClick={() => {
                      handleItemClick();      
                      setIsFeaturesOpen(false); 
                    }} 
                  />
                </div>
              )}
            </div>
            
            <button 
              onClick={() => handleScrollToSection('architecture')} 
              className="
                px-3 py-2 
                text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em] 
                rounded-sm transition-all 
                hover:bg-slate-50 hover:text-slate-900
              "
            >
              Architecture
            </button>
            
            <button 
              onClick={() => handleScrollToSection('about')} 
              className="
                px-3 py-2 
                text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em] 
                rounded-sm transition-all 
                hover:bg-slate-50 hover:text-slate-900
              "
            >
              About
            </button>
          </div>

          {/* === DESKTOP ACTIONS === */}
          
          <div className="hidden lg:flex items-center gap-6">
            {/* LOG IN: Clean Utility Link */}
            <Link 
              to="/login"
              className="
                text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em]
                hover:text-slate-900 transition-all
              "
            >
              Log in
            </Link>

            {/* GET STARTED: Sharp Primary Trigger */}
            <Link
              to="/register" 
              className="
                group relative 
                inline-flex items-center gap-2 
                h-9 px-5
                bg-blue-600 text-white 
                rounded-sm 
                text-[12px] font-bold font-manrope tracking-[0.2em]
                shadow-sm transition-all 
                hover:bg-blue-700 active:scale-95
              "
            >
              <span>Get Started</span>
              <ArrowRight className="w-3 h-3 stroke-[3] transition-transform group-hover:translate-x-1" />
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
                {/* HOME LINK */}
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex items-center justify-between w-full py-4 px-3 rounded-sm text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em] border-b border-slate-100 active:bg-slate-50 active:text-slate-900 transition-all"
                >
                  Home
                </Link>

                {/* ARCHITECTURE BUTTON */}
                <button 
                  onClick={() => { handleScrollToSection('architecture'); setIsMobileMenuOpen(false); }} 
                  className="flex items-center justify-between w-full text-left py-4 px-3 rounded-sm text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em] border-b border-slate-100 active:bg-slate-50 active:text-slate-900 transition-all"
                >
                  Architecture
                </button>

                {/* ABOUT BUTTON */}
                <button 
                  onClick={() => { handleScrollToSection('about'); setIsMobileMenuOpen(false); }} 
                  className="flex items-center justify-between w-full text-left py-4 px-3 rounded-sm text-[12px] font-bold text-slate-500 font-manrope tracking-[0.2em] border-b border-slate-100 active:bg-slate-50 active:text-slate-900 transition-all"
                >
                  About
                </button>

                {/* FEATURES ACCORDION */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsMobileFeaturesOpen(!isMobileFeaturesOpen)}
                    className="flex items-center justify-between w-full py-4 px-3 rounded-sm text-[12px] font-bold text-slate-900 font-manrope tracking-[0.2em] active:bg-slate-50 transition-all"
                  >
                    <span>Features</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 stroke-[2.5] ${isMobileFeaturesOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                  </button>
                  
                  {/* Animated Feature List */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMobileFeaturesOpen ? 'max-h-[500px] opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
                    <div className="grid gap-1 pl-2 pr-2">
                      {featuresList.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-4 py-3 px-3 rounded-sm border border-transparent active:border-slate-200 active:bg-slate-50 group transition-all" 
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {/* Square Industrial Icon Wrapper */}
                          <div className={`flex items-center justify-center h-8 w-8 rounded-sm ${item.color.replace('bg-', 'bg-opacity-10 bg-')} border border-slate-50 shadow-sm`}>
                            <item.icon className="w-3.5 h-3.5 text-slate-700" />
                          </div>
                          
                          <span className="text-[11px] font-manrope font-bold text-slate-700 tracking-wider group-active:text-blue-600">
                            {item.name}
                          </span>
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
                className="
                  flex items-center justify-center gap-3 
                  w-full h-12 
                  bg-white border border-slate-200
                  text-slate-600 active:text-slate-900
                  rounded-sm 
                  text-[12px] font-bold font-manrope tracking-[0.25em]
                  shadow-sm transition-all active:scale-[0.97]
                  active:bg-slate-50
                "
              >
                <LogIn className="w-3.5 h-3.5 stroke-[3]" />
                <span>Log in</span>
              </Link>
               <Link
                  to="/register"
                  className="
                    flex items-center justify-center gap-3 
                    w-full h-12 
                    bg-blue-600 active:bg-blue-700 
                    text-white 
                    rounded-sm 
                    text-[12px] font-bold font-manrope tracking-[0.25em]
                    shadow-sm transition-all active:scale-[0.97]
                  "
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </Link>
            </div>

          </div>
      </div>
    </header>
  );
}