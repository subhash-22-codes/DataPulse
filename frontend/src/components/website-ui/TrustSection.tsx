import React, { useEffect, useRef, useState } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Eye = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const Lock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldOff = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
  </svg>
);

const Trash = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ─── ONE-SHOT IN-VIEW HOOK ─────────────────────────────────────────────────────
function useInView({ threshold = 0.1 }: { threshold?: number } = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView] as const;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface TrustCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

// ─── TRUST SECTION ────────────────────────────────────────────────────────────
const TrustSection: React.FC = () => {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const animStyle = (delay: number): React.CSSProperties =>
    isInView
      ? { animationDelay: `${delay}ms`, animationFillMode: 'forwards', opacity: 0 }
      : { opacity: 0 };

  const trustCards: TrustCard[] = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: 'We connect to your database read-only',
      desc: 'DataPulse only ever reads from your database — never writes, never deletes. You can connect without worrying that something will break in production.',
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: 'Your credentials are never stored in plaintext',
      desc: 'Database passwords and API credentials are protected before being stored. They are never exposed through the application interface.',
    },
    {
      icon: <ShieldOff className="w-5 h-5" />,
      title: 'Your data is never used to train AI models',
      desc: "The data you connect to DataPulse is yours. We don't use it to train models, improve algorithms, or share it with third parties.",
    },
    {
      icon: <Trash className="w-5 h-5" />,
      title: 'Delete your data whenever you want',
      desc: 'You stay in control. Delete a workspace, a source, or your entire account at any time. Nothing is held hostage and nothing lingers.',
    },
  ];

  return (
    <section
      id="trust"
      ref={ref}
      className="relative bg-white overflow-hidden py-20 lg:py-28 border-t border-slate-100"
    >
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
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-blue-50/50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-50/40 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-slate-50 border border-slate-200
                       text-slate-500 text-xs font-bold uppercase tracking-wider
                       mb-5 animate-fadeInUp"
            style={animStyle(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Security & trust
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight
                       text-slate-900 font-poppins leading-[1.1] mb-5 animate-fadeInUp"
            style={animStyle(100)}
          >
            We touch your data.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Here's our commitment.
            </span>
          </h2>

          <p
            className="text-base sm:text-lg text-slate-500 leading-relaxed font-manrope animate-fadeInUp"
            style={animStyle(200)}
          >
            DataPulse connects to your databases, APIs, and files.
            That's a real responsibility — so here's exactly what we
            do and don't do with your data. No marketing language.
          </p>
        </div>

        {/* ── CARDS ─────────────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto mb-8">
          {trustCards.map((card, idx) => (
            <div
              key={card.title}
              className="group flex flex-col gap-4 rounded-sm border border-slate-200 bg-white
                         p-5 sm:p-6
                         hover:border-blue-200
                         hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.1)]
                         transition-all duration-300 animate-fadeInUp"
              style={animStyle(300 + idx * 80)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 flex-shrink-0 rounded-sm bg-blue-50 border border-blue-100
                              flex items-center justify-center text-blue-600
                              group-hover:scale-105 transition-transform duration-300"
                >
                  {card.icon}
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 font-poppins
                               leading-snug tracking-tight pt-1">
                  {card.title}
                </h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-manrope">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TrustSection;