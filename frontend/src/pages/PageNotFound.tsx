import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="z-10 flex flex-col items-center w-full max-w-lg">
        
        {/* --- INDUSTRIAL SERVER RACK SVG --- */}
        <div className="w-full max-w-[340px] aspect-square relative flex items-center justify-center mb-6">
          <svg
            viewBox="0 0 340 340"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl"
          >
            <defs>
              <linearGradient id="metal-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* 1. The Rack Cabinet Frame (Solid, Heavy) */}
            <rect x="40" y="20" width="260" height="300" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="4" />
            
            {/* 2. Side Rails (Vertical mounting bars) */}
            <rect x="50" y="30" width="10" height="280" fill="#1e293b" />
            <rect x="280" y="30" width="10" height="280" fill="#1e293b" />

            {/* 3. SERVER UNITS (The Stack) */}
            
            {/* Unit 1: Healthy (Top) */}
            <g transform="translate(65, 40)">
               <rect x="0" y="0" width="210" height="40" rx="2" fill="url(#metal-gradient)" stroke="#475569" strokeWidth="1" />
               {/* Vents */}
               <path d="M10 10 H60 M10 20 H60 M10 30 H60" stroke="#0f172a" strokeWidth="2" />
               {/* Blinking Activity Lights */}
               <motion.circle cx="190" cy="20" r="3" fill="#10b981" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.2, repeat: Infinity }} />
               <circle cx="175" cy="20" r="3" fill="#10b981" />
            </g>

            {/* Unit 2: Healthy */}
            <g transform="translate(65, 90)">
               <rect x="0" y="0" width="210" height="40" rx="2" fill="url(#metal-gradient)" stroke="#475569" strokeWidth="1" />
               <path d="M10 10 H60 M10 20 H60 M10 30 H60" stroke="#0f172a" strokeWidth="2" />
               <motion.circle cx="190" cy="20" r="3" fill="#10b981" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
               <circle cx="175" cy="20" r="3" fill="#10b981" />
            </g>

            {/* Unit 3: THE ERROR (Dark / Dead) */}
            <g transform="translate(65, 140)">
               {/* Darker casing to show it's offline */}
               <rect x="0" y="0" width="210" height="40" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
               {/* Red Error Light (Solid, Steady Warning) */}
               <circle cx="190" cy="20" r="3" fill="#ef4444" />
               {/* Label */}
               <text x="80" y="25" fill="#ef4444" fontFamily="monospace" fontSize="12" letterSpacing="2">OFFLINE</text>
            </g>

            {/* Unit 4: Healthy (Bottom) */}
            <g transform="translate(65, 190)">
               <rect x="0" y="0" width="210" height="40" rx="2" fill="url(#metal-gradient)" stroke="#475569" strokeWidth="1" />
               <path d="M10 10 H60 M10 20 H60 M10 30 H60" stroke="#0f172a" strokeWidth="2" />
               <motion.circle cx="190" cy="20" r="3" fill="#10b981" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
               <circle cx="175" cy="20" r="3" fill="#10b981" />
            </g>

            {/* 4. THE DISCONNECTED CABLE (Realistic Physics) */}
            {/* It hangs from Unit 2 (Healthy) down past Unit 3 (Dead), dangling loosely */}
            <g transform="translate(150, 130)">
               {/* The Wire - Dangling with slight gravity sway */}
               <motion.path 
                 d="M 0 0 C 0 20, -10 40, -5 60" 
                 stroke="#3b82f6" 
                 strokeWidth="3" 
                 fill="none"
                 strokeLinecap="round"
                 animate={{ d: ["M 0 0 C 0 20, -10 40, -5 60", "M 0 0 C 0 20, -5 40, 0 60", "M 0 0 C 0 20, -10 40, -5 60"] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               />
               
               {/* The Connector Head (RJ45) hanging at the end */}
               <motion.g
                 animate={{ x: [-5, 0, -5], rotate: [-5, 5, -5] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               >
                  <rect x="-10" y="60" width="10" height="14" fill="#64748b" rx="1" />
                  <path d="M-8 74 V78 M-5 74 V78" stroke="#cbd5e1" strokeWidth="1" />
               </motion.g>
            </g>

          </svg>
        </div>

        {/* --- SYSTEM LOG TEXT --- */}
        <div className="w-full text-left space-y-6 font-mono border-t border-slate-800/50 pt-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-200">
              Connection_Reset
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Error 404: The upstream monitor is unresponsive.
            </p>
          </div>

          {/* Code Block Style Details */}
          <div className="bg-[#020617] p-4 rounded-lg border border-slate-800 text-xs text-slate-400">
            <p><span className="text-blue-500">root@datapulse</span>:<span className="text-blue-300">~</span>$ ping target_url</p>
            <p>Request timed out.</p>
            <p>Request timed out.</p>
            <p className="text-red-500">0 packets received. Host unreachable.</p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-md transition-all border border-slate-700 hover:border-slate-500"
          >
            Run Diagnostics / Go Home
          </Link>
        </div>

      </div>
    </div>
  );
}