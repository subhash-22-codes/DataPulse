import React, { useState, useEffect, useRef } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const DatabaseAlert = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M15 21v-6" /><path d="M15 21h-6" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const TerminalSquare = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m7 11 2-2-2-2" /><path d="M11 13h4" />
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
  </svg>
);

const MessageSquareWarning = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M12 7v2" /><path d="M12 13h.01" />
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

// ─── LOG DATA ─────────────────────────────────────────────────────────────────
type LogRow = { time: string; label: string; rows: string; state: 'ok' | 'stale' };

const LOG_ROWS: LogRow[] = [
  { time: '09:14', label: 'orders_snapshot', rows: '48,210 rows', state: 'ok' },
  { time: '09:29', label: 'orders_snapshot', rows: '48,402 rows', state: 'ok' },
  { time: '09:44', label: 'orders_snapshot', rows: '48,690 rows', state: 'ok' },
  { time: '09:59', label: 'orders_snapshot', rows: '48,690 rows', state: 'stale' },
  { time: '10:14', label: 'orders_snapshot', rows: '48,690 rows', state: 'stale' },
  { time: '10:29', label: 'orders_snapshot', rows: '48,690 rows', state: 'stale' },
];

// ─── SILENT FAILURE LOG ───────────────────────────────────────────────────────
const SilentFailureLog: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [ref, isInView] = useLiveInView({ threshold: 0.35 });
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
      className="relative bg-slate-950 rounded-sm border border-slate-800 overflow-hidden shadow-[0_16px_48px_rgba(15,23,42,0.3)]"
    >
      {/* ── Window chrome ── */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800/80 bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 font-manrope">
          ingestion.log — no monitoring
        </span>
        <span className="w-10" />
      </div>

      {/* ── Column headers ── */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-2 border-b border-slate-800/50">
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-600 w-10 sm:w-[52px] flex-shrink-0">
          Time
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-600 flex-1">
          Source
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-600 flex-shrink-0">
          Rows
        </span>
      </div>

      {/* ── Log rows ── */}
      <div className="px-4 sm:px-5 py-3 font-mono">
        {LOG_ROWS.slice(0, visibleCount).map((row, i) => (
          <div
            key={row.time}
            className={`flex items-center gap-3 py-2 border-b border-slate-800/30 last:border-0
              transition-all duration-300
              ${row.state === 'stale' ? 'opacity-50' : 'opacity-100'}
            `}
            style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}
          >
            {/* Time */}
            <span className="text-[11px] sm:text-[12px] text-slate-500 w-10 sm:w-[52px] flex-shrink-0 tabular-nums">
              {row.time}
            </span>

            {/* Label */}
            <span className="text-[11px] sm:text-[12px] text-slate-300 flex-1 truncate">
              {row.label}
            </span>

            {/* Rows count */}
            <span className={`text-[11px] sm:text-[12px] flex-shrink-0 font-semibold tabular-nums
              ${row.state === 'ok' ? 'text-emerald-400' : 'text-slate-600'}`}>
              {row.rows}
            </span>

            {/* Unchanged badge — only on first stale */}
            {row.state === 'stale' && i === staleStartIndex && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">
                frozen
              </span>
            )}
          </div>
        ))}

        {/* ── The line that never comes ── */}
        {visibleCount >= LOG_ROWS.length && (
          <div
            className="flex items-start gap-3 mt-3 pt-3 border-t border-slate-800"
            style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0 mt-1.5" />
            <p className="text-[11px] sm:text-[12px] text-slate-600 leading-relaxed font-manrope">
              No alert was sent.{' '}
              <span className="text-slate-500">No one noticed until Monday morning.</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Flatline indicator at bottom ── */}
      {visibleCount >= LOG_ROWS.length && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 font-manrope">
            Feed stopped · 10:29 · No watcher configured
          </span>
        </div>
      )}
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
      badgeColor: 'text-red-600 bg-red-50 border-red-100',
      iconBg: 'bg-red-50 border-red-100 text-red-500 group-hover:bg-red-100 group-hover:text-red-600',
      title: 'Data stops. Nobody notices.',
      desc: 'A Postgres connection drops or a cron job stalls. The dashboard keeps showing last good numbers — and the team works off stale data for hours without knowing.',
    },
    {
      icon: <TerminalSquare className="w-[18px] h-[18px]" />,
      badge: 'Schema Drift',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-100',
      iconBg: 'bg-amber-50 border-amber-100 text-amber-500 group-hover:bg-amber-100 group-hover:text-amber-600',
      title: 'One renamed column breaks everything.',
      desc: 'A vendor changes an API payload. Someone edits a CSV header. Downstream logic fails silently, and someone has to trace the pipeline by hand to find why.',
    },
    {
      icon: <MessageSquareWarning className="w-[18px] h-[18px]" />,
      badge: 'Reactive Monitoring',
      badgeColor: 'text-orange-700 bg-orange-50 border-orange-100',
      iconBg: 'bg-orange-50 border-orange-100 text-orange-500 group-hover:bg-orange-100 group-hover:text-orange-600',
      title: 'Your users are the alarm system.',
      desc: "A corrupted dataset gets caught because a customer files a support ticket — not because the system flagged it. That's the slowest and most expensive way to find out.",
    },
  ];

  return (
    <section className="relative bg-white overflow-hidden py-16 lg:py-24 border-y border-slate-100">

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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-50/30 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-50/30 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div className="max-w-2xl text-center md:text-left mx-auto md:mx-0 mb-12 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-slate-50 border border-slate-200
                       text-slate-500 text-xs font-bold uppercase tracking-wider
                       mb-5 animate-fadeInUp"
            style={getAnimStyle(0)}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            The Problem
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight
                       text-slate-900 font-poppins leading-[1.1] mb-5 animate-fadeInUp"
            style={getAnimStyle(100)}
          >
            Your pipeline doesn't crash.{' '}
            <br className="hidden sm:block" />
            <span className="text-slate-400">It just goes quiet.</span>
          </h2>

          <p
            className="text-base sm:text-lg text-slate-500 leading-relaxed font-manrope animate-fadeInUp"
            style={getAnimStyle(200)}
          >
            Most data teams find out something broke when a customer tells them.
            Not when it happened. Writing custom validation scripts for every CSV,
            API poll, and Postgres table doesn't scale — and silently failing pipelines
            cost more than engineering time.
          </p>
        </div>

        {/* ── MAIN CONTENT GRID ─────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* ── LEFT: LOG PANEL ─────────────────────────────────────────────── */}
          <div
            className="animate-fadeInUp"
            style={getAnimStyle(300)}
          >
            <SilentFailureLog />
            <p className="text-[11px] sm:text-[12px] text-slate-400 font-manrope mt-3 px-0.5 leading-relaxed">
              A real ingestion feed with no monitoring attached. The row count freezes
              at 09:59 — and nothing in the system tells you that it did.
            </p>
          </div>

          {/* ── RIGHT: PAIN POINTS ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-0">
            {painPoints.map((point, idx) => (
              <div
                key={point.title}
                className={`group flex gap-4 py-5 sm:py-6 animate-fadeInUp
                  ${idx !== painPoints.length - 1
                    ? 'border-b border-slate-100'
                    : ''
                  }`}
                style={getAnimStyle(400 + idx * 130)}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 flex-shrink-0 rounded-sm border
                    flex items-center justify-center
                    transition-all duration-300 mt-0.5
                    ${point.iconBg}`}
                >
                  {point.icon}
                </div>

                <div className="min-w-0">
                  {/* Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full
                      border text-[10px] font-bold uppercase tracking-wider
                      font-manrope mb-2 ${point.badgeColor}`}
                  >
                    {point.badge}
                  </span>

                  {/* Title */}
                  <h3 className="text-[15px] sm:text-base font-bold text-slate-900
                                 font-poppins mb-2 tracking-tight leading-snug">
                    {point.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed font-manrope">
                    {point.desc}
                  </p>
                </div>
              </div>
            ))}

            {/* ── Callout strip ── */}
            <div
              className="mt-4 rounded-sm border border-slate-200 bg-slate-50/80
                         px-4 py-4 animate-fadeInUp"
              style={getAnimStyle(850)}
            >
              <p className="text-[12px] sm:text-[13px] text-slate-500 leading-relaxed font-manrope">
                <span className="text-slate-800 font-semibold">
                  DataPulse catches all three.
                </span>{' '}
                Row count drops, schema drift, and stale feeds — detected automatically,
                every poll cycle, with alerts sent before anyone notices.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Problem;