import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const ShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const Clock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const Mail = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const Bell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
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

// ─── CONFIRMATION CARD (signature element) ────────────────────────────────────
// Light, white card — deliberately NOT the dark terminal look used in Problem,
// so the two sections don't visually repeat each other. Same narrative
// callback (orders_snapshot, 09:59), different visual language: a clean
// "resolved" notification instead of a log feed.
const ConfirmationCard: React.FC<{ isInView: boolean }> = ({ isInView }) => {
  const [step, setStep] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isInView || hasRun.current) return;
    hasRun.current = true;
    setTimeout(() => setStep(1), 200);
    setTimeout(() => setStep(2), 700);
    setTimeout(() => setStep(3), 1300);
  }, [isInView]);

  return (
    <div className="rounded-sm bg-white shadow-[0_25px_70px_-15px_rgba(15,23,42,0.25)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-manrope">
          orders_snapshot
        </span>
        <span className="text-[11px] font-mono text-slate-400">09:59 AM</span>
      </div>

      <div className="p-5 sm:p-6 min-h-[210px] flex flex-col gap-3">

        {/* Step 1: detection */}
        <div
          className={`flex items-center gap-3 px-3.5 py-3 rounded-sm border border-amber-200 bg-amber-50/60 transition-all duration-400 ${
            step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-[13px] text-amber-800 font-manrope font-medium">
            Row count stopped updating
          </span>
        </div>

        {/* Step 2: dual notification */}
        <div
          className={`flex items-center gap-4 px-3.5 py-3 rounded-sm border border-blue-100 bg-blue-50/50 transition-all duration-400 ${
            step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="flex items-center gap-1.5 text-blue-700">
            <Mail className="w-3.5 h-3.5" />
            <span className="text-[12px] font-semibold font-manrope">Email sent</span>
          </div>
          <div className="h-3.5 w-px bg-blue-200" />
          <div className="flex items-center gap-1.5 text-blue-700">
            <Bell className="w-3.5 h-3.5" />
            <span className="text-[12px] font-semibold font-manrope">In-app alert</span>
          </div>
          <span className="ml-auto text-[11px] font-mono text-blue-400">0.4s</span>
        </div>

        {/* Step 3: resolved */}
        <div
          className={`flex items-start gap-3 px-3.5 py-3.5 rounded-sm border border-emerald-200 bg-emerald-50/60 mt-auto transition-all duration-400 ${
            step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </span>
          <p className="text-[13px] text-emerald-800 font-manrope leading-snug">
            Caught before it reached your dashboard. Nobody had to find out the hard way.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── FINAL CTA COMPONENT ───────────────────────────────────────────────────────
const FinalCTA: React.FC = () => {
  const [ref, isInView] = useLiveInView({ threshold: 0.15 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

  return (
    <section ref={ref} className="relative bg-white overflow-hidden py-20 lg:py-28">

      {/* ── BACKGROUND AMBIENCE — same light system as every other section ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── THE ONE BOLD ELEMENT: blue gradient card, on-brand not off-theme ── */}
        <div
          className="relative rounded-sm bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 overflow-hidden shadow-[0_30px_80px_-20px_rgba(37,99,235,0.4)] animate-fadeInUp"
          style={style(0)}
        >
          {/* subtle glow accents, kept inside the card so the page background stays light */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center p-8 sm:p-12 lg:p-16">

            {/* ── LEFT: COPY ──────────────────────────────────────────────── */}
            <div className="text-center lg:text-left">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          bg-white/10 border border-white/15
                          text-white/90 text-[10px] font-semibold uppercase font-manrope tracking-wide
                          mb-4 animate-fadeInUp"
                style={style(100)}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                This time, someone got the alert
              </div>

              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-poppins leading-[1.1] mb-5 animate-fadeInUp"
                style={style(150)}
              >
                Stop finding out <br />
                on Monday morning.
              </h2>

              <p
                className="text-lg text-blue-100 leading-relaxed font-manrope mb-8 max-w-md mx-auto lg:mx-0 animate-fadeInUp"
                style={style(200)}
              >
                Connect a CSV, an API, or your database. DataPulse watches it
                from the first upload — free, in early access, no card required.
              </p>

              <div
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-8 animate-fadeInUp"
                style={style(250)}
              >
                <Link to="/register" className="w-full sm:w-auto">
                  <button className="
                    group relative w-full sm:w-auto
                    h-12 px-9
                    rounded-sm bg-white
                    text-blue-700 font-bold text-[13px] font-manrope tracking-wider
                    shadow-lg shadow-black/10
                    transition-all hover:bg-blue-50 hover:shadow-xl
                    active:scale-[0.98]
                    flex items-center justify-center gap-2
                  ">
                    Start Watching Your Data
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>
              </div>

              <div
                className="flex flex-wrap items-center justify-center lg:justify-start gap-2 animate-fadeInUp"
                style={style(300)}
              >
                {[
                  { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'No credit card required' },
                  { icon: <Clock className="w-3.5 h-3.5" />, text: 'Live in under 2 minutes' },
                ].map((pill) => (
                  <div
                    key={pill.text}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               bg-white/10 border border-white/15
                               text-blue-50 text-xs font-semibold"
                  >
                    <span className="text-emerald-300">{pill.icon}</span>
                    {pill.text}
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: CONFIRMATION CARD ─────────────────────────────────── */}
            <div className="animate-fadeInUp" style={style(200)}>
              <ConfirmationCard isInView={isInView} />
            </div>

          </div>
        </div>

        <p
          className="text-center text-[13px] text-slate-400 font-manrope mt-6 animate-fadeInUp"
          style={style(400)}
        >
          Same pipeline from earlier on this page. Same 09:59 silence. Different ending.
        </p>

      </div>
    </section>
  );
};

export default FinalCTA;