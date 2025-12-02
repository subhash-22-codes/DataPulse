import React from 'react';
// Ensure this path matches your structure
import { useInView } from './hooks/useInView'; 

export default function Architecture() {
  const [headerRef, isHeaderVisible] = useInView({ threshold: 0.2 });
  const [imgRef, isImgVisible] = useInView({ threshold: 0.1 });

  return (
    // 1. THEME: Clean Light Theme Base (White/Slate)
    <section 
      id="architecture"
      className="relative py-24 lg:py-32 px-6 sm:px-10 lg:px-16 overflow-hidden bg-white"
    >
      {/* Background Decor (Subtle & Professional) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Faint Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Soft Blue Glow (Top Center) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-50/80 to-transparent rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div 
          ref={headerRef}
          className={`text-center mb-16 lg:mb-20
                      scroll-fade-in ${isHeaderVisible ? 'is-visible' : ''}`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Under the Hood
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Architecture</span>
          </h2>
          
          <p 
            className="text-lg sm:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto"
            style={{ transitionDelay: '100ms' }}
          >
            A high-level overview of our intelligent data flow and security layers. 
            Designed for speed, security, and scalability.
          </p>
        </div>

        {/* 2. ARCHITECTURE IMAGE DISPLAY (The "Stage") */}
        <div 
          ref={imgRef}
          className={`relative max-w-3xl mx-auto
                      scroll-fade-in ${isImgVisible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '200ms' }}
        >
           {/* The Container Frame */}
           <div className="relative rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden group">
              
              {/* Optional: Browser-like Header Bar for "App" feel */}
              <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400/80" />
                 <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                 <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>

              {/* The Image Itself */}
              <div className="p-4 sm:p-6 lg:p-14 bg-slate-50/30">
                 <img 
                    src="/images/Architecture.png" 
                    alt="DataPulse Platform Architecture Diagram" 
                    className="w-full h-auto object-contain block rounded-lg shadow-sm mix-blend-multiply opacity-95 group-hover:opacity-100 transition-opacity duration-500"
                    loading="lazy"
                 />
              </div>

              {/* Shine Effect on Hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform ease-in-out" style={{ transitionDuration: '1s' }} />
           </div>

           {/* Decorative Background Elements behind the image box */}
           <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-5 blur-2xl rounded-3xl -z-10" />
        </div>

      </div>
    </section>
  );
}