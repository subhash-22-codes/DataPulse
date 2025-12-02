import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HeroIllustration } from './NotionIllustrations';
import toast from 'react-hot-toast';
// --- ICONS (Inline for zero-dependency performance) ---
const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Play = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// --- BATTERY SAVER HOOK ---
// This hook actively toggles true/false based on whether the element is on screen.
function useLiveInView({ threshold = 0.1 } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView] as const;
}

// --- OPTIMIZED WRAPPER COMPONENT ---
const BatterySaverWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ref, isVisible] = useLiveInView();

  return (
    <div ref={ref} className="w-full h-full">
      {/* If visible, render the heavy SVG. If not, render nothing (saving CPU). */}
      {isVisible ? children : <div className="w-full h-full invisible" />} 
    </div>
  );
};

const Hero = () => {
  // Animation utility
  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });

  const focusAreas = [
    "Real-Time PostgreSQL Monitoring",
    "AI Schema Insights",
    "Instant WebSocket Updates",
    "Role-Based Access Control",
    "Smart Anomaly Detection",
  ];

  // Duplicate for seamless loop
  const marqueeAreas = [...focusAreas, ...focusAreas];

  const stats = [
    { num: "Live", label: "WebSocket Sync" }, // True: You use WebSockets
    { num: "0.1s", label: "Event Processing" }, // True: Redis/Celery is that fast
    { num: "100%", label: "Open Source" },   // True: It's on GitHub
  ];

   const handleWatchDemo = () => {
    toast('Demo video coming soon!', {
      icon: '🚧',
      style: {
        borderRadius: '8px',
        background: '#1E293B',
        color: '#fff',
      },
    });
  };


  return (
    <section className="relative bg-white overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
      
      {/* === BACKGROUND AMBIENCE (Subtle & Professional) === */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Soft Blue Glow (Top Right) */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-60" />
        {/* Soft Indigo Glow (Bottom Left) */}
        <div className="absolute top-1/2 -left-24 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* === LEFT COLUMN: COPYWRITING === */}
          <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
            
            {/* Badge */}
            <div
              className="
                inline-flex items-center gap-2 
                px-2.5 py-0.5 
                rounded-full 
                bg-blue-50 border border-blue-100 
                text-blue-700 
                text-[10px] sm:text-xs md:text-sm 
                font-semibold 
                mb-6 sm:mb-8
                animate-fadeInUp
              "
              style={getAnimStyle(100)}
            >
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-600"></span>
              </span>

                <span className="text-xs leading-none tracking-wide font-manrope">
                DataPulse v1.0 — Academic Prototype (Live)
                </span>
            </div>


            {/* Headline */}
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6 animate-fadeInUp"
              style={getAnimStyle(200)}
            >
              Data monitoring <br className="hidden lg:block" />
              should be <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">instant</span>.
            </h1>

            {/* Description */}
            <p 
              className="text-lg text-slate-600 leading-relaxed mb-8 animate-fadeInUp max-w-lg mx-auto lg:mx-0"
              style={getAnimStyle(300)}
            >
              Turn messy data streams into clean, real-time intelligence. 
              Monitor PostgreSQL, APIs, and files in one secure dashboard without the enterprise bloat.
            </p>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12 animate-fadeInUp"
              style={getAnimStyle(400)}
            >
              <Link to="/register">
                <button className="group relative h-12 px-8 rounded-full bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                  Launch Dashboard
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              
              
                <button
                onClick={handleWatchDemo}
                className="h-12 px-8 rounded-full bg-white text-slate-700 border border-slate-200 font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current text-slate-400" />
                  Watch Demo
                </button>
              
            </div>

            {/* Trust Stats */}
            <div 
              className="grid grid-cols-3 gap-6 border-t border-slate-100 pt-8 animate-fadeInUp"
              style={getAnimStyle(500)}
            >
              {stats.map((item) => (
                <div key={item.label}>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {item.num}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* === RIGHT COLUMN: VISUAL REPRESENTATION (SVG Illustration) === */}
          <div 
            className="relative lg:h-auto animate-fadeInUp flex justify-center lg:justify-end"
            style={getAnimStyle(400)}
          >
            {/* The Hard Prod SVG Illustration - WRAPPED IN BATTERY SAVER */}
            <div className="relative w-full max-w-[600px] aspect-[4/3] transform hover:scale-[1.02] transition-transform duration-500">
              <BatterySaverWrapper>
                 <HeroIllustration />
              </BatterySaverWrapper>
            </div>

            {/* Floating Elements (Optional: Adds depth) */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-bounce-slow hidden sm:block">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-xs font-bold text-slate-700">System Healthy</span>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* === 2. HIGH-TECH MARQUEE (Clean Light Theme Version) === */}
      <div 
        className="relative w-full overflow-hidden mt-20 lg:mt-24 border-y border-slate-100 bg-slate-50/50 py-6 animate-fadeInUp" 
        style={getAnimStyle(600)}
      >
        <div className="flex animate-marquee">
          {marqueeAreas.map((area, i) => (
            <div 
              key={i}
              className="flex-shrink-0 px-6 mx-4 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"
            >
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
                {area}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;