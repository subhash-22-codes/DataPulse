import React from 'react';
import { FaLinkedin, FaGithub, FaInstagram } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
// Adjust path to your hooks folder
import { useInView } from './hooks/useInView'; 

const Team = () => {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  return (
    <section 
      className="relative py-24 px-6 sm:px-10 lg:px-16 overflow-hidden bg-slate-50"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Subtle Grid */}
         <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
         />
         {/* Soft Blue Glows */}
         <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px]" />
         <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px]" />
      </div>

      <div 
        ref={ref}
        className={`relative z-10 max-w-6xl mx-auto text-center scroll-fade-in ${isInView ? 'is-visible' : ''}`}
      >
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Our Team
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Meet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Builders</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            The engineering minds architecting the future of real-time data monitoring.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-4xl mx-auto">

          
          {/* === MEMBER 1: SUBHASH === */}
          <div className="group relative flex flex-col items-center text-center
            rounded-2xl sm:rounded-3xl
            bg-white border border-slate-200 shadow-sm
            p-5 sm:p-6 lg:p-8
            transition-all duration-300
            sm:hover:-translate-y-1 sm:hover:shadow-xl sm:hover:border-blue-100">

            {/* Avatar */}
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-xl
                scale-90 sm:group-hover:scale-110 transition-transform duration-500" />
              <img
                src="/images/Subhash.jpg"
                alt="Subhash Yaganti"
                className="relative rounded-full object-cover border-4 border-white shadow-md
                  w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28
                  transition-colors sm:group-hover:border-blue-50"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Subhash Yaganti
            </h3>

            <p className="mt-1 text-xs sm:text-sm font-semibold uppercase tracking-wide text-blue-600">
               Full-Stack Engineering, Backend Systems & Architecture
            </p>

            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
               Co-designed the system architecture and engineered backend services,
              including asynchronous task processing, containerized deployment workflows,
              and application security. Contributed equally to frontend engineering,
              UI/UX design, and full-stack integration.

            </p>

            {/* Socials */}
            <div className="mt-5 flex gap-3">
              <a
                href="mailto:subhashyagantisubbu@gmail.com"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
              >
                <SiGmail className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
              >
                <FaLinkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://github.com/subhash-22-codes"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <FaGithub className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://www.instagram.com/subhash__spiody/"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-pink-50 hover:text-pink-500 transition"
              >
                <FaInstagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>

          {/* === MEMBER 2: SIRI === */}
          <div className="group relative flex flex-col items-center text-center
            rounded-2xl sm:rounded-3xl
            bg-white border border-slate-200 shadow-sm
            p-5 sm:p-6 lg:p-8
            transition-all duration-300
            sm:hover:-translate-y-1 sm:hover:shadow-xl sm:hover:border-indigo-100">

            {/* Avatar */}
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-xl
                scale-90 sm:group-hover:scale-110 transition-transform duration-500" />
              <img
                src="/images/Siri.jpg"
                alt="Siri Mahalaxmi Vemula"
                className="relative rounded-full object-cover border-4 border-white shadow-md
                  w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28
                  transition-colors sm:group-hover:border-indigo-50"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Siri Mahalaxmi Vemula
            </h3>

            <p className="mt-1 text-xs sm:text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Backend Engineering, Data Systems & AI Integration
            </p>

            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-sm">
               Co-engineered backend systems with a focus on database design, SQL operations,
               and data processing pipelines. Led the integration of AI capabilities and
               contributed equally to backend logic, frontend functionality, and overall
               system reliability.
            </p>

            {/* Socials */}
            <div className="mt-5 flex gap-3">
              <a
                href="mailto:sirimahalaxmivemula@gmail.com"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
              >
                <SiGmail className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/vemula-siri-mahalaxmi-b4b624319/"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
              >
                <FaLinkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://github.com/armycodes"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <FaGithub className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-pink-50 hover:text-pink-500 transition"
              >
                <FaInstagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Team;