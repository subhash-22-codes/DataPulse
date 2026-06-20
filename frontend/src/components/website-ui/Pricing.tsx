import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Check = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
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

// ─── LOCK ICON (for upcoming tiers) ────────────────────────────────────────────
const Lock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ─── PRICING COMPONENT ──────────────────────────────────────────────────────────
const Pricing: React.FC = () => {
  const [ref, isInView] = useLiveInView({ threshold: 0.1 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

  const freeIncluded = [
    '3 workspaces, fully featured',
    'Up to 2 team members per workspace',
    'CSV, REST API, and PostgreSQL connections',
    '50 uploads stored per workspace',
    'Up to 500,000 rows per upload',
    '10 active alert rules per workspace',
    'Real-time WebSocket + email notifications',
    'Schema drift and data quality monitoring',
  ];

  const proPlanned = [
    'More workspaces and storage',
    'Larger row limits per upload',
    'More team members per workspace',
    'Priority alert delivery',
  ];

  const teamPlanned = [
    'Everything in Pro',
    'Org-wide workspace management',
    'Role-based access controls',
    'Dedicated support channel',
  ];

  return (
    <section ref={ref} className="relative bg-white overflow-hidden py-20 lg:py-28">

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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-blue-50/40 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-slate-50 border border-slate-200
                       text-slate-600 text-xs font-bold uppercase tracking-wider
                       mb-5 shadow-sm animate-fadeInUp"
            style={style(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Pricing
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-6 animate-fadeInUp"
            style={style(100)}
          >
            Free, for real. <span className="text-blue-600">For now.</span>
          </h2>
          <p
            className="text-lg text-slate-600 leading-relaxed font-manrope animate-fadeInUp"
            style={style(200)}
          >
            DataPulse is in early access — everything in Free is yours today,
            no credit card. Pro and Team are on the way as we scale; nothing
            you build now disappears when they land.
          </p>
        </div>

        {/* ── THREE-TIER GRID ─────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-7 max-w-6xl mx-auto items-start">

          {/* FREE — active, real */}
          <div
            className="lg:scale-[1.03] rounded-sm border border-blue-200 bg-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.18)] overflow-hidden animate-fadeInUp relative z-10"
            style={style(300)}
          >
            <div className="px-6 sm:px-7 py-7 border-b border-slate-100 bg-blue-50/30 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 font-manrope">
                Early Access · Available Now
              </span>
              <div className="flex items-baseline justify-center gap-1.5 mt-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-poppins tracking-tight">
                  $0
                </span>
                <span className="text-sm text-slate-500 font-manrope">/ forever, while in early access</span>
              </div>
              <p className="text-sm text-slate-500 font-manrope mt-2">
                No credit card. No trial countdown.
              </p>
            </div>

            <div className="px-6 sm:px-7 py-7">
              <div className="flex flex-col gap-3 mb-7 min-h-[230px]">
                {freeIncluded.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-blue-600" />
                    </span>
                    <span className="text-[13.5px] text-slate-600 leading-snug font-manrope">{item}</span>
                  </div>
                ))}
              </div>

              <Link to="/register" className="block">
                <button className="
                  group relative w-full h-11
                  rounded-sm bg-blue-600
                  text-white font-bold text-[13px] font-manrope tracking-wider
                  shadow-md shadow-blue-600/20
                  transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25
                  active:scale-[0.98]
                  flex items-center justify-center gap-2
                ">
                  Start for Free
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </div>
          </div>

          {/* PRO — coming soon */}
          <div
            className="rounded-sm border border-slate-200 bg-slate-50/60 overflow-hidden animate-fadeInUp relative"
            style={style(400)}
          >
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-manrope">
              <Lock className="w-3 h-3" />
              Coming Soon
            </div>

            <div className="px-6 sm:px-7 py-7 border-b border-slate-150 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-manrope">
                Pro
              </span>
              <div className="flex items-baseline justify-center gap-1.5 mt-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-400 font-poppins tracking-tight">
                  TBD
                </span>
              </div>
              <p className="text-sm text-slate-400 font-manrope mt-2">
                Pricing not finalized yet.
              </p>
            </div>

            <div className="px-6 sm:px-7 py-7">
              <div className="flex flex-col gap-3 mb-7 min-h-[230px]">
                {proPlanned.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 opacity-70">
                    <span className="w-5 h-5 rounded-sm bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-slate-400" />
                    </span>
                    <span className="text-[13.5px] text-slate-500 leading-snug font-manrope">{item}</span>
                  </div>
                ))}
              </div>

              <a href="mailto:datapulseapp@gmail.com?subject=Notify%20me%20about%20Pro" className="block">
                <button className="
                  w-full h-11
                  rounded-sm border border-slate-200 bg-white
                  text-slate-500 font-bold text-[13px] font-manrope tracking-wider
                  hover:border-slate-300 hover:text-slate-700
                  transition-all active:scale-[0.98]
                  flex items-center justify-center gap-2
                ">
                  Notify Me
                </button>
              </a>
            </div>
          </div>

          {/* TEAM — coming soon */}
          <div
            className="rounded-sm border border-slate-200 bg-slate-50/60 overflow-hidden animate-fadeInUp relative"
            style={style(500)}
          >
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-manrope">
              <Lock className="w-3 h-3" />
              Coming Soon
            </div>

            <div className="px-6 sm:px-7 py-7 border-b border-slate-150 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-manrope">
                Team
              </span>
              <div className="flex items-baseline justify-center gap-1.5 mt-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-400 font-poppins tracking-tight">
                  TBD
                </span>
              </div>
              <p className="text-sm text-slate-400 font-manrope mt-2">
                For organizations scaling up.
              </p>
            </div>

            <div className="px-6 sm:px-7 py-7">
              <div className="flex flex-col gap-3 mb-7 min-h-[230px]">
                {teamPlanned.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 opacity-70">
                    <span className="w-5 h-5 rounded-sm bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-slate-400" />
                    </span>
                    <span className="text-[13.5px] text-slate-500 leading-snug font-manrope">{item}</span>
                  </div>
                ))}
              </div>

              <a href="mailto:datapulseapp@gmail.com?subject=Notify%20me%20about%20Team" className="block">
                <button className="
                  w-full h-11
                  rounded-sm border border-slate-200 bg-white
                  text-slate-500 font-bold text-[13px] font-manrope tracking-wider
                  hover:border-slate-300 hover:text-slate-700
                  transition-all active:scale-[0.98]
                  flex items-center justify-center gap-2
                ">
                  Notify Me
                </button>
              </a>
            </div>
          </div>

        </div>

        <p
          className="text-center text-[13px] text-slate-400 font-manrope mt-10 animate-fadeInUp"
          style={style(600)}
        >
          Need more than Free right now — bigger team, more rows, more workspaces?{' '}
          <a href="mailto:datapulseapp@gmail.com" className="text-blue-600 font-semibold hover:underline">
            Tell us what you need
          </a>{' '}
          and we'll figure it out together, ahead of Pro launching.
        </p>

      </div>
    </section>
  );
};

export default Pricing;