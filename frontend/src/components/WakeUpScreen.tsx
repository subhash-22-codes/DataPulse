import React, { useState, useEffect } from 'react';
import { Server, ShieldCheck, Zap, Globe, Lock, Activity, Terminal, AlertTriangle, RefreshCw, XCircle, CheckCircle2, Cpu } from 'lucide-react';

// -----------------------------------------------------------------------
// THE SQUAD
// -----------------------------------------------------------------------
const TEAM = [
  {
    name: "Subhash Yaganti",
    role: "Developer",
    image: "/images/Subhash.jpg", 
    status: "Root Access",
    linkedin: "https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" 
  },
  {
    name: "Siri Mahalaxmi Vemula",
    role: "Developer",
    image: "images/Siri.jpg", 
    status: "System Admin",
    linkedin: "https://www.linkedin.com/in/vemula-siri-mahalaxmi-b4b624319/" 
  }
];

interface WakeUpScreenProps {
    onRetry?: () => void;
    isSystemReady?: boolean; 
    onAnimationComplete?: () => void; 
}

export const WakeUpScreen = ({ onRetry, isSystemReady, onAnimationComplete }: WakeUpScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [showTeam, setShowTeam] = useState(false);
  const [isError, setIsError] = useState(false);

  const messages = [
    { text: "INITIALIZING DATAPULSE CLOUD...", icon: Globe },
    { text: "PROVISIONING INSTANCE CONTAINER...", icon: Server },
    { text: "ESTABLISHING SECURE HANDSHAKE...", icon: Lock },
    { text: "INJECTING ENVIRONMENT VARIABLES...", icon: Terminal },
    { text: "VERIFYING ENCRYPTED CREDENTIALS...", icon: ShieldCheck },
    { text: "OPTIMIZING MEMORY ALLOCATION...", icon: Cpu },
    { text: "STARTING UP BACKEND SERVICES...", icon: Zap },
  ];

  useEffect(() => {
    if (isSystemReady) {
      setIsError(false);
      setLongWait(false);
      setProgress(100);

      const exitTimer = setTimeout(() => {
        if (onAnimationComplete) onAnimationComplete();
      }, 800);

      return () => clearTimeout(exitTimer);
    }
  }, [isSystemReady, onAnimationComplete]);


  useEffect(() => {
    setSessionId(`SES-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);

    const timer = setInterval(() => {
      setProgress((old) => {
        if (isSystemReady) return 100;
        if (old >= 99) return 99;
        const remaining = 99 - old;
        const jump = Math.random() * (remaining * 0.15);
        return Math.min(old + Math.max(jump, 0.2), 99);
      });
    }, 800);

    const messageTimer = setInterval(() => {
        if (!isSystemReady) {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }
    }, 2500);

    const teamTimer = setTimeout(() => setShowTeam(true), 1500);
    const longWaitTimer = setTimeout(() => setLongWait(true), 15000); 
    
    const failureTimer = setTimeout(() => {
      if (!isSystemReady) {
          setIsError(true);
          setLongWait(false);
      }
    }, 180000); 

    return () => {
      clearInterval(timer);
      clearInterval(messageTimer);
      clearTimeout(longWaitTimer);
      clearTimeout(teamTimer);
      clearTimeout(failureTimer);
    };
  }, [isSystemReady]);

  const handleRetry = () => {
    setIsError(false);
    setProgress(0);
    setLongWait(false);
    if (onRetry) onRetry();
    window.location.reload();
  };

  let CurrentIcon = messages[messageIndex].icon;
  if (isError) CurrentIcon = AlertTriangle;
  if (isSystemReady) CurrentIcon = CheckCircle2;

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-4 z-[9999] text-zinc-100 font-sans selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] ${isError ? 'opacity-10' : ''}`}></div>
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-zinc-950/60 to-zinc-950"></div>
      </div>

      {isError && (
        <div className="absolute inset-0 z-0 bg-red-500/5 animate-pulse pointer-events-none"></div>
      )}

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-start text-[9px] md:text-[10px] font-mono text-zinc-600 z-20">
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">DATAPULSE SYS // 
            {isError ? (
               <span className="text-red-500 font-bold animate-pulse"> OFFLINE</span>
            ) : (
               <span className={`animate-pulse ${isSystemReady ? 'text-cyan-400' : 'text-amber-400'}`}> BOOTING</span>
            )}
          </span>
          <span className="opacity-70">{sessionId}</span>
        </div>
        <div className="text-right flex flex-col gap-1">
          <span>REGION: <span className="text-zinc-400">US-EAST-1</span></span>
          <span className="flex items-center justify-end gap-2">
            LATENCY: <span className={isError ? "text-red-500" : "text-zinc-400"}>{isError ? "TIMEOUT" : "48ms"}</span> 
            <Activity className={`w-3 h-3 ${isError ? "text-red-500" : "text-cyan-500"}`} />
          </span>
        </div>
      </div>

      {/* CENTER CONTENT */}
      <div className="z-10 w-full max-w-sm flex flex-col items-center relative mt-[-40px] md:mt-0">
        
        {/* LOGO */}
        <div className="relative mb-8 flex flex-col items-center group">
          <div className={`absolute inset-0 blur-2xl rounded-full opacity-50 transition-colors duration-500 ${isError ? 'bg-red-500/20' : 'bg-cyan-500/5'}`}></div>
          <img 
            src="https://res.cloudinary.com/dggciuh9l/image/upload/v1761320636/profile_pics/fk2abjuswx8kzi01b2dk.png" 
            alt="DataPulse System" 
            className={`w-20 h-20 object-contain drop-shadow-2xl relative z-10 transition-all duration-500 ${isError ? 'grayscale contrast-125' : ''}`}
          />
          <div className={`mt-4 text-[10px] font-mono tracking-[0.2em] flex items-center gap-2 border px-3 py-1 rounded-full backdrop-blur-md transition-colors duration-300 ${isError ? 'border-red-500/30 bg-red-950/50 text-red-400' : 'border-zinc-800/50 bg-zinc-900/80 text-zinc-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isError ? 'bg-red-500' : 'bg-cyan-500'}`}></span>
            {isError ? "SYSTEM FAILURE" : (isSystemReady ? "ACCESS GRANTED" : "SYSTEM BOOT v1.1.0")}
          </div>
        </div>

        {/* LOADING UI */}
        {isError ? (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
             <div className="text-red-500 mb-2"><XCircle size={32} /></div>
             <h3 className="text-zinc-300 font-medium text-sm tracking-wide mb-1">Connection Timed Out</h3>
             <p className="text-zinc-500 text-[10px] text-center max-w-[250px] mb-6 leading-relaxed">
               The server is taking too long to respond. This might be due to a cold start or maintenance.
             </p>
             <button 
               onClick={handleRetry}
               className="group flex items-center gap-2 px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
               <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
               Retry Sequence
             </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4 px-6">
            <div className={`h-5 flex items-center justify-center space-x-2 w-full transition-colors duration-300 ${isSystemReady ? 'text-emerald-400' : 'text-cyan-400/80'}`}>
              <CurrentIcon className={`w-3.5 h-3.5 ${!isSystemReady && 'animate-spin-slow'}`} />
              <span className="font-mono text-[11px] tracking-wide uppercase truncate animate-in fade-in slide-in-from-bottom-1 duration-300" key={isSystemReady ? 'done' : messageIndex}>
                {isSystemReady ? "Connection Established" : messages[messageIndex].text}
              </span>
            </div>

            <div className="w-full h-[2px] bg-zinc-800 rounded-full overflow-hidden relative">
              <div 
                className={`absolute top-0 left-0 h-full shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300 ease-out ${isSystemReady ? 'bg-emerald-500 w-full' : 'bg-cyan-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="w-full flex justify-between items-center text-[9px] text-zinc-500 font-mono tracking-wider uppercase">
              <span>{isSystemReady ? "Launch Sequence" : "Loading Modules"}</span>
              <span className={isSystemReady ? "text-emerald-500 font-bold" : "text-zinc-400"}>{Math.floor(progress)}%</span>
            </div>
           
          </div>
        )}

          <div
            className={`mt-4 transition-all duration-300 ease-out ${
              longWait && !isError && !isSystemReady
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <div
              className="
                mx-auto
                flex items-center gap-2
                text-[10px] leading-relaxed text-zinc-500
                max-w-[260px]

                sm:text-[11px]
                sm:max-w-[320px]

                md:max-w-none
                md:px-3 md:py-2
                md:rounded-md
                md:border md:border-zinc-800/60
                md:bg-zinc-900/40
              "
            >
              <Server className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />

              <span>
                Server is waking up from idle state. Initial load may take up to ~45 seconds.
              </span>
            </div>
          </div>

      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* PROFESSIONAL FOOTER - NO GIMMICKS */}
      {/* ----------------------------------------------------------------------- */}
      <div 
        className={`absolute bottom-8 left-0 w-full flex flex-col items-center justify-center gap-3 transition-all duration-1000 ease-out z-30 ${showTeam ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
          {/* Label */}
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
            Engineered by
          </div>

          {/* Team Row */}
          <div className="flex items-center gap-8">
            {TEAM.map((member, idx) => (
              <a 
                key={idx}
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                // No background hover, just simple opacity change. No grayscale.
                className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                title={`Visit ${member.name}'s LinkedIn`}
              >
                  {/* Avatar - Full color, simple border */}
                  <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                  />
                
                <div className="flex flex-col text-left">
                   <span className="text-[10px] font-medium text-zinc-300 leading-none">
                     {member.name}
                   </span>
                   <span className="text-[9px] text-zinc-600 font-mono mt-1">
                     {member.role}
                   </span>
                </div>
              </a>
            ))}
          </div>
      </div>

    </div>
  );
};