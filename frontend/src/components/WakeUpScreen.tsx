import { useState, useEffect } from 'react';
import { Server, Globe, Lock, ShieldCheck, CheckCircle2, } from 'lucide-react';

const TEAM = [
  {
    name: "Subhash Yaganti",
    role: "Developer",
    image: "/images/Subhash.jpg", 
    linkedin: "https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" 
  },
  {
    name: "Siri Mahalaxmi Vemula",
    role: "Developer",
    image: "images/Siri.jpg", 
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
  const [showTeam, setShowTeam] = useState(false);
  const [isError, setIsError] = useState(false);

  // End-user friendly messages
const messages = [
  { text: "Connecting to the server…", icon: Globe },
  { text: "Getting things ready…", icon: Server },
  { text: "Setting up your workspace…", icon: Server },
  { text: "Checking security…", icon: Lock },
  { text: "Loading system data…", icon: ShieldCheck },
  { text: "Starting background services…", icon: Server },
  { text: "Syncing system configuration…", icon: Server },
  { text: "Final checks in progress…", icon: ShieldCheck },
  { text: "Almost there…", icon: Globe },
  { text: "Finishing setup…", icon: ShieldCheck },
];



  const handleRetryAction = () => {
    setIsError(false);
    if (onRetry) onRetry();
    else window.location.reload();
  };

  useEffect(() => {
    // Fake progress (never reaches 100 unless backend confirms)
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (isSystemReady) return 100;

        // Phase 1: Fast initial feedback
        if (prev < 60) {
          return prev + Math.random() * 3 + 1; // ~1–4%
        }

        // Phase 2: Slow down
        if (prev < 85) {
          return prev + Math.random() * 1.2 + 0.4; // ~0.4–1.6%
        }

        // Phase 3: Very slow (psychological wait zone)
        if (prev < 95) {
          return prev + Math.random() * 0.3 + 0.1; // ~0.1–0.4%
        }

        // Hard cap until backend wakes
        return 95;
      });
    }, 1000); 


    // Rotate user-friendly messages
    const messageTimer = setInterval(() => {
      if (!isSystemReady && !isError) {
        setMessageIndex((prev) => {
          // Stop at the last message (no fake looping)
          if (prev >= messages.length - 1) return prev;
          return prev + 1;
        });
      }
    }, 6000); // slower = calmer, more professional


    // Reveal team only if system seems healthy
    const teamTimer = setTimeout(() => {
      if (!isError) setShowTeam(true);
    }, 1500);

    // 🔑 SOFT WAIT (UX CONTROL POINT)
    const softWaitTimer = setTimeout(() => {
      if (!isSystemReady) setLongWait(true);
    }, 20000); // 20s → user gets context + control

    // 🔥 HARD FAIL (SYSTEM REALITY)
    const hardFailTimer = setTimeout(() => {
      if (!isSystemReady) {
        setIsError(true);
        setShowTeam(false);
      }
    }, 105000); // 90s → Render cold start max

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
      clearTimeout(teamTimer);
      clearTimeout(softWaitTimer);
      clearTimeout(hardFailTimer);
    };
  }, [isSystemReady, isError, messages.length]);

  // Backend finally woke up
  useEffect(() => {
    if (isSystemReady) {
      setProgress(100);
      setLongWait(false);
      setIsError(false);
      const exitTimer = setTimeout(() => {
        onAnimationComplete?.();
      }, 800);
      return () => clearTimeout(exitTimer);
    }
  }, [isSystemReady, onAnimationComplete]);

  return (
  <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-6 z-[9999] text-slate-900 font-sans">

    {/* Ultra-subtle grid for depth */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.025]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:32px_32px]" />
    </div>

    {/* Main Card */}
    <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-xl px-8 py-10 shadow-sm">

      {/* Logo */}
      <div className="mb-10 relative flex justify-center">
        <img
          src="https://res.cloudinary.com/dggciuh9l/image/upload/v1766819631/profile_pics/xnysrluddsvcfkzlatkq.png"
          alt="DataPulse"
          className={`w-24 h-24 object-contain ${
            isError ? "grayscale opacity-40" : "opacity-100"
          }`}
        />

        {isSystemReady && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border border-white">
            <CheckCircle2 size={14} />
          </div>
        )}
      </div>

      {isError ? (
        /* ERROR STATE */
       <div className="space-y-5 text-center">
        <h2 className="text-sm font-semibold text-slate-900">
           Starting the service
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          The service is taking longer than usual to respond.  
          This can happen during the first load.
        </p>
        <button
          onClick={handleRetryAction}
          className="
            mt-4 
            inline-flex items-center justify-center
            h-9 sm:h-10 px-8
            bg-slate-900 hover:bg-slate-800 
            text-white 
            rounded-sm 
            text-[11px] sm:text-[12px] font-bold font-manrope tracking-widest
            transition-all active:scale-[0.98]
            shadow-sm
          "
        >
          Try again
        </button>
      </div>
      ) : (
        /* LOADING STATE */
        <div className="space-y-6">

          {/* Status */}
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>{isSystemReady ? "Connected" : "Connecting…"}</span>
            <span>{Math.floor(progress)}%</span>
          </div>

          {/* Progress */}
          <div className="h-[2px] bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isSystemReady ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Message */}
          <p className="text-[11px] text-slate-400 text-center">
            {isSystemReady ? "Preparing dashboard…" : messages[messageIndex].text}
          </p>
            <div className="mt-4 min-h-[28px] flex items-center justify-center">
              <p
                className={`
                  text-[11px] text-slate-400 leading-relaxed
                  transition-opacity duration-300
                  ${longWait && !isSystemReady ? 'opacity-100' : 'opacity-0'}
                `}
              >
                Initial connection may take slightly longer than usual.
              </p>
            </div>

        </div>
      )}
    </div>

    {/* Team (Muted, Static) */}
    <footer
      className={`
        absolute bottom-10
        flex flex-col items-center gap-4
        transition-all duration-500 ease-out
        ${
          showTeam && !isError
            ? "opacity-30 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }
      `}
    >
      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
        Built by
      </span>

      <div className="flex gap-8">
        {TEAM.map((member, i) => (
          <a
            key={i}
            href={member.linkedin}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <img
              src={member.image}
              alt={member.name}
              className="w-7 h-7 rounded-full object-cover grayscale border border-slate-100"
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-slate-600">
                {member.name}
              </span>
              <span className="text-[9px] text-slate-400">
                {member.role}
              </span>
            </div>
          </a>
        ))}
      </div>
    </footer>

  </div>
);

};