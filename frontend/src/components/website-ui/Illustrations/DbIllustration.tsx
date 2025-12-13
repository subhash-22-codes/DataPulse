import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const DbIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `db-prod-${rawId.replace(/[:\s]/g, '')}`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Database Storage"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* --- 1. Shadows & Glows --- */}
        {/* Deep Ground Shadow */}
        <filter id={`${id}-shadow-ground`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#0F172A" floodOpacity="0.3" />
          <feComposite operator="in" in2="blur" />
        </filter>

        {/* Data Block Glow (Cyan) */}
        <filter id={`${id}-glow-data`} x="-50%" y="-50%" width="200%" height="200%">
           <feGaussianBlur stdDeviation="2" result="blur" />
           <feFlood floodColor="#22D3EE" floodOpacity="0.4" />
           <feComposite operator="in" in2="blur" />
           <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
           </feMerge>
        </filter>

        {/* --- 2. Gradients --- */}
        {/* Metal Body: Brushed Steel look */}
        <linearGradient id={`${id}-grad-metal-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1E293B" />   {/* Dark Side */}
          <stop offset="20%" stopColor="#334155" />
          <stop offset="50%" stopColor="#64748B" />  {/* Highlight Middle */}
          <stop offset="80%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" /> {/* Dark Side */}
        </linearGradient>

        {/* Metal Top Surface */}
        <linearGradient id={`${id}-grad-metal-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Data Block: Glassy Cyan */}
        <linearGradient id={`${id}-grad-data`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5F3FC" stopOpacity="0.9" /> {/* Cyan 200 */}
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" /> {/* Cyan 500 */}
        </linearGradient>

        {/* Indicator Lights */}
        <radialGradient id={`${id}-light-green`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#16A34A" />
        </radialGradient>
        <radialGradient id={`${id}-light-blue`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
        </radialGradient>
      </defs>


      {/* --- SERVER RACK --- */}
      <g transform="translate(32, 0)">
        {/* Ground Shadow */}
        <ellipse cx="0" cy="52" rx="22" ry="7" fill="none" filter={`url(#${id}-shadow-ground)`} />

        {/* === Bottom Unit === */}
        <g transform="translate(0, 44)">
           <path d="M-20 -5 V5 C-20 9 20 9 20 5 V-5" fill={`url(#${id}-grad-metal-body)`} />
           <ellipse cx="0" cy="-5" rx="20" ry="5" fill={`url(#${id}-grad-metal-top)`} stroke="#334155" strokeWidth="0.5"/>
           {/* Rim Highlight */}
           <path d="M-19 -6 Q0 -9 19 -6" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />
           {/* Status Light with Glow */}
           <circle cx="12" cy="0" r="1.5" fill={`url(#${id}-light-green)`} filter={`url(#${id}-glow-data)`} />
        </g>

        {/* === Middle Unit === */}
        <g transform="translate(0, 34)">
           {/* Shadow cast on unit below */}
           <ellipse cx="0" cy="5" rx="20" ry="5" fill="#0F172A" opacity="0.3" filter="url(#id-blur)" />
           
           <path d="M-20 -5 V5 C-20 9 20 9 20 5 V-5" fill={`url(#${id}-grad-metal-body)`} />
           <ellipse cx="0" cy="-5" rx="20" ry="5" fill={`url(#${id}-grad-metal-top)`} stroke="#334155" strokeWidth="0.5"/>
           <path d="M-19 -6 Q0 -9 19 -6" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />
           <circle cx="12" cy="0" r="1.5" fill={`url(#${id}-light-blue)`} filter={`url(#${id}-glow-data)`} />
        </g>

        {/* === Top Unit (Primary) === */}
        <g transform="translate(0, 24)">
           {/* Shadow cast on unit below */}
           <ellipse cx="0" cy="5" rx="20" ry="5" fill="#0F172A" opacity="0.3" />

           <path d="M-20 -5 V5 C-20 9 20 9 20 5 V-5" fill={`url(#${id}-grad-metal-body)`} />
           {/* Top Surface */}
           <ellipse cx="0" cy="-5" rx="20" ry="5" fill={`url(#${id}-grad-metal-top)`} stroke="#334155" strokeWidth="0.5"/>
           {/* Rim Highlight (Brighter on top unit) */}
           <path d="M-19 -6 Q0 -9 19 -6" stroke="white" strokeWidth="1" strokeOpacity="0.8" fill="none" />
           
           {/* Inner Hole (The "Port") */}
           <ellipse cx="0" cy="-5" rx="8" ry="2" fill="#0F172A" />
           {/* Subtle blue glow emanating from the hole */}
           <ellipse cx="0" cy="-5" rx="7" ry="1.5" fill="#06B6D4" opacity="0.3" filter={`url(#${id}-glow-data)`} />
        </g>
      </g>


      {/* --- INCOMING DATA BLOCKS (Glassy & Glowing) --- */}
      <g transform="translate(32, 10)" filter={`url(#${id}-glow-data)`}>
         
         {/* Block 1 (Closest/Largest) */}
         <g transform="rotate(-10) translate(-6, 0)">
            <rect 
              width="10" height="10" rx="2" 
              fill={`url(#${id}-grad-data)`} 
              stroke="#A5F3FC" strokeWidth="0.5"
            />
            {/* Internal reflection */}
            <path d="M1 1 H9 V5 L1 2 Z" fill="white" opacity="0.3" />
         </g>
         
         {/* Block 2 (Medium/Left) */}
         <g transform="rotate(5) translate(-16, -6)" opacity="0.8">
            <rect 
              width="6" height="6" rx="1.5" 
              fill={`url(#${id}-grad-data)`} 
              stroke="#A5F3FC" strokeWidth="0.5"
            />
         </g>

         {/* Block 3 (Small/Right) */}
         <g transform="rotate(-15) translate(10, -4)" opacity="0.6">
            <rect 
              width="5" height="5" rx="1" 
              fill={`url(#${id}-grad-data)`} 
              stroke="#A5F3FC" strokeWidth="0.5"
            />
         </g>
      </g>

    </svg>
  );
};

export default DbIllustration;