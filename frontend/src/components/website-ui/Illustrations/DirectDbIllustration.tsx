import React from 'react';
import { IllustrationProps } from '../../../types';

const DirectDbIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 600 320"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="pg-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#336791" />
          <stop offset="50%" stopColor="#5B93C2" /> {/* Slightly lighter center for 3D effect */}
          <stop offset="100%" stopColor="#336791" />
        </linearGradient>
        <linearGradient id="pg-top" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#7FAAD4" />
          <stop offset="1" stopColor="#336791" />
        </linearGradient>

        <linearGradient id="secure-tunnel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.2" /> {/* Subtler tunnel */}
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="dash-surface" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>

        {/* Filters for "Prod Level" Depth */}
        <filter id="crisp-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.1" />
        </filter>

        <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Mask for scanning effect on dashboard */}
        <clipPath id="screen-clip">
           <rect x="0" y="0" width="140" height="150" rx="12" />
        </clipPath>
      </defs>

      {/* --- Background --- */}
      {/* Subtle connection line underneath */}
      <path d="M 50 160 H 550" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="6 6" />


      {/* --- LEFT: High-Fidelity PostgreSQL Database --- */}
      <g transform="translate(80, 100)" filter="url(#crisp-shadow)">
        {/* Shadow Base */}
        <ellipse cx="60" cy="120" rx="50" ry="10" fill="#000" opacity="0.2" filter="url(#glow-blue)" />

        {/* Main Cylinder */}
        <path d="M0 30 V 100 C 0 116.57 26.86 130 60 130 C 93.14 130 120 116.57 120 100 V 30" fill="url(#pg-metal)" />
        {/* Inner shadow for depth */}
        <path d="M0 30 C 0 46.57 26.86 60 60 60 C 93.14 60 120 46.57 120 30" fill="#1E3A8A" opacity="0.2" />
        
        {/* Top Surface */}
        <ellipse cx="60" cy="30" rx="60" ry="15" fill="url(#pg-top)" stroke="#7FAAD4" strokeWidth="1" />
        
        {/* Detail: Server Rack Dividers */}
        <path d="M0 65 C 0 81.57 26.86 95 60 95 C 93.14 95 120 81.57 120 65" stroke="#7FAAD4" strokeWidth="1" opacity="0.3" fill="none" />
        <path d="M0 100 C 0 116.57 26.86 130 60 130 C 93.14 130 120 116.57 120 100" stroke="#7FAAD4" strokeWidth="1" opacity="0.3" fill="none" />

        {/* PostgreSQL "Slon" Elephant Abstract Icon */}
        <g transform="translate(48, 55)" opacity="0.9">
           <path d="M5 5 C 5 5 15 0 20 10 C 20 25 10 25 10 25" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
           <path d="M12 15 L 20 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Status Light (Pulsing) */}
        <circle cx="105" cy="110" r="4" fill="#22C55E" filter="url(#glow-blue)">
           <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        
        <text x="60" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#336791" letterSpacing="0.5">PostgreSQL</text>
      </g>


      {/* --- CENTER: Secure Tunnel Pipeline --- */}
      <g transform="translate(200, 160)">
         {/* Glass/Pipe Tube */}
         <rect x="0" y="-14" width="200" height="28" rx="14" fill="white" stroke="#E2E8F0" strokeWidth="1" />
         
         {/* Inner active stream area */}
         <rect x="10" y="-6" width="180" height="12" rx="6" fill="url(#secure-tunnel)" />
         
         {/* Data Packets (Flowing) */}
         <circle r="3" fill="#3B82F6" filter="url(#glow-blue)">
            <animateMotion path="M 15 0 H 185" dur="1.5s" repeatCount="indefinite" />
         </circle>
         <circle r="2" fill="#60A5FA" opacity="0.7">
            <animateMotion path="M 15 0 H 185" dur="1.5s" begin="0.75s" repeatCount="indefinite" />
         </circle>

         {/* Central "Encrypted" Lock Badge */}
         <g transform="translate(100, 0)">
            <circle r="16" fill="white" stroke="#E2E8F0" strokeWidth="1" filter="url(#crisp-shadow)" />
            <path d="M-5 -2 V-6 C-5 -8.8 -2.8 -11 0 -11 C 2.8 -11 5 -8.8 5 -6 V -2" stroke="#10B981" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="-6" y="-2" width="12" height="10" rx="2" fill="#10B981" />
            <circle cx="0" cy="3" r="1.5" fill="white" />
         </g>
      </g>


      {/* --- RIGHT: DataPulse Schema Monitor (Clean, No Widget) --- */}
      <g transform="translate(420, 85)" filter="url(#crisp-shadow)">
        
        {/* Main Dashboard Window */}
        <rect width="150" height="160" rx="12" fill="url(#dash-surface)" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Window Header */}
        <rect x="0" y="0" width="150" height="32" rx="12" fill="#F8FAFC" />
        <rect x="0" y="20" width="150" height="15" fill="#F8FAFC" /> {/* Square off bottom corners of header */}
        <path d="M0 32 H 150" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Window Controls (Mac style) */}
        <circle cx="15" cy="16" r="3" fill="#EF4444" opacity="0.6" />
        <circle cx="25" cy="16" r="3" fill="#F59E0B" opacity="0.6" />
        <circle cx="35" cy="16" r="3" fill="#10B981" opacity="0.6" />
        
        <text x="75" y="20" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#475569">Live Monitor</text>

        {/* --- Content: Schema Tables --- */}
        <g transform="translate(15, 45)">
           
           {/* Auto-Sync Status Indicator (Implicit "Monitor Everyday") */}
           <g transform="translate(85, -5)">
              <rect x="0" y="0" width="40" height="14" rx="7" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
              <text x="20" y="10" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#166534">SYNC ON</text>
           </g>
           
           {/* Row 1 (Active) */}
           <g transform="translate(0, 16)">
             <rect width="120" height="18" rx="4" fill="#F8FAFC" stroke="#F1F5F9" strokeWidth="1" />
             <rect x="10" y="6" width="60" height="6" rx="2" fill="#CBD5E1" />
             {/* Checkmark */}
             <circle cx="105" cy="9" r="6" fill="#DCFCE7" />
             <path d="M101 9 L 104 12 L 109 7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
           </g>

           {/* Row 2 */}
           <g transform="translate(0, 40)">
             <rect width="120" height="18" rx="4" fill="#F8FAFC" stroke="#F1F5F9" strokeWidth="1" />
             <rect x="10" y="6" width="40" height="6" rx="2" fill="#CBD5E1" />
             <circle cx="105" cy="9" r="6" fill="#DCFCE7" />
             <path d="M101 9 L 104 12 L 109 7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
           </g>

           {/* Row 3 (Scanning...) */}
           <g transform="translate(0, 64)">
             <rect width="120" height="18" rx="4" fill="#F8FAFC" stroke="#F1F5F9" strokeWidth="1" />
             <rect x="10" y="6" width="70" height="6" rx="2" fill="#E2E8F0" />
             {/* Spinner */}
             <circle cx="105" cy="9" r="5" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="8 8" fill="none">
                <animateTransform attributeName="transform" type="rotate" from="0 105 9" to="360 105 9" dur="2s" repeatCount="indefinite" />
             </circle>
           </g>
           
           {/* Scanning Laser Effect over the list */}
           <g clipPath="url(#screen-clip)">
              <rect x="-10" y="-10" width="140" height="2" fill="#3B82F6" opacity="0.3" filter="url(#glow-blue)">
                 <animate attributeName="y" values="0; 100; 0" dur="4s" repeatCount="indefinite" />
              </rect>
           </g>
        </g>
      </g>

    </svg>
  </div>
);

export default DirectDbIllustration;