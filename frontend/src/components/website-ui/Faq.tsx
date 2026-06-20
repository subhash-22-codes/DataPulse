import React, { useState, useEffect, useRef } from 'react';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const ChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9" />
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

// ─── FAQ DATA ───────────────────────────────────────────────────────────────────
const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is my data shared with anyone?',
    a: "No. Your data is used only to run the monitoring you set up — schema checks, quality analysis, alerts. It's never sold, shared, or used for anything else.",
  },
  {
    q: 'What happens if I delete a workspace?',
    a: "It's scheduled for deletion and access is disabled immediately, but it isn't gone right away — you have a 30-day window to recover it before it's permanently removed.",
  },
  {
    q: "What happens if I hit a free-tier limit?",
    a: "DataPulse tells you clearly and blocks just that one action — for example, you won't be able to create a 4th workspace or upload past 500,000 rows in one file. Everything you already have keeps running normally.",
  },
  {
    q: "Why isn't DataPulse open source?",
    a: "We're early — 20 users, two builders, and a real security model we're still hardening. The code is intentionally private for now so we can move fast without exposing the architecture to a wider audience before it's ready. That may change later.",
  },
  {
    q: 'Which data sources can I connect?',
    a: 'CSV uploads, any REST API you can poll on a schedule, and direct read-only PostgreSQL connections. Each upload or poll is versioned and compared automatically against the one before it.',
  },
  {
    q: 'Can my team use the same workspace?',
    a: "Yes — invite teammates and everyone gets notified together. Each early-access workspace currently supports up to 2 members; if you need more, just reach out.",
  },
  {
    q: 'Do I need to install anything?',
    a: 'No agents, no SDKs, no config files. Connect a source through the dashboard and DataPulse starts profiling it within seconds.',
  },
  {
    q: 'How will I be notified when something breaks?',
    a: 'Two ways at once: an in-app real-time notification over WebSocket, and an email to everyone in the workspace — so you find out whether or not you happen to be looking at the dashboard.',
  },
];

// ─── FAQ COMPONENT ──────────────────────────────────────────────────────────────
const Faq: React.FC = () => {
  const [ref, isInView] = useLiveInView({ threshold: 0.1 });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

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

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-12 lg:mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-white border border-slate-200
                       text-slate-600 text-xs font-bold uppercase tracking-wider
                       mb-5 shadow-sm animate-fadeInUp"
            style={style(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            FAQ
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-5 animate-fadeInUp"
            style={style(100)}
          >
            Questions we've actually <span className="text-blue-600">been asked.</span>
          </h2>
          <p
            className="text-lg text-slate-600 leading-relaxed font-manrope animate-fadeInUp"
            style={style(200)}
          >
            Not a generic FAQ template — these are the real ones.
          </p>
        </div>

        {/* ── ACCORDION ────────────────────────────────────────────────────── */}
        <div
          className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden animate-fadeInUp"
          style={style(300)}
        >
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q} className={idx !== FAQS.length - 1 ? 'border-b border-slate-100' : ''}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex items-center justify-between w-full text-left px-5 sm:px-7 py-5 gap-4"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-bold text-slate-900 font-poppins tracking-tight">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-60' : 'max-h-0'}`}>
                  <p className="px-5 sm:px-7 pb-5 text-sm text-slate-600 leading-relaxed font-manrope max-w-2xl">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p
          className="text-center text-[13px] text-slate-400 font-manrope mt-8 animate-fadeInUp"
          style={style(400)}
        >
          Still have a question?{' '}
          <a href="mailto:datapulseapp@gmail.com" className="text-blue-600 font-semibold hover:underline">
            Ask us directly
          </a>
          — a real person reads it.
        </p>

      </div>
    </section>
  );
};

export default Faq;