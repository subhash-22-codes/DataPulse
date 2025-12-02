import React from 'react';
import { IllustrationProps } from '../../../types';


const ApiPollIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 600 340"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* --- Gradients --- */}
        <linearGradient id="card-surface" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>

        <linearGradient id="server-metal" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#1E293B" />
        </linearGradient>

        <linearGradient id="server-light" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#334155" />
          <stop offset="0.5" stopColor="#475569" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>

        <linearGradient id="tunnel-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E2E8F0" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#CBD5E1" stopOpacity="0.4" />
          <stop offset="1" stopColor="#E2E8F0" stopOpacity="0.1" />
        </linearGradient>

        {/* --- Filters --- */}
        <filter id="crisp-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>

        <filter id="glow-led" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* --- Masks --- */}
        <mask id="field-mask">
          <rect x="0" y="0" width="180" height="24" rx="4" fill="white" />
        </mask>
      </defs>

      {/* =========================================================================
          BACKGROUND: Clean Grid
      ========================================================================= */}
      <path d="M 40 40 V 300 M 560 40 V 300" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
      <path d="M 40 170 H 560" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />


      {/* =========================================================================
          LEFT: The DataPulse Config Panel
      ========================================================================= */}
      <g transform="translate(50, 80)" filter="url(#crisp-shadow)">
        {/* Card Body */}
        <rect width="210" height="180" rx="12" fill="url(#card-surface)" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Header */}
        <rect x="16" y="16" width="24" height="24" rx="6" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
        <path d="M28 20V28M24 24H32" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        <text x="50" y="32" fontFamily="sans-serif" fontSize="12" fontWeight="700" fill="#1E293B">Polling Config</text>
        
        {/* Status Badge */}
        <rect x="145" y="18" width="50" height="20" rx="10" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
        <circle cx="155" cy="28" r="3" fill="#22C55E">
           <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="163" y="32" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#15803D">Active</text>

        {/* --- Form Fields --- */}
        <g transform="translate(16, 60)">
           {/* Endpoint */}
           <text x="0" y="0" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#64748B">TARGET URL</text>
           <rect x="0" y="6" width="178" height="24" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
           <text x="8" y="22" fontFamily="monospace" fontSize="10" fill="#334155">https://api.srv.com</text>
           
           {/* Auth Header */}
           <text x="0" y="45" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#64748B">HEADER KEY</text>
           <rect x="0" y="51" width="178" height="24" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
           <text x="8" y="67" fontFamily="monospace" fontSize="10" fill="#334155">X-API-Key</text>

           {/* API Key (Secure) */}
           <text x="0" y="90" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#64748B">SECRET TOKEN</text>
           <g transform="translate(0, 96)">
             <rect width="178" height="24" rx="4" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
             <text x="8" y="16" fontFamily="sans-serif" fontSize="14" fill="#166534" letterSpacing="2">••••••••••••</text>
             {/* Padlock Icon */}
             <path d="M160 6V9H159V15H169V9H168V6C168 3.79 166.21 2 164 2C161.79 2 160 3.79 160 6ZM162 6C162 4.9 162.9 4 164 4C165.1 4 166 4.9 166 6V9H162V6Z" fill="#15803D" />
           </g>
        </g>
      </g>


      {/* =========================================================================
          RIGHT: The Real Server Rack
      ========================================================================= */}
      <g transform="translate(440, 70)" filter="url(#crisp-shadow)">
        {/* Rack Frame */}
        <rect x="0" y="0" width="110" height="200" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="2" />
        
        {/* Rack Ears/Mounts */}
        <rect x="-4" y="10" width="4" height="180" fill="#334155" />
        <rect x="110" y="10" width="4" height="180" fill="#334155" />

        {/* Server Units (Blades) */}
        <g transform="translate(6, 10)">
           {[0, 1, 2, 3, 4].map((i) => (
              <g key={i} transform={`translate(0, ${i * 38})`}>
                 {/* Unit Body */}
                 <rect width="98" height="34" rx="2" fill="url(#server-metal)" stroke="#475569" strokeWidth="1" />
                 <rect x="2" y="2" width="94" height="30" rx="1" fill="url(#server-light)" opacity="0.1" />
                 
                 {/* Vents */}
                 <path d="M70 10V24M76 10V24M82 10V24M88 10V24" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
                 
                 {/* Blinking Activity LEDs */}
                 <circle cx="10" cy="17" r="2" fill="#10B981" filter="url(#glow-led)">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur={`${0.5 + Math.random()}s`} repeatCount="indefinite" />
                 </circle>
                 <circle cx="18" cy="17" r="2" fill="#3B82F6" opacity="0.8" filter="url(#glow-led)">
                    <animate attributeName="opacity" values="1;0.3;1" dur={`${0.8 + Math.random()}s`} repeatCount="indefinite" />
                 </circle>
                 
                 {/* Hard Drive Bays */}
                 <rect x="28" y="8" width="4" height="18" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />
                 <rect x="36" y="8" width="4" height="18" fill="#1E293B" stroke="#475569" strokeWidth="0.5" />
              </g>
           ))}
        </g>
        
        {/* Label */}
        <text x="55" y="215" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#475569">TARGET API HOST</text>
      </g>


      {/* =========================================================================
          MIDDLE: The Encrypted Pipeline Tunnel
      ========================================================================= */}
      <g transform="translate(260, 170)">
         {/* Tunnel Walls */}
         <path d="M 0 -16 H 180" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 2" />
         <path d="M 0 16 H 180" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 2" />
         
         {/* Tunnel Interior (Subtle Glow) */}
         <rect x="0" y="-14" width="180" height="28" fill="url(#tunnel-grad)" />

         {/* Central Lock Badge (Fixed on Pipeline) */}
         <g transform="translate(90, 0)">
            <circle r="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <path d="M-4 -2 V-5 C-4 -7.2 -2.2 -9 0 -9 C 2.2 -9 4 -7.2 4 -5 V -2" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <rect x="-5" y="-2" width="10" height="8" rx="2" fill="#10B981" />
            <path d="M0 1 V 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
         </g>

         {/* --- Traffic Flow --- */}
         
         {/* Request Packet (Going Right) - Carrying Key */}
         <g>
            <rect width="14" height="8" rx="2" fill="#3B82F6" filter="url(#glow-led)">
               <animateMotion path="M 0 -6 H 180" dur="2s" repeatCount="indefinite" />
            </rect>
            {/* Tiny Key Icon on packet */}
            <circle r="1.5" fill="white">
               <animateMotion path="M 7 -6 H 187" dur="2s" repeatCount="indefinite" />
            </circle>
         </g>

         {/* Response Packet (Going Left) - Carrying Data */}
         <g>
            <rect width="14" height="8" rx="2" fill="#10B981" filter="url(#glow-led)">
               <animateMotion path="M 180 6 H 0" dur="2s" begin="1s" repeatCount="indefinite" />
            </rect>
            {/* Tiny Data Lines on packet */}
            <path d="M -2 0 H 2" stroke="white" strokeWidth="1">
               <animateMotion path="M 187 6 H 7" dur="2s" begin="1s" repeatCount="indefinite" />
            </path>
         </g>
      </g>

    </svg>
  </div>
);

export default ApiPollIllustration;