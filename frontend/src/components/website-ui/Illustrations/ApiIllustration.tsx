import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const ApiPollIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `api-poll-prod-${rawId.replace(/[:\s]/g, '')}`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="API Polling Cycle"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* --- 1. GLOW FILTERS --- */}
        {/* Strong Data Glow (Cyan) */}
        <filter id={`${id}-glow-data`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feFlood floodColor="#06B6D4" floodOpacity="0.6" />
          <feComposite operator="in" in2="blur" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Server Glow (Violet) */}
        <filter id={`${id}-glow-server`} x="-50%" y="-50%" width="200%" height="200%">
           <feGaussianBlur stdDeviation="3" result="blur" />
           <feFlood floodColor="#7C3AED" floodOpacity="0.4" />
           <feComposite operator="in" in2="blur" />
           <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
           </feMerge>
        </filter>

        {/* --- 2. GRADIENTS --- */}
        
        {/* Client Body (Slate/Dark Metal) */}
        <linearGradient id={`${id}-grad-client-body`} x1="0" y1="0" x2="1" y2="0">
           <stop offset="0%" stopColor="#1E293B" />
           <stop offset="50%" stopColor="#334155" />
           <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id={`${id}-grad-client-top`} x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stopColor="#475569" />
           <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* API Server Body (Vibrant Indigo) */}
        <linearGradient id={`${id}-grad-api-body`} x1="0" y1="0" x2="1" y2="0">
           <stop offset="0%" stopColor="#4C1D95" />
           <stop offset="50%" stopColor="#6D28D9" />
           <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id={`${id}-grad-api-top`} x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stopColor="#8B5CF6" />
           <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>

        {/* Data Pipe Gradient (Neon Cyan) */}
        <linearGradient id={`${id}-grad-pipe`} x1="1" y1="0" x2="0" y2="0">
           <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.1" />
           <stop offset="50%" stopColor="#22D3EE" stopOpacity="1" />
           <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
        </linearGradient>

        {/* Sync Icon Gradient */}
        <linearGradient id={`${id}-grad-sync`} x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stopColor="#94A3B8" />
           <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>


      {/* --- 1. LEFT UNIT: THE CLIENT (Poller) --- */}
      <g transform="translate(12, 36)">
         {/* Ground Shadow */}
         <ellipse cx="0" cy="8" rx="10" ry="4" fill="#000" opacity="0.3" filter={`url(#${id}-glow-data)`} /> 
         
         {/* Main Block */}
         <path d="M-8 -6 V 6 C -8 10 8 10 8 6 V -6" fill={`url(#${id}-grad-client-body)`} />
         <ellipse cx="0" cy="-6" rx="8" ry="3" fill={`url(#${id}-grad-client-top)`} stroke="#1E293B" strokeWidth="0.5" />
         
         {/* Rim Light */}
         <path d="M-7 -7 Q 0 -9 7 -7" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" fill="none" />
         
         {/* Detail: Status Dot (Amber = Waiting) */}
         {/* Removed <animate> to resolve TS errors */}
         <circle cx="0" cy="0" r="1.5" fill="#F59E0B" />
      </g>


      {/* --- 2. RIGHT UNIT: THE API (Source) --- */}
      <g transform="translate(52, 36)">
         {/* Ground Shadow & Glow */}
         <ellipse cx="0" cy="8" rx="10" ry="4" fill="#000" opacity="0.4" filter={`url(#${id}-glow-server)`} />
         
         {/* Main Block */}
         <path d="M-8 -6 V 6 C -8 10 8 10 8 6 V -6" fill={`url(#${id}-grad-api-body)`} />
         <ellipse cx="0" cy="-6" rx="8" ry="3" fill={`url(#${id}-grad-api-top)`} stroke="#4C1D95" strokeWidth="0.5" />
         
         {/* Rim Light */}
         <path d="M-7 -7 Q 0 -9 7 -7" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" fill="none" />
         
         {/* Detail: Core Light */}
         <circle cx="0" cy="0" r="1.5" fill="white" filter={`url(#${id}-glow-server)`} />
      </g>


      {/* --- 3. THE CYCLE: TOP ARC (Request) --- */}
      <g>
        <path 
           d="M 12 30 C 12 14, 52 14, 52 30" 
           stroke="#64748B" 
           strokeWidth="1" 
           strokeDasharray="3 3"
           fill="none"
           opacity="0.6"
        />
        <circle cx="32" cy="22" r="1.5" fill="#94A3B8" />
      </g>


      {/* --- 4. THE CYCLE: BOTTOM ARC (Response) --- */}
      <g filter={`url(#${id}-glow-data)`}>
         <path 
            d="M 52 42 C 52 58, 12 58, 12 42" 
            stroke={`url(#${id}-grad-pipe)`} 
            strokeWidth="2.5" 
            strokeLinecap="round"
            fill="none"
         />
         <path d="M 16 46 L 11 41 L 17 40" fill="#22D3EE" />
      </g>


      {/* --- 5. DATA CHUNKS --- */}
      <g>
         <rect 
            x="30" y="52" width="6" height="3" rx="1" 
            fill="#A5F3FC" 
            transform="rotate(-5 33 53.5)"
            filter={`url(#${id}-glow-data)`}
         />
         <rect 
            x="40" y="50" width="4" height="2" rx="0.5" 
            fill="#22D3EE" 
            transform="rotate(-15 42 51)"
            opacity="0.8"
         />
      </g>


      {/* --- 6. CENTER ICON: SYNC/POLL INDICATOR --- */}
      <g transform="translate(32, 36)">
         {/* Background Circle */}
         <circle cx="0" cy="0" r="6" fill="#0F172A" stroke="#334155" strokeWidth="0.5" />
         
         {/* Arrows */}
         {/* FIXED: Removed duplicate stroke attribute here */}
         <path 
            d="M-3 0 A 3 3 0 0 1 3 0" 
            stroke={`url(#${id}-grad-sync)`} 
            strokeWidth="1" 
            strokeLinecap="round" 
            fill="none" 
            transform="rotate(20)"
         />
         <path d="M 2.5 0 L 4 -1.5 M 2.5 0 L 4 1.5" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" transform="rotate(20)" />

         <path 
            d="M3 0 A 3 3 0 0 1 -3 0" 
            stroke="#64748B" strokeWidth="1" strokeLinecap="round" 
            fill="none" 
            transform="rotate(20)"
         />
         <path d="M -2.5 0 L -4 -1.5 M -2.5 0 L -4 1.5" stroke="#64748B" strokeWidth="1" strokeLinecap="round" transform="rotate(20)" />
      </g>

    </svg>
  );
};

export default ApiPollIllustration;