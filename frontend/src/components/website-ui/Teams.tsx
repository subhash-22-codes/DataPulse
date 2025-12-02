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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 justify-center max-w-4xl mx-auto">
          
          {/* === MEMBER 1: SUBHASH === */}
          <div className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:border-blue-100 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center">
            
            {/* Profile Image */}
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-blue-600/10 rounded-full scale-90 group-hover:scale-110 transition-transform duration-500 blur-xl" />
               <img
                 src="/images/Subhash.jpg"
                 alt="Subhash Yaganti"
                 className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:border-blue-50 transition-colors"
                 loading="lazy"
               />
            </div>

            {/* Info */}
            <h3 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Subhash Yaganti</h3>
            <p className="text-blue-600 font-semibold mb-4 text-sm uppercase tracking-wide">Full Stack & Architecture</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs">
              Designed the core API architecture and selected the high-performance tech stack. Engineered the responsive UI/UX system and orchestrated the full-stack integration for seamless data delivery.
            </p>

            {/* Social Links */}
            <div className="flex justify-center items-center gap-4 mt-auto">
              <a 
                href="mailto:subhashyagantisubbu@gmail.com"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all hover:scale-110"
                aria-label="Email Subhash"
              >
                 <SiGmail className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" 
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all hover:scale-110"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/subhash-22-codes"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all hover:scale-110"
              >
                <FaGithub className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com/subhash__spiody/"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-pink-50 hover:text-pink-500 transition-all hover:scale-110"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* === MEMBER 2: SIRI === */}
          <div className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-900/5 hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center">
            
            {/* Profile Image */}
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-indigo-600/10 rounded-full scale-90 group-hover:scale-110 transition-transform duration-500 blur-xl" />
               <img
                 src="/images/Siri.jpg"
                 alt="Siri Mahalaxmi Vemula"
                 className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:border-indigo-50 transition-colors"
                 loading="lazy"
               />
            </div>

            {/* Info */}
            <h3 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Siri Mahalaxmi Vemula</h3>
            <p className="text-indigo-600 font-semibold mb-4 text-sm uppercase tracking-wide">AI, Data & Backend Engineering</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs">
              Architected the Gemini AI integration pipeline and optimized critical database schemas. Developed the core backend logic to handle complex data aggregation and intelligent schema analysis.
            </p>

            {/* Social Links */}
            <div className="flex justify-center items-center gap-4 mt-auto">
              <a 
                href="https://mail.google.com/mail/?view=cm&fs=1&to=sirimahalaxmivemula@gmail.com"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all hover:scale-110"
              >
                 <SiGmail className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/vemula-siri-mahalaxmi-b4b624319/" 
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all hover:scale-110"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/armycodes"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all hover:scale-110"
              >
                <FaGithub className="w-5 h-5" />
              </a>
              <a 
                href="#"
                target="_blank" rel="noreferrer"
                className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-pink-50 hover:text-pink-500 transition-all hover:scale-110"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Team;