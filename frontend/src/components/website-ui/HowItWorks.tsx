import React from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Check = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Database = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const FileSpreadsheet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const Globe = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const Bell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

// ─── BATTERY SAVER HOOK ───────────────────────────────────────────────────────


// Always renders children now — the unmount-to-placeholder approach was
// the source of scroll glitches (it collapsed section height mid-scroll).
const BatterySaverWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="w-full h-full">{children}</div>;
};

// ─── MOCKUP 1: CONNECT ─────────────────────────────────────────────────────────
const ConnectMockup: React.FC = () => (
  <div className="px-4 sm:px-5 py-5">
    <div className="grid grid-cols-3 gap-2.5">
      {[
        { icon: <Database className="w-4 h-4" />, label: 'PostgreSQL', active: true },
        { icon: <FileSpreadsheet className="w-4 h-4" />, label: 'CSV', active: false },
        { icon: <Globe className="w-4 h-4" />, label: 'REST API', active: false },
      ].map((s) => (
        <div
          key={s.label}
          className={`flex flex-col items-center justify-center gap-2 py-3.5 rounded-sm border text-[11px] font-semibold font-manrope transition-colors
            ${s.active
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-slate-150 bg-slate-50/60 text-slate-400'}`}
        >
          {s.icon}
          {s.label}
        </div>
      ))}
    </div>
    <div className="mt-3.5 rounded-sm border border-slate-150 bg-slate-50/60 px-3 py-2.5 font-mono text-[11.5px] text-slate-500 flex items-center justify-between">
      <span>postgres://prod-db.internal:5432</span>
      <span className="text-emerald-500 font-semibold flex items-center gap-1">
        <Check className="w-3 h-3" /> verified
      </span>
    </div>
  </div>
);

// ─── MOCKUP 2: MAP ──────────────────────────────────────────────────────────────
const MapMockup: React.FC = () => (
  <div className="px-4 sm:px-5 py-5 font-mono text-[12px]">
    <div className="space-y-1.5">
      {[
        { col: 'order_id', type: 'int', status: 'ok' },
        { col: 'customer_email', type: 'text', status: 'ok' },
        { col: 'shipped_at', type: 'timestamp', status: 'ok' },
        { col: 'discount_pct', type: 'float', status: 'new' },
      ].map((row) => (
        <div key={row.col} className="flex items-center justify-between rounded-sm px-2.5 py-1.5 bg-slate-50/60">
          <span className="text-slate-700">{row.col}</span>
          <span className="text-slate-400">{row.type}</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
              row.status === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {row.status === 'new' ? 'new column' : 'baseline'}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ─── MOCKUP 3: ALERT ────────────────────────────────────────────────────────────
const AlertMockup: React.FC = () => (
  <div className="px-4 sm:px-5 py-5">
    <div className="rounded-sm border border-amber-200 bg-amber-50/70 px-3.5 py-3 mb-2.5">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-manrope">Row count drop</span>
      </div>
      <p className="text-[12.5px] text-slate-600 font-manrope">orders_snapshot fell 34% in the last cycle</p>
    </div>
    <div className="rounded-sm border border-slate-150 bg-slate-50/60 px-3.5 py-3 flex items-center justify-between">
      <span className="text-[12px] text-slate-500 font-manrope">Sent to #data-alerts</span>
      <span className="text-[11px] font-semibold text-slate-400 font-mono">0.4s ago</span>
    </div>
  </div>
);

// ─── HOW IT WORKS COMPONENT ───────────────────────────────────────────────────
const HowItWorks: React.FC = () => {
  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });

  const steps = [
    {
      num: '01',
      tag: 'Connect',
      title: 'Point it at your data.',
      desc: 'Add a PostgreSQL connection, an API endpoint, or upload a CSV. No agents to install, no DevOps ticket required.',
      Mockup: ConnectMockup,
    },
    {
      num: '02',
      tag: 'Baseline',
      title: 'It learns the shape of normal.',
      desc: 'DataPulse profiles every column, infers types, and builds a baseline in seconds — so it knows what "healthy" looks like.',
      Mockup: MapMockup,
    },
    {
      num: '03',
      tag: 'Alert',
      title: 'You hear about it first.',
      desc: 'The moment a column disappears, a schema drifts, or row counts fall off a cliff, the right people get notified — not your customers.',
      Mockup: AlertMockup,
    },
  ];

  return (
    <section id="how-it-works" className="relative bg-slate-50/50 overflow-hidden py-20 lg:py-28 border-y border-slate-100">

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
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 animate-fadeInUp"
            style={getAnimStyle(100)}
          >
            How it works
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-6 animate-fadeInUp"
            style={getAnimStyle(200)}
          >
            From connection to alert <br className="hidden sm:block" />
            <span className="text-blue-600">in three steps.</span>
          </h2>
          <p
            className="text-lg text-slate-600 leading-relaxed font-manrope animate-fadeInUp"
            style={getAnimStyle(300)}
          >
            No agents, no config files, no DevOps ticket. Most teams are live and
            watching their first dataset in under two minutes.
          </p>
        </div>

        {/* ── STEP PANELS ─────────────────────────────────────────────────── */}
        <BatterySaverWrapper>
          <div className="relative">
            {/* Connecting line — sits behind panels, at the rail/number row height */}
            <div
              className="hidden lg:block absolute top-[18px] left-[16.5%] right-[16.5%] h-px bg-slate-200 z-0 animate-fadeInUp"
              style={getAnimStyle(400)}
            />

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-7 relative z-10">
              {steps.map((step, idx) => {
                const Mockup = step.Mockup;
                return (
                  <div
                    key={step.num}
                    className="flex flex-col animate-fadeInUp"
                    style={getAnimStyle(500 + idx * 150)}
                  >
                    {/* Rail: number + tag */}
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-[13px] font-bold font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-sm w-9 h-9 flex items-center justify-center flex-shrink-0">
                        {step.num}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 font-manrope">
                        {step.tag}
                      </span>
                    </div>

                    {/* Product mockup card */}
                    <div className="rounded-sm border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] overflow-hidden mb-5 group hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300">
                      {/* window chrome */}
                      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                      </div>
                      <Mockup />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-poppins mb-2 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-manrope">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </BatterySaverWrapper>

      </div>
    </section>
  );
};

export default HowItWorks;