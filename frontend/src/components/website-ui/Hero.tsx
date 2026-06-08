import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HeroIllustration } from './NotionIllustrations';
import toast from 'react-hot-toast';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Play = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrendUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

// ─── BATTERY SAVER HOOK ───────────────────────────────────────────────────────
function useLiveInView({ threshold = 0.1 } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView] as const;
}

// ─── BATTERY SAVER WRAPPER ──────────────────────────────────────────────────── YES


const BatterySaverWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ref, isVisible] = useLiveInView();
  return (
    <div ref={ref} className="w-full h-full">
      {isVisible ? children : <div className="w-full h-full invisible" />}
    </div>
  );
};

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
const AnimatedCounter: React.FC<{ target: string; duration?: number }> = ({
  target,
  duration = 1600,
}) => {
  const [display, setDisplay] = useState('0');
  const [ref, isInView] = useLiveInView({ threshold: 0.5 });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isInView || hasRun.current) return;
    const numericMatch = target.match(/[\d.]+/);
    if (!numericMatch) { setDisplay(target); return; }

    const numeric = parseFloat(numericMatch[0]);
    const prefix = target.slice(0, target.indexOf(numericMatch[0]));
    const suffix = target.slice(target.indexOf(numericMatch[0]) + numericMatch[0].length);
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;

    hasRun.current = true;
    const timer = setInterval(() => {
      current += numeric / steps;
      if (current >= numeric) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        const formatted = Number.isInteger(numeric)
          ? Math.floor(current).toLocaleString()
          : current.toFixed(1);
        setDisplay(`${prefix}${formatted}${suffix}`);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{display}</span>;
};

// ─── HERO ─────────────────────────────────────────────────────────────────────
const Hero: React.FC = () => {

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });

  // Marquee — plain English, non-technical, friendly
  const marqueeItems = [
    'CSV Upload & Monitoring',
    'Smart Email Alerts',
    'Data Quality Reports',
    'Column Health Tracking',
    'Schema Change Detection',
    'Live Trend Charts',
    'PostgreSQL Direct Connect',
    'API Data Polling',
    'Real-Time Updates',
    'Team Workspaces',
  ];
  const marqueeDoubled = [...marqueeItems, ...marqueeItems];

  // Stats — honest, verifiable, meaningful
  const stats = [
    { num: '300K+', label: 'Rows Monitored'  },
    { num: '3.5s',  label: 'Pipeline Speed'  },
    { num: 'Free',  label: 'Forever Plan'    },
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
    <section className="relative bg-white overflow-hidden pt-24 pb-16 lg:pt-28 lg:pb-24">

      {/* ── BACKGROUND AMBIENCE ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle dot grid — slightly softer than lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Blue glow top-right */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-60" />
        {/* Indigo glow bottom-left */}
        <div className="absolute top-1/2 -left-24 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* ── LEFT COLUMN: COPY ─────────────────────────────────────────── */}
          <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0">


            {/* Headline — original 6xl size maintained */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6 animate-fadeInUp font-poppins"
              style={getAnimStyle(200)}
            >
              Know when your <br className="hidden lg:block" />
              data changes.{' '}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Instantly.
                </span>
              </span>
            </h1>

            {/* Description — friendly, non-technical */}
            <p
              className="text-lg text-slate-600 leading-relaxed mb-8 animate-fadeInUp max-w-lg mx-auto lg:mx-0"
              style={getAnimStyle(300)}
            >
              Connect your CSV files, APIs, or databases. DataPulse watches
              everything automatically and alerts your team the moment
              something shifts — no setup complexity, no enterprise pricing.
            </p>

            {/* ── CTAs — original rounded-sm sharp style ── */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10 animate-fadeInUp"
              style={getAnimStyle(400)}
            >
              {/* PRIMARY */}
              <Link to="/register" className="w-full sm:w-auto">
                <button className="
                  group relative
                  w-full sm:w-auto
                  h-11 px-8
                  rounded-sm bg-blue-600
                  text-white font-bold text-[13px] font-manrope tracking-wider
                  shadow-md shadow-blue-600/20
                  transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25
                  active:scale-[0.98]
                  flex items-center justify-center gap-2
                ">
                  Try DataPulse Free
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                </button>
              </Link>

              {/* SECONDARY — original Watch Demo style */}
              <button
                onClick={handleWatchDemo}
                className="
                  w-full sm:w-auto
                  h-11 px-8
                  rounded-sm border border-slate-200 bg-white
                  text-slate-600 font-bold text-[13px] font-manrope tracking-wider
                  hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900
                  transition-all active:scale-[0.98]
                  flex items-center justify-center gap-2
                "
              >
                <Play className="w-3.5 h-3.5 fill-slate-400 text-slate-400" />
                Watch Demo
              </button>
            </div>

            {/* ── TRUST PILLS ── */}
            <div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-10 animate-fadeInUp"
              style={getAnimStyle(450)}
            >
              {[
                { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'No credit card required' },
                { icon: <Clock className="w-3.5 h-3.5" />,       text: 'Setup in under 2 minutes' },
                { icon: <TrendUp className="w-3.5 h-3.5" />,     text: 'Free forever plan'        },
              ].map((pill) => (
                <div
                  key={pill.text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                             bg-slate-50 border border-slate-200
                             text-slate-500 text-xs font-semibold"
                >
                  <span className="text-blue-500">{pill.icon}</span>
                  {pill.text}
                </div>
              ))}
            </div>

            {/* ── STATS — original grid style, animated counters added ── */}
            <div
              className="grid grid-cols-3 gap-6 border-t border-slate-100 pt-8 animate-fadeInUp"
              style={getAnimStyle(500)}
            >
              {stats.map((item) => (
                <div key={item.label} className="group cursor-default">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors duration-300">
                    <AnimatedCounter target={item.num} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: ILLUSTRATION ───────────────────────────────── */}
          <div
            className="relative lg:h-auto animate-fadeInUp flex justify-center lg:justify-end"
            style={getAnimStyle(400)}
          >
            {/* Soft glow behind illustration */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-3/4 rounded-full bg-blue-100/30 blur-3xl" />
            </div>


            {/* Main illustration */}
            <div className="relative w-full max-w-[600px] aspect-[4/3] transform hover:scale-[1.02] transition-transform duration-500">
              <BatterySaverWrapper>
                <HeroIllustration />
              </BatterySaverWrapper>
            </div>
          </div>

        </div>
      </div>

      {/* ── MARQUEE STRIP ─────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden mt-20 lg:mt-24 border-y border-slate-100 bg-slate-50/50 py-6 animate-fadeInUp"
        style={getAnimStyle(600)}
      >
        {/* Fade masks on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50/80 to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee">
          {marqueeDoubled.map((area, i) => (
            <div
              key={i}
              className="flex-shrink-0 px-6 mx-4 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-default"
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