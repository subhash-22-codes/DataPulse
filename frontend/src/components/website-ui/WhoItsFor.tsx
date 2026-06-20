import React, { useState, useEffect, useRef } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const Store = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 7l1.5-4h17L22 7" /><path d="M2 7h20v13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const Rocket = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a9 9 0 0 1 9-9c.5 4-1.5 7.5-4 9z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const Users = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Code = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
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

// ─── WHO IT'S FOR ─────────────────────────────────────────────────────────────
const WhoItsFor: React.FC = () => {
  const [isInView] = useLiveInView({ threshold: 0.1 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

  const builtFor = [
    {
      icon: <Store className="w-[18px] h-[18px]" />,
      title: 'E-commerce & ops teams',
      desc: 'Your orders CSV drops 40% of records overnight and your dashboard shows nonsense by morning. DataPulse flags the row drop the moment it happens — before anyone ships a report built on bad data.',
      tag: 'Row count drops · Schema drift · Threshold alerts',
    },
    {
      icon: <Rocket className="w-[18px] h-[18px]" />,
      title: 'Startups with a single data person',
      desc: "You're polling a payments or CRM API on a schedule. When it starts returning empty arrays, nobody notices for three days. DataPulse watches every poll and raises an incident automatically — severity included.",
      tag: 'REST API polling · Incident engine · Real-time alerts',
    },
    {
      icon: <Users className="w-[18px] h-[18px]" />,
      title: 'Freelance analysts & consultants',
      desc: "You're juggling three clients' datasets and you need a fast sanity check before a report leaves the door. Upload the CSV, DataPulse runs quality analysis — missing values, duplicates, outliers, column health — in one shot.",
      tag: 'Data quality engine · Column health scores · IQR outliers',
    },
    {
      icon: <Code className="w-[18px] h-[18px]" />,
      title: 'Solo SaaS builders',
      desc: "A column gets renamed upstream and your pipeline silently breaks. DataPulse detects schema drift — columns added, removed, or renamed — on every ingestion cycle and notifies your team via WebSocket and email before users notice.",
      tag: 'Schema diff · WebSocket notifications · Email alerts',
    },
  ];

  const notBuiltFor = [
    {
      text: 'An ETL or data transformation tool — DataPulse ingests and watches your data as-is. It doesn\'t blend, clean, reshape, or move it between systems.',
    },
    {
      text: 'An enterprise compliance platform — we\'re in early access. SOC2-grade audit trails and enterprise SSO aren\'t here yet.',
    },
    {
      text: 'A BI or dashboarding replacement — it sits upstream of the dashboard you already use and tells you when the data feeding it has gone wrong.',
    },
  ];

  return (
    <section id="who-its-for" className="relative bg-white overflow-hidden py-20 lg:py-28 border-t border-slate-100">

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
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-indigo-50/40 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-slate-50 border border-slate-200
                       text-slate-500 text-xs font-bold uppercase tracking-wider
                       mb-5 animate-fadeInUp"
            style={style(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Who It's For
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-5 animate-fadeInUp"
            style={style(100)}
          >
            Built for teams that find out{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              too late.
            </span>
          </h2>

          <p
            className="text-lg text-slate-500 leading-relaxed font-manrope animate-fadeInUp"
            style={style(200)}
          >
            A column gets renamed. An API returns empty arrays. A job drops 40% of records.{' '}
            <span className="text-slate-700 font-semibold">Most teams find out when a user complains.</span>{' '}
            Here's who DataPulse is built for.
          </p>
        </div>

        {/* ── BUILT FOR GRID ──────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto mb-10 lg:mb-12">
          {builtFor.map((p, idx) => (
            <div
              key={p.title}
              className="group flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6
                         hover:border-blue-200 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.1)]
                         transition-all duration-300 animate-fadeInUp"
              style={style(300 + idx * 100)}
            >
              {/* Icon + title row */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 flex-shrink-0 rounded-sm bg-blue-50 border border-blue-100
                                flex items-center justify-center text-blue-600
                                group-hover:scale-105 transition-transform duration-300">
                  {p.icon}
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 font-poppins leading-snug tracking-tight pt-1">
                  {p.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-500 leading-relaxed font-manrope">
                {p.desc}
              </p>

              {/* Feature tag strip */}
              <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                {p.tag.split(' · ').map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100
                               px-2 py-0.5 rounded-full font-manrope"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── NOT BUILT FOR ───────────────────────────────────────────────────── */}
        <div
          className="max-w-4xl mx-auto rounded-sm border border-slate-200 bg-slate-50/60 p-6 sm:p-8 animate-fadeInUp"
          style={style(800)}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-manrope block mb-5">
            What DataPulse isn't
          </span>
          <div className="flex flex-col gap-4">
            {notBuiltFor.map((n) => (
              <div key={n.text} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-sm bg-white border border-slate-200
                                 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-3 h-3 text-slate-400" />
                </span>
                <span className="text-[13.5px] text-slate-500 leading-relaxed font-manrope">
                  {n.text}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default WhoItsFor;