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

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
const AnimatedCounter: React.FC<{ target: string; duration?: number }> = ({ target, duration = 1200 }) => {
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
    const steps = 30;
    const stepTime = duration / steps;
    let current = 0;
    hasRun.current = true;
    const timer = setInterval(() => {
      current += numeric / steps;
      if (current >= numeric) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(`${prefix}${Math.floor(current).toLocaleString()}${suffix}`);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{display}</span>;
};

// ─── STAR RATING ──────────────────────────────────────────────────────────────
const StarRating: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex items-center gap-0.5 mb-1.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        className={`w-3 h-3 ${i < count ? 'text-amber-400' : 'text-slate-200'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

// ─── FEEDBACK DATA ─────────────────────────────────────────────────────────────
type Note = {
  text: string;
  from: string;
  role: string;
  avatar: string;
  stars: number;
  security?: boolean;
};

const NOTES: Note[] = [
  {
    text: "Setup was straightforward and easy to follow. We connected our Postgres database in a few minutes, and the alerts helped us catch a data issue during testing.",
    from: 'Yaswanth N.',
    role: 'Junior Software Developer · Prepdha.AI',
    avatar: 'YN',
    stars: 5,
  },
  {
  text: "The dashboard is easy to use and gives a quick view of data health. Setting up monitoring was simple, and the alerts were helpful during testing.",
  from: 'Poojari Srinivasa Bhavesh',
  role: 'Graduate Software Engineer · RailTel Corporation',
  avatar: 'PB',
  stars: 5,
  },
  {
  text: "The interface is clean and easy to navigate. I especially like being able to see schema changes without digging through database logs.",
  from: 'Rajashekar K.',
  role: 'Gen AI Developer · TCS AI Competency Development',
  avatar: 'RK',
  stars: 5,
},//  {
  //   text: "Good security fundamentals for a product at this stage. Read-only database connections and encrypted credential handling were things I looked for before trying it.",
  //   from: 'Meera T.',
  //   role: 'CTO · Dev Tools Startup',
  //   avatar: 'MT',
  //   stars: 5,
  //   security: true,
 // },
];

// ─── LIVE FEED MOCKUP ─────────────────────────────────────────────────────────
const LiveFeedMockup: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [ref, isInView] = useLiveInView({ threshold: 0.3 });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isInView || hasRun.current) return;
    hasRun.current = true;
    NOTES.forEach((_, i) => {
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * 400);
    });
  }, [isInView]);

  return (
    <div
      ref={ref}
      className="rounded-sm border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden"
    >
      {/* ── Window chrome ── */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-200" />
          <span className="w-2 h-2 rounded-full bg-slate-200" />
          <span className="w-2 h-2 rounded-full bg-slate-200" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-manrope">
          #early-access-feedback
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 font-manrope">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          live
        </span>
      </div>

      {/* ── Feed ── */}
      <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-3 min-h-[300px]">
        {NOTES.slice(0, visibleCount).map((note, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 rounded-sm border px-3.5 py-3 transition-all duration-300
              ${note.security
                ? 'border-blue-200 bg-blue-50/40'
                : 'border-slate-100 bg-slate-50/50'
              }`}
            style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5
              ${note.security ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
              {note.avatar}
            </div>

            <div className="min-w-0 flex-1">
              {/* Name + role */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[12px] font-bold text-slate-800 font-manrope">
                  {note.from}
                </span>
                <span className="text-[10px] text-slate-400 font-manrope flex-shrink-0">
                  {note.role}
                </span>
              </div>

              {/* Stars */}
              <StarRating count={note.stars} />

              {/* Security badge */}
              {note.security && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 font-manrope mb-1">
                  <ShieldCheck className="w-3 h-3" /> mentions security
                </span>
              )}

              {/* Quote */}
              <p className="text-[13px] text-slate-600 leading-snug font-manrope">
                "{note.text}"
              </p>
            </div>
          </div>
        ))}

        {/* ── Bottom metrics rail ── */}
        {visibleCount >= NOTES.length && (
          <div
            className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-slate-100 text-[11px] font-manrope"
            style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}
          >
            <span className="text-slate-400">20 early users · 16 workspaces</span>
            <span className="font-mono text-slate-500 font-semibold">500K rows · 1.94s</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SOCIAL PROOF ─────────────────────────────────────────────────────────────
const SocialProof: React.FC = () => {
  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });

  const stats = [
    { num: '20',   label: 'Early Users'     },
    { num: '16',   label: 'Workspaces Live' },
    { num: '300K+', label: 'Rows Monitored' },
  ];

  return (
    <section className="relative bg-white overflow-hidden py-20 lg:py-28">

      {/* ── BACKGROUND ──────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-1/3 right-0 w-[450px] h-[450px] bg-blue-50/40 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: COPY + STATS + CTA ────────────────────────────────────── */}
          <div className="text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-slate-50 border border-slate-200
                         text-slate-600 text-xs font-bold uppercase tracking-wider
                         mb-5 shadow-sm animate-fadeInUp"
              style={getAnimStyle(0)}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Early Access
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-6 animate-fadeInUp"
              style={getAnimStyle(100)}
            >
              We're small.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                On purpose.
              </span>
            </h2>

            <p
              className="text-lg text-slate-500 leading-relaxed font-manrope mb-10 max-w-md mx-auto lg:mx-0 animate-fadeInUp"
              style={getAnimStyle(200)}
            >
              DataPulse is in early access. We'd rather show you 20 real teams
              than 10,000 fake ones — the panel on the right is what the first
              ones are actually saying.
            </p>

            {/* Stats */}
            <div
              className="flex items-center justify-center lg:justify-start gap-6 sm:gap-10 mb-10 animate-fadeInUp"
              style={getAnimStyle(300)}
            >
              {stats.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins tracking-tight">
                      <AnimatedCounter target={s.num} />
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 font-manrope">
                      {s.label}
                    </div>
                  </div>
                  {i < stats.length - 1 && (
                    <div className="h-9 w-px bg-slate-200" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* CTA */}
            <div className="animate-fadeInUp" style={getAnimStyle(400)}>
              <Link to="/register">
                <button className="
                  group relative h-11 px-8
                  rounded-sm bg-blue-600
                  text-white font-bold text-[13px] font-manrope tracking-wider
                  shadow-md shadow-blue-600/20
                  transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25
                  active:scale-[0.98]
                  inline-flex items-center justify-center gap-2
                ">
                  Get Early Access
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <p className="text-xs text-slate-400 font-manrope mt-3">
                Be one of the first 50 teams on DataPulse.
              </p>
            </div>
          </div>

          {/* ── RIGHT: LIVE FEED MOCKUP ──────────────────────────────────────── */}
          <div className="animate-fadeInUp" style={getAnimStyle(250)}>
            <LiveFeedMockup />
          </div>

        </div>
      </div>
    </section>
  );
};

export default SocialProof;