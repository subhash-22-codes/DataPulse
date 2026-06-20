import React, { useState, useEffect, useRef } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const ShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const KeyRound = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

const DatabaseZap = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 15 21.84" />
    <path d="M21 5V8" />
    <path d="M3 12A9 3 0 0 0 14.59 14.87" />
    <path d="M21 12c0 1-.34 1.85-.9 2.6M16.97 18.49 13 21l1.66-3.66L11 18l5-6-1.7 3.5L18 14Z" />
  </svg>
);

const Timer = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="10" x2="14" y1="2" y2="2" />
    <line x1="12" x2="15" y1="14" y2="11" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);

const Check = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── ONE-SHOT IN-VIEW HOOK ─────────────────────────────────────────────────────
function useLiveInView({ threshold = 0.1 } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView] as const;
}

// ─── TRUST SECTION ──────────────────────────────────────────────────────────────
// Replaces the old "Source Available" block. Same credibility job — prove the
// security claims are real — without pointing anyone at a public repo while
// DataPulse is still small. Plain language, no diagrams, no links out.
const TrustSection: React.FC = () => {
  const [isInView] = useLiveInView({ threshold: 0.1 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

  const safeguards = [
    {
      icon: <DatabaseZap className="w-[18px] h-[18px]" />,
      title: 'Read-only by design',
      desc: 'When DataPulse connects to your database, it can only ever read. There is no path for it to write, alter, or delete a single row.',
    },
    {
      icon: <KeyRound className="w-[18px] h-[18px]" />,
      title: 'Credentials, encrypted at rest',
      desc: 'Database passwords and API secrets are encrypted before they\'re ever stored — not just hidden, encrypted.',
    },
    {
      icon: <Timer className="w-[18px] h-[18px]" />,
      title: 'Every login takes the same time',
      desc: 'Whether your email exists in our system or not, the response takes identically long — so timing can never reveal who has an account.',
    },
    {
      icon: <ShieldCheck className="w-[18px] h-[18px]" />,
      title: 'Sessions that can\'t be replayed',
      desc: 'Each login is tied to your device. If a saved session token is ever reused somewhere else, every session is signed out — automatically.',
    },
  ];

  return (
    <section id="trust" className="relative bg-slate-50/50 overflow-hidden py-20 lg:py-28 border-y border-slate-100">

      {/* ── BACKGROUND AMBIENCE ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-50/40 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-white border border-slate-200
                       text-slate-600 text-xs font-bold uppercase tracking-wider
                       mb-5 shadow-sm animate-fadeInUp"
            style={style(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Built for Trust
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-6 animate-fadeInUp"
            style={style(100)}
          >
            Security shouldn't need <br className="hidden sm:block" />
            <span className="text-blue-600">an engineering degree to understand.</span>
          </h2>
          <p
            className="text-lg text-slate-600 leading-relaxed font-manrope animate-fadeInUp"
            style={style(200)}
          >
            You're trusting us with a connection to your data. Here's exactly
            what that does and doesn't mean — in plain English, not jargon.
          </p>
        </div>

        {/* ── SAFEGUARDS GRID ─────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
          {safeguards.map((s, idx) => (
            <div
              key={s.title}
              className="group flex gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6 hover:border-blue-200 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.1)] transition-all duration-300 animate-fadeInUp"
              style={style(300 + idx * 100)}
            >
              <div className="w-9 h-9 flex-shrink-0 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform duration-300">
                {s.icon}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <h3 className="text-[15px] font-bold text-slate-900 font-poppins tracking-tight leading-snug">
                    {s.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-manrope">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p
          className="text-center text-[13px] text-slate-400 font-manrope mt-10 animate-fadeInUp"
          style={style(700)}
        >
          This is a summary, not the full technical writeup — ask us anything
          before you connect a production database.
        </p>

      </div>
    </section>
  );
};

export default TrustSection;