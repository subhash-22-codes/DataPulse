import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const CsvIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `csv-prod-${rawId.replace(/[:\s]/g, '')}`;

  // Paths
  const paperPath = "M12 12 C12 9.79 13.79 8 16 8 H40 L52 20 V52 C52 54.21 50.21 56 48 56 H16 C13.79 56 12 54.21 12 52 V12 Z";
  const foldPath = "M40 8 V16 C40 18.21 41.79 20 44 20 H52";

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CSV File"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* 1. Soft Ambient Shadow (Elevation) */}
        <filter id={`${id}-shadow-soft`} x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#1E293B" floodOpacity="0.1" />
        </filter>

        {/* 2. Badge Glow (Emerald) */}
        <filter id={`${id}-badge-glow`} x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#059669" floodOpacity="0.2" />
        </filter>

        {/* 3. Paper Gradient (Pure White to subtle gray) */}
        <linearGradient id={`${id}-grad-paper`} x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>

        {/* 4. Fold Gradient (Realistic paper back) */}
        <linearGradient id={`${id}-grad-fold`} x1="40" y1="8" x2="52" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* 5. Badge Gradient (Vibrant Emerald) */}
        <linearGradient id={`${id}-grad-badge`} x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stopColor="#34D399" /> {/* Emerald 400 */}
           <stop offset="100%" stopColor="#059669" /> {/* Emerald 600 */}
        </linearGradient>
      </defs>

      {/* --- MAIN PAPER BODY --- */}
      <g filter={`url(#${id}-shadow-soft)`}>
        <path
          d={paperPath}
          fill={`url(#${id}-grad-paper)`}
          stroke="#CBD5E1" // Slate-300
          strokeWidth="1"
        />

        {/* Rim Light (Top Edge Highlight) - The "Apple" touch */}
        <path 
          d="M13 12 V12 C13 9 14 9 16 9 H 39" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeOpacity="0.9" 
          fill="none" 
        />

        {/* The Fold Corner */}
        <path
          d={foldPath}
          fill={`url(#${id}-grad-fold)`}
          stroke="#CBD5E1"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>

      {/* --- INTERNAL CONTENT --- */}

      {/* 1. The Badge (Premium Pill) */}
      <g filter={`url(#${id}-badge-glow)`}>
        <rect x="18" y="15" width="14" height="7" rx="2" fill={`url(#${id}-grad-badge)`} />
        {/* Inner Highlight for Glassy effect */}
        <rect x="18.5" y="15.5" width="13" height="6" rx="1.5" stroke="white" strokeOpacity="0.3" strokeWidth="0.5" fill="none"/>
        
        {/* Text */}
        <text
          x="25" y="19.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="3.5"
          fontWeight="bold"
          fontFamily="sans-serif"
          fill="white" 
          style={{ letterSpacing: '0.5px', textShadow: '0px 1px 1px rgba(0,0,0,0.1)' }}
        >
          CSV
        </text>
      </g>

      {/* 2. Structured Data Grid (Spreadsheet Look) */}
      <g opacity="1">
         {/* Header Background (Subtle Emerald Tint) */}
         <rect x="18" y="28" width="28" height="4" rx="1" fill="#ECFDF5" /> {/* Mint-50 */}
         
         {/* Header Columns */}
         <rect x="20" y="29.5" width="6" height="1" rx="0.5" fill="#34D399" opacity="0.5" />
         <rect x="28" y="29.5" width="8" height="1" rx="0.5" fill="#34D399" opacity="0.3" />
         <rect x="38" y="29.5" width="6" height="1" rx="0.5" fill="#34D399" opacity="0.3" />

         {/* Divider Line */}
         <line x1="18" y1="33" x2="46" y2="33" stroke="#E2E8F0" strokeWidth="0.5" />

         {/* Data Rows (Skeleton) */}
         <g fill="#E2E8F0">
            {/* Row 1 */}
            <rect x="20" y="37" width="10" height="1.5" rx="0.75" />
            <rect x="34" y="37" width="8" height="1.5" rx="0.75" />
            
            {/* Row 2 */}
            <rect x="20" y="42" width="6" height="1.5" rx="0.75" />
            <rect x="30" y="42" width="14" height="1.5" rx="0.75" />

            {/* Row 3 */}
            <rect x="20" y="47" width="18" height="1.5" rx="0.75" />
            <rect x="40" y="47" width="4" height="1.5" rx="0.75" />
         </g>
      </g>

    </svg>
  );
};

export default CsvIllustration;