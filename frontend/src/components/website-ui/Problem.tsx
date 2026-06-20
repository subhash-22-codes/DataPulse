import React, { useState, useEffect, useRef } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const DatabaseAlert = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M15 21v-6" />
    <path d="M15 21h-6" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const TerminalSquare = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m7 11 2-2-2-2" />
    <path d="M11 13h4" />
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
  </svg>
);

const MessageSquareWarning = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M12 7v2" />
    <path d="M12 13h.01" />
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
      ([entry]) => {
        // Latch once visible — never unmount again on scroll-up.
        // Prevents layout collapse + animation replay while scrolling.
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

// Kept for compatibility with existing call sites; always renders children
// now (the unmount-to-placeholder approach was the source of scroll glitches).
const BatterySaverWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="w-full h-full">{children}</div>;
};

// ─── SILENT FAILURE LOG (signature element) ───────────────────────────────────
// A mock ingestion feed that looks healthy, then quietly flatlines — and stays
// flatlined, because nothing is watching it. This is the "black box" made visible.
type LogRow = { time: string; label: string; rows: string; state: 'ok' | 'stale' };

const LOG_ROWS: LogRow[] = [
  { time: '09:14:02', label: 'orders_snapshot', rows: '48,210 rows', state: 'ok' },
  { time: '09:29:02', label: 'orders_snapshot', rows: '48,402 rows', state: 'ok' },
  { time: '09:44:02', label: 'orders_snapshot', rows: '48,690 rows', state: 'ok' },
  { time: '09:59:02', label: 'orders_snapshot', rows: '48,690 rows', state: 'stale' },
  { time: '10:14:02', label: 'orders_snapshot', rows: '48,690 rows', state: 'stale' },
  { time: '10:29:02', label: 'orders_snapshot', rows: '48,690 rows', state: 'stale' },
];

const SilentFailureLog: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [ref, isInView] = useLiveInView({ threshold: 0.4 });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isInView || hasRun.current) return;
    hasRun.current = true;
    LOG_ROWS.forEach((_, i) => {
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * 420);
    });
  }, [isInView]);

  const staleStartIndex = LOG_ROWS.findIndex((r) => r.state === 'stale');

  return (
    <div
      ref={ref}
      className="relative bg-slate-900 rounded-sm border border-slate-800 overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.25)]"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-manrope">
          ingestion.log — no monitoring
        </span>
        <span className="w-12" />
      </div>

      {/* Log body */}
      <div className="px-4 sm:px-5 py-5 font-mono text-[12.5px] sm:text-[13px] leading-relaxed min-h-[220px]">
        {LOG_ROWS.slice(0, visibleCount).map((row, i) => (
          <div
            key={row.time}
            className={`flex items-center gap-3 py-1 transition-opacity duration-300 ${
              row.state === 'stale' ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <span className="text-slate-500 w-[68px] flex-shrink-0">{row.time}</span>
            <span className="text-slate-300 flex-shrink-0">{row.label}</span>
            <span className={row.state === 'ok' ? 'text-emerald-400' : 'text-slate-500'}>
              {row.rows}
            </span>
            {row.state === 'stale' && i === staleStartIndex && (
              <span className="text-amber-400/90 text-[11px] ml-auto animate-pulse">
                unchanged
              </span>
            )}
          </div>
        ))}

        {/* The line that never comes */}
        {visibleCount >= LOG_ROWS.length && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
            <span className="text-[12px]">No alert was sent. No one checked until Monday.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PROBLEM COMPONENT ────────────────────────────────────────────────────────
const Problem: React.FC = () => {
  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });

  const painPoints = [
    {
      icon: <DatabaseAlert className="w-[18px] h-[18px]" />,
      badge: 'Silent Failures',
      title: 'Data stops. Nobody notices.',
      desc: 'A Postgres connection drops or a cron job stalls. The dashboard keeps showing the last good numbers, and the team works off stale data for hours.',
    },
    {
      icon: <TerminalSquare className="w-[18px] h-[18px]" />,
      badge: 'Schema Drift',
      title: 'One renamed column breaks everything.',
      desc: 'A vendor changes an API payload, or someone edits a CSV header. Downstream logic fails instantly, and someone has to trace the pipeline by hand to find why.',
    },
    {
      icon: <MessageSquareWarning className="w-[18px] h-[18px]" />,
      badge: 'Reactive Monitoring',
      title: 'Users are the alarm system.',
      desc: "A corrupted dataset gets caught because a customer files a ticket — not because the system flagged it. It's the slowest and most expensive way to find out.",
    },
  ];

  return (
    <section className="relative bg-white overflow-hidden py-16 lg:py-24 border-y border-slate-100">

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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/40 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-50/40 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="max-w-2xl text-center md:text-left mx-auto md:mx-0 mb-12 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-slate-50 border border-slate-200
                       text-slate-600 text-xs font-bold uppercase tracking-wider
                       mb-5 shadow-sm animate-fadeInUp"
            style={getAnimStyle(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            The Problem
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-6 animate-fadeInUp"
            style={getAnimStyle(100)}
          >
            Your pipeline doesn't crash. <br className="hidden md:block" />
            <span className="text-slate-800">It just goes quiet.</span>
          </h2>
          <p
            className="text-base sm:text-lg text-slate-600 leading-relaxed font-manrope animate-fadeInUp"
            style={getAnimStyle(200)}
          >
            Writing custom validation scripts for every CSV upload, API poll, and Postgres
            table doesn't scale. Most teams find out something broke when a customer
            tells them — not when it happened.
          </p>
        </div>

        {/* ── SIGNATURE: LOG + PAIN POINTS ────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-stretch">

          {/* Mock log panel */}
          <div className="animate-fadeInUp" style={getAnimStyle(300)}>
            <BatterySaverWrapper>
              <SilentFailureLog />
            </BatterySaverWrapper>
            <p className="text-[12px] text-slate-400 font-manrope mt-3 px-1">
              A real ingestion feed with no monitoring attached. The numbers freeze —
              nothing tells you that they did.
            </p>
          </div>

          {/* Editorial pain-point list */}
          <div className="flex flex-col">
            {painPoints.map((point, idx) => (
              <div
                key={point.title}
                className={`
                  group flex gap-4 py-5 sm:py-6 animate-fadeInUp
                  ${idx !== painPoints.length - 1 ? 'border-b border-slate-100' : ''}
                `}
                style={getAnimStyle(400 + idx * 150)}
              >
                <div className="w-9 h-9 flex-shrink-0 rounded-sm bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-all duration-300">
                  {point.icon}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600/80 transition-colors duration-300 font-manrope">
                    {point.badge}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-poppins mt-1 mb-2 tracking-tight leading-snug">
                    {point.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-manrope">
                    {point.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Problem;