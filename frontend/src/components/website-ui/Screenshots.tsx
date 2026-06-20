import React, { useState, useEffect, useRef } from 'react';


// ─── ICONS ────────────────────────────────────────────────────────────────────
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

// ─── TOUR DATA ──────────────────────────────────────────────────────────────────
type TourStop = {
  key: string;
  tab: string;
  title: string;
  desc: string;
  img: string;
  highlights: string[];
};

const STOPS: TourStop[] = [
  {
    key: 'dashboard',
    tab: 'Workspace',
    title: 'Everything about one dataset, in one place.',
    desc: 'Trends, incidents, column health, and the latest upload — the view your team actually lives in day to day.',
    img: '/images/workspacess.png',
    highlights: [
      'Historical volume and schema stability at a glance',
      'Active alerts and ingestion failures surfaced up front',
      'Per-column missing and uniqueness trends, always current',
    ],
  },
  {
    key: 'summary',
    tab: 'Data Quality',
    title: 'It already knows what looks wrong.',
    desc: 'Every upload is profiled automatically — row deltas, schema diffs, and quality notes that read like a colleague checked your work.',
    img: '/images/data-summary.png',
    highlights: [
      '"Detected 8 duplicate rows in this dataset"',
      '"Column \'delivery_date\' contains the same value across all rows"',
      'Row, column, and schema change tracked against the previous upload',
    ],
  },
  {
    key: 'alerts',
    tab: 'Smart Alerts',
    title: 'Rules you set once, watched forever.',
    desc: 'Pick a column, a metric, a threshold. DataPulse fires the moment it\'s genuinely breached — not on every poll.',
    img: '/images/smartalerts.png',
    highlights: [
      'Per-column rules: exceeds, drops below, equals, changes',
      'Toggle rules on or off without losing the configuration',
      'Up to 10 active alerts per workspace, no extra setup',
    ],
  },
];

// ─── SCREENSHOTS COMPONENT ─────────────────────────────────────────────────────
const Screenshots: React.FC = () => {
  const [active, setActive] = useState(0);
  const [ref, isInView] = useLiveInView({ threshold: 0.1 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });

  return (
    <section ref={ref} className="relative bg-slate-50/50 overflow-hidden py-20 lg:py-28 border-y border-slate-100">

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
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-white border border-slate-200
                       text-slate-600 text-xs font-bold uppercase tracking-wider
                       mb-5 shadow-sm animate-fadeInUp"
            style={isInView ? getAnimStyle(0) : { opacity: 0 }}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Inside DataPulse
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-5 animate-fadeInUp"
            style={isInView ? getAnimStyle(100) : { opacity: 0 }}
          >
            Not a mockup. <span className="text-blue-600">The actual product.</span>
          </h2>
          <p
            className="text-lg text-slate-600 leading-relaxed font-manrope animate-fadeInUp"
            style={isInView ? getAnimStyle(200) : { opacity: 0 }}
          >
            Three screens, three jobs: see your data, understand its health,
            and get told the moment something's off.
          </p>
        </div>

        {/* ── TAB SWITCHER ─────────────────────────────────────────────────── */}
        <div
          className="flex justify-center mb-10 lg:mb-12 animate-fadeInUp"
          style={isInView ? getAnimStyle(300) : { opacity: 0 }}
        >
          <div className="inline-flex items-center gap-1 p-1 rounded-sm bg-white border border-slate-200 shadow-sm">
            {STOPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setActive(i)}
                className={`px-4 sm:px-5 py-2 rounded-sm text-[13px] font-bold font-manrope tracking-wide transition-all duration-200
                  ${active === i
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'}`}
              >
                {s.tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── TOUR PANEL ───────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">

          {/* Screenshot, browser-chrome framed, fixed-aspect crossfade —
              height never changes between tabs, so scrolling never jumps */}
          <div className="rounded-sm border border-slate-200 bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.12)] overflow-hidden animate-fadeInUp" style={isInView ? getAnimStyle(350) : { opacity: 0 }}>
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="ml-3 text-[11px] font-semibold text-slate-400 font-mono">
                app.datapulse.io
              </span>
            </div>
            <div className="relative w-full aspect-[16/10] bg-slate-50">
              {STOPS.map((s, i) => (
                <img
                  key={s.key}
                  src={s.img}
                  alt={s.title}
                  className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ${
                    i === active ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          </div>

          {/* Claim callouts — fixed-position crossfade, same reasoning */}
          <div className="relative min-h-[260px]">
            {STOPS.map((s, i) => (
              <div
                key={s.key}
                className={`transition-opacity duration-300 ${
                  i === active ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              >
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins mb-3 tracking-tight leading-snug">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-manrope mb-6">
                  {s.desc}
                </p>
                <div className="flex flex-col gap-3">
                  {s.highlights.map((h) => (
                    <div key={h} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-blue-600" />
                      </span>
                      <span className="text-[13.5px] text-slate-600 leading-snug font-manrope">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Screenshots;