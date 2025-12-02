import React, { useState, useEffect, useRef } from 'react';
import { 
  SiRedis, SiCelery, SiDocker, SiPython, SiPandas, 
  SiVercel, SiSupabase, SiGithub, SiPostgresql, 
  SiGoogle, SiRender, SiReact, SiTypescript, SiTailwindcss,
  SiBrevo
} from 'react-icons/si';
import { VscVscode } from 'react-icons/vsc'; 
import { FaCode, FaBolt, FaLayerGroup, FaTools, FaLock, FaGlobeAmericas, FaLaptopCode, FaGithub } from 'react-icons/fa';

// --- INTERNAL HOOK: useInView ---
function useInView({ threshold = 0.1 }: { threshold?: number } = {}) {
  const [isIntersecting, setIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
          observer.disconnect(); 
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isIntersecting] as const;
}

// --- TECH STACK DATA ---
const techPipeline = [
  {
    id: "backend",
    step: "01",
    title: "Backend & Cloud",
    subtitle: "Compute Engine",
    icon: FaBolt,
    items: [
      { name: "Python", icon: SiPython, color: "#3776AB", badge: "3.11+", metric: "Runtime", description: "High-performance logic core." },
      { name: "Render", icon: SiRender, color: "#46E3B7", badge: "Cloud", metric: "Auto-Scale", description: "Managed backend deployment." },
      { name: "Celery", icon: SiCelery, color: "#37814A", badge: "Queue", metric: "Async", description: "Distributed task processing." },
      { name: "Docker", icon: SiDocker, color: "#2496ED", badge: "OS", metric: "Container", description: "Consistent environments." },
    ]
  },
  {
    id: "data",
    step: "02",
    title: "Data Layer",
    subtitle: "Storage & Analytics",
    icon: FaLayerGroup,
    items: [
      { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1", badge: "DB", metric: "ACID", description: "Primary relational storage." },
      { name: "Redis", icon: SiRedis, color: "#DC382D", badge: "Cache", metric: "<1ms", description: "In-memory speed layer." },
      { name: "Supabase", icon: SiSupabase, color: "#3ECF8E", badge: "Sync", metric: "Realtime", description: "Live database subscriptions." },
      { name: "Pandas", icon: SiPandas, color: "#150458", badge: "Data", metric: "Analysis", description: "Vectorized data manipulation." },
    ]
  },
  {
    id: "frontend",
    step: "03",
    title: "Frontend & Edge",
    subtitle: "User Experience",
    icon: FaCode,
    items: [
      { name: "React", icon: SiReact, color: "#61DAFB", badge: "UI", metric: "v18", description: "Component-based architecture." },
      { name: "Vercel", icon: SiVercel, color: "#000000", badge: "CDN", metric: "Global", description: "Zero-config edge deployment." },
      { name: "TypeScript", icon: SiTypescript, color: "#3178C6", badge: "TS", metric: "Strict", description: "Type-safe development." },
      { name: "Tailwind", icon: SiTailwindcss, color: "#06B6D4", badge: "CSS", metric: "JIT", description: "Utility-first styling." },
    ]
  },
  {
    id: "tools",
    step: "04",
    title: "Tools & Integrations",
    subtitle: "DevSecOps",
    icon: FaTools,
    items: [
      { name: "GitHub", icon: SiGithub, color: "#181717", badge: "Git", metric: "CI/CD", description: "Version control & actions." },
      { name: "VS Code", icon: VscVscode, color: "#007ACC", badge: "IDE", metric: "Editor", description: "Development environment." },
      { name: "Google Auth", icon: SiGoogle, color: "#4285F4", badge: "Auth", metric: "OAuth2", description: "Secure identity provider." },
      { name: "Brevo", icon: SiBrevo, color: "#006A4E", badge: "Mail", metric: "API", description: "Transactional email service." },
    ]
  }
];

// --- COMPONENT: TECH CARD ---
type TechItem = typeof techPipeline[0]['items'][0];
const TechCard: React.FC<{ item: TechItem; index: number }> = ({ item }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group relative p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: item.color }} />
      <div className="absolute left-0 top-0 h-full w-1 transform origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out" style={{ backgroundColor: item.color }} />

      <div className="flex items-center justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm border border-slate-50"
          style={{ backgroundColor: isHovered ? item.color : '#F8FAFC' }}
        >
          <item.icon className="w-5 h-5 transition-colors duration-300" style={{ color: isHovered ? '#FFFFFF' : item.color }} />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{item.badge}</span>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
            <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{item.name}</h4>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.metric}</span>
        </div>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{item.description}</p>
      </div>
    </div>
  );
};

export default function About() {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  return (
    <section id="about" className="relative py-24 lg:py-32 overflow-hidden bg-slate-50/50 border-t border-slate-200 " >
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-white via-transparent to-white opacity-80" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-8">
        
        {/* HEADER */}
        <div ref={ref} className={`text-center max-w-4xl mx-auto mb-20 scroll-fade-in ${isInView ? 'is-visible' : ''}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-900 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            System Architecture
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            The DataPulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Engine</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-500 leading-relaxed font-light">
            A high-velocity pipeline designed to ingest, process, and visualize data with <span className="font-semibold text-slate-900">zero latency</span>.
          </p>
        </div>


        {/* --- TECH GRID --- */}
        <div className="relative">
          {/* Desktop Connection Lines */}
          <div className="hidden xl:block absolute top-[80px] left-[15%] right-[15%] h-0.5 bg-slate-200 -z-10">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent w-1/3 animate-shimmer" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-10">
            {techPipeline.map((stage, idx) => (
              <div key={stage.id} className={`relative flex flex-col group/stage scroll-fade-in ${isInView ? 'is-visible' : ''}`} style={{ transitionDelay: `${idx * 150}ms` }}>
                
                {/* Stage Indicator */}
                <div className="flex flex-col items-center mb-8 relative">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-center relative z-10 group-hover/stage:scale-110 group-hover/stage:border-blue-200 transition-all duration-300">
                    <stage.icon className="w-6 h-6 text-slate-400 group-hover/stage:text-blue-600 transition-colors" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">{stage.step}</div>
                  </div>
                  {idx !== techPipeline.length - 1 && <div className="absolute top-14 bottom-[-40px] w-0.5 bg-slate-200 xl:hidden" />}
                </div>

                {/* Header */}
                <div className="text-center mb-6 px-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{stage.title}</h3>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">{stage.subtitle}</p>
                </div>

                {/* Cards */}
                <div className="space-y-3 relative">
                  <div className="absolute -inset-3 bg-slate-100/50 rounded-3xl -z-10 opacity-0 group-hover/stage:opacity-100 transition-opacity duration-500" />
                  {stage.items.map((tech, itemIdx) => (
                    <TechCard key={tech.name} item={tech} index={itemIdx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- CORE PRINCIPLES --- */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200 border-t border-b border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
           {[
             { label: "Privacy First", value: "Zero", sub: "Data Telemetry", icon: FaLock },
             { label: "Transparency", value: "100%", sub: "Open Source", icon: FaGithub },
             { label: "Frontend Speed", value: "Global", sub: "Vercel Edge", icon: FaGlobeAmericas },
             { label: "Architecture", value: "Modern", sub: "Type-Safe Stack", icon: FaLaptopCode },
           ].map((stat, i) => (
             <div key={i} className="p-8 text-center hover:bg-slate-50 transition-colors group">
               <div className="flex justify-center mb-3 text-slate-300 group-hover:text-blue-600 transition-colors">
                  <stat.icon className="w-6 h-6" />
               </div>
               <div className="text-2xl font-extrabold text-slate-900 mb-1">{stat.value}</div>
               <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
               <div className="text-[10px] text-blue-600 font-medium mt-1">{stat.sub}</div>
             </div>
           ))}
        </div>

      </div>
    </section>
  );
}