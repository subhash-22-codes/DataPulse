import React, { useState, useEffect, useRef } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Eye = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const GitBranch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

const Lock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ExternalLink = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 3h6v6" /><path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
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

// ─── SOURCE AVAILABLE COMPONENT ────────────────────────────────────────────────
const SourceAvailable: React.FC = () => {
  const [ref, isInView] = useLiveInView({ threshold: 0.1 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

  const terms = [
    {
      icon: <Eye className="w-[18px] h-[18px]" />,
      allow: true,
      text: 'View and read every line — including the security layers we talk about above.',
    },
    {
      icon: <GitBranch className="w-[18px] h-[18px]" />,
      allow: true,
      text: 'Fork it for private evaluation, or reference the architecture for learning.',
    },
    {
      icon: <Lock className="w-[18px] h-[18px]" />,
      allow: false,
      text: "Not licensed for redistribution or reuse in your own product — yet.",
    },
  ];

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
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: COPY ──────────────────────────────────────────────────── */}
          <div className="text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-white border border-slate-200
                         text-slate-600 text-xs font-bold uppercase tracking-wider
                         mb-5 shadow-sm animate-fadeInUp"
              style={style(0)}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Source Available
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-6 animate-fadeInUp"
              style={style(100)}
            >
              Built in the open. <br />
              <span className="text-blue-600">Not given away. Yet.</span>
            </h2>
            <p
              className="text-lg text-slate-600 leading-relaxed font-manrope mb-8 max-w-md mx-auto lg:mx-0 animate-fadeInUp"
              style={style(200)}
            >
              The repository is public — every claim we make about security
              and data handling, you can go check yourself. We're not open
              source yet, so we're upfront about exactly what that means.
            </p>

            <div
              className="inline-flex animate-fadeInUp"
              style={style(300)}
            >
              <a
                href="https://github.com/subhash-22-codes/datapulse"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group relative h-11 px-7
                  rounded-sm border border-slate-200 bg-white
                  text-slate-700 font-bold text-[13px] font-manrope tracking-wider
                  hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900
                  transition-all active:scale-[0.98]
                  inline-flex items-center justify-center gap-2
                "
              >
                View the Repository
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>

          {/* ── RIGHT: LICENSE TERMS CARD ───────────────────────────────────── */}
          <div
            className="rounded-sm border border-slate-200 bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.1)] overflow-hidden animate-fadeInUp"
            style={style(250)}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-manrope">
                LICENSE.md
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                source-available
              </span>
            </div>
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              {terms.map((t, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 flex-shrink-0 rounded-sm border flex items-center justify-center
                      ${t.allow
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : 'bg-slate-50 border-slate-150 text-slate-400'}`}
                  >
                    {t.icon}
                  </div>
                  <p className="text-[13.5px] text-slate-600 leading-relaxed font-manrope pt-1">
                    {t.text}
                  </p>
                </div>
              ))}
              <div className="mt-1 pt-4 border-t border-slate-100 text-[12px] text-slate-400 font-manrope">
                Full terms, and how to request permission for anything beyond
                this, are in the repo's license file.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default SourceAvailable;