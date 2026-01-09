import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, TerminalSquare } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      
      {/* --- AMBIENT GLOW (Subtle industrial atmosphere) --- */}
     

      <div className="z-10 flex flex-col items-center w-full max-w-[360px]">
        
        {/* --- HIGH-FIDELITY INDUSTRIAL SVG --- */}
        {/* Size is controlled here (max-w-[300px]), details are preserved */}
        <div className="w-full max-w-[300px] aspect-square relative flex items-center justify-center mb-8">
          <svg
            viewBox="0 0 340 340"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl"
          >
            <defs>
              {/* Deep Industrial Metal Gradient */}
              <linearGradient id="metal-gradient-dark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" /> {/* Slate-800 */}
                <stop offset="100%" stopColor="#0f172a" /> {/* Slate-900 */}
              </linearGradient>
              {/* Error Unit Gradient */}
              <linearGradient id="error-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#171717" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>
            </defs>

            {/* 1. The Rack Cabinet Frame (Heavy, Dark) */}
            <rect x="40" y="20" width="260" height="300" rx="2" fill="#020617" stroke="#1e293b" strokeWidth="3" />
            
            {/* 2. Side Rails */}
            <rect x="52" y="30" width="8" height="280" fill="#1e293b" />
            <rect x="280" y="30" width="8" height="280" fill="#1e293b" />

            {/* --- SERVER UNITS --- */}
            
            {/* Unit 1: Healthy */}
            <g transform="translate(65, 45)">
               <rect x="0" y="0" width="210" height="38" rx="1" fill="url(#metal-gradient-dark)" stroke="#334155" strokeWidth="1" />
               {/* Vents - Sharper deeper lines */}
               <path d="M15 12 H65 M15 19 H65 M15 26 H65" stroke="#020617" strokeWidth="1.5" />
               {/* Lights */}
               <motion.circle cx="195" cy="19" r="2.5" fill="#10b981" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
               <circle cx="185" cy="19" r="2.5" fill="#10b981" opacity="0.5" />
            </g>

            {/* Unit 2: Healthy (Cable Origin) */}
            <g transform="translate(65, 95)">
               <rect x="0" y="0" width="210" height="38" rx="1" fill="url(#metal-gradient-dark)" stroke="#334155" strokeWidth="1" />
               <path d="M15 12 H65 M15 19 H65 M15 26 H65" stroke="#020617" strokeWidth="1.5" />
               <motion.circle cx="195" cy="19" r="2.5" fill="#10b981" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            </g>

            {/* Unit 3: THE ERROR (Dead/Offline) */}
            <g transform="translate(65, 145)">
               {/* Darker, dead casing */}
               <rect x="0" y="0" width="210" height="38" rx="1" fill="url(#error-gradient)" stroke="#ef4444" strokeWidth="1.5" />
               {/* Red Error Light (Solid) */}
               <circle cx="195" cy="19" r="3" fill="#ef4444" />
               <circle cx="195" cy="19" r="6" fill="#ef4444" opacity="0.2" />{/* Subtle red glow */}
               {/* Label */}
               <text x="80" y="23" fill="#ef4444" fontFamily="monospace" fontSize="10" fontWeight="bold" letterSpacing="3">OFFLINE</text>
            </g>

            {/* Unit 4: Healthy */}
            <g transform="translate(65, 195)">
               <rect x="0" y="0" width="210" height="38" rx="1" fill="url(#metal-gradient-dark)" stroke="#334155" strokeWidth="1" />
               <path d="M15 12 H65 M15 19 H65 M15 26 H65" stroke="#020617" strokeWidth="1.5" />
               <motion.circle cx="195" cy="19" r="2.5" fill="#10b981" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </g>

            {/* 4. THE DISCONNECTED CABLE (SaaS Blue) */}
            <g transform="translate(165, 130)">
               <motion.path 
                 d="M 0 0 C 0 25, -10 50, -5 70" 
                 stroke="#3b82f6" /* DataPulse Blue */
                 strokeWidth="3" 
                 fill="none"
                 strokeLinecap="round"
                 animate={{ d: ["M 0 0 C 0 25, -10 50, -5 70", "M 0 0 C 0 25, -5 50, 0 70", "M 0 0 C 0 25, -10 50, -5 70"] }}
                 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               />
               {/* Connector Head */}
               <motion.g
                 animate={{ x: [-5, 0, -5], rotate: [-3, 3, -3] }}
                 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               >
                  <rect x="-8" y="70" width="10" height="14" fill="#1e293b" stroke="#334155" rx="1" />
                  <rect x="-6" y="82" width="6" height="4" fill="#3b82f6" />
               </motion.g>
            </g>
          </svg>
        </div>

        {/* --- MINIMALIST SYSTEM TEXT --- */}
        <div className="w-full text-center space-y-8">
          <div className="space-y-3">
            {/* Technical Label */}
            <div className="flex items-center justify-center gap-2 text-red-500 font-mono text-[10px] uppercase tracking-widest font-bold">
              <span>Connection Lost</span>
            </div>
            {/* Main Header */}
            <h1 className="text-4xl font-black text-white tracking-tight">
              404: System Halt
            </h1>
            {/* Description */}
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              The upstream monitoring node is unreachable. <br />The resource may have been moved or deleted.
            </p>
          </div>

          {/* Single-line Minimal Terminal Status */}
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#0b1121] rounded-sm border border-slate-800/60 font-mono text-[11px] text-slate-500">
             <TerminalSquare className="w-3.5 h-3.5 text-slate-600" />
             <span>error: upstream_dependency_missing</span>
             <span className="w-1.5 h-4 bg-blue-500 animate-pulse"/>
          </div>

          {/* Industrial Button Pair (Sharp, Fixed Height) */}
          <div className="flex flex-col gap-3 w-full">
             <Link to="/" className="w-full">
                <button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-[13px] font-bold tracking-widest font-manrope transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2">
                  <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
                  Return to Dashboard
                </button>
             </Link>
             <button 
               onClick={() => window.location.reload()}
               className="w-full h-11 bg-transparent hover:bg-slate-900/50 text-slate-500 hover:text-slate-300 border border-slate-800/50 hover:border-slate-700 rounded-sm text-[12px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
             >
               Retry Connection
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}