import React from 'react';
import { FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
import { useInView } from './hooks/useInView';

const Team: React.FC = () => {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const getAnimStyle = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    opacity: 0,
  });
  const style = (d: number) => (isInView ? getAnimStyle(d) : { opacity: 0 });

  return (
    <section className="relative bg-white overflow-hidden py-20 lg:py-28 border-t border-slate-100">

      {/* ── BACKGROUND ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-50/40 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-50/40 rounded-full blur-3xl opacity-40" />
      </div>

      <div
        ref={ref}
        className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8"
      >

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-slate-50 border border-slate-200
                       text-slate-500 text-xs font-bold uppercase tracking-wider
                       mb-5 animate-fadeInUp"
            style={style(0)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            The team
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.1] mb-5 animate-fadeInUp"
            style={style(100)}
          >
            Two builders.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              One real product.
            </span>
          </h2>

          <p
            className="text-lg text-slate-500 leading-relaxed font-manrope animate-fadeInUp"
            style={style(200)}
          >
            No "team of world-class engineers." Just two people who built the
            whole thing and can tell you exactly how every part of it works.
          </p>
        </div>

        {/* ── TEAM CARDS ──────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">

          {/* SUBHASH */}
          <div
            className="group flex flex-col items-center text-center
                       rounded-sm border border-slate-200 bg-white p-6 sm:p-8
                       hover:border-blue-200 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.1)]
                       transition-all duration-300 animate-fadeInUp"
            style={style(300)}
          >
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <img
                src="/images/Subhash.jpg"
                alt="Subhash Yaganti"
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-slate-100"
                loading="lazy"
              />
            </div>

            <h3 className="text-[17px] font-bold text-slate-900 font-poppins tracking-tight">
              Subhash Yaganti
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-600 font-manrope">
              Creator · Backend · Infrastructure
            </p>

            <p className="mt-4 text-sm text-slate-500 leading-relaxed font-manrope max-w-sm">
              Designed and built the system end-to-end — authentication, security
              architecture, data pipeline, background job engine, and deployment.
              The 5-layer SQL injection defense, token rotation system, and
              real-time WebSocket layer are all his.
            </p>

            {/* What he actually built — tag strip */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {['Auth & Security', 'Data Pipeline', 'Background Jobs', 'Deployment'].map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100
                             px-2 py-0.5 rounded-full font-manrope"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <a href="mailto:subhashyagantisubbu@gmail.com"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                <SiGmail className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" target="_blank" rel="noreferrer"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all">
                <FaLinkedin className="w-4 h-4" />
              </a>
              <a href="https://github.com/subhash-22-codes" target="_blank" rel="noreferrer"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 transition-all">
                <FaGithub className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/subhash__spiody/" target="_blank" rel="noreferrer"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-pink-500 hover:border-pink-200 hover:bg-pink-50 transition-all">
                <FaInstagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* SIRI */}
          <div
            className="group flex flex-col items-center text-center
                       rounded-sm border border-slate-200 bg-white p-6 sm:p-8
                       hover:border-indigo-200 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.1)]
                       transition-all duration-300 animate-fadeInUp"
            style={style(400)}
          >
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <img
                src="/images/Siri.jpg"
                alt="Siri Mahalaxmi Vemula"
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-slate-100"
                loading="lazy"
              />
            </div>

            <h3 className="text-[17px] font-bold text-slate-900 font-poppins tracking-tight">
              Siri Mahalaxmi Vemula
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-indigo-600 font-manrope">
              Backend · Database Design · AI Integration
            </p>

            <p className="mt-4 text-sm text-slate-500 leading-relaxed font-manrope max-w-sm">
              Built backend APIs, database schema design, and auth integrations.
              Also built the DataPulse AI assistant — a Gemini-powered chat
              interface that lets you query and get insights from your monitored
              data in plain language.
            </p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {['API Development', 'Database Design', 'AI Assistant', 'Auth Integration'].map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100
                             px-2 py-0.5 rounded-full font-manrope"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <a href="mailto:sirimahalaxmivemula@gmail.com"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                <SiGmail className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/in/vemula-siri-mahalaxmi-b4b624319/" target="_blank" rel="noreferrer"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all">
                <FaLinkedin className="w-4 h-4" />
              </a>
              <a href="https://github.com/armycodes" target="_blank" rel="noreferrer"
                className="p-2 rounded-sm bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100 transition-all">
                <FaGithub className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Team;