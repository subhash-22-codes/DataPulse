import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const LatestCsvIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `latest-csv-prod-${rawId.replace(/[:\s]/g, '')}`;

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
      aria-label="Latest Uploaded CSV Stack"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* 1. Deep Ambient Shadow (The "Lift") */}
        <filter id={`${id}-shadow-ambient`} x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#1E293B" floodOpacity="0.12" />
        </filter>

        {/* 2. Crisp Contact Shadow (The "Edge") */}
        <filter id={`${id}-shadow-contact`} x="-20%" y="-20%" width="140%" height="140%">
           <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>

        {/* 3. Badge Glow (Premium Gold) */}
        <filter id={`${id}-badge-glow`} x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#D97706" floodOpacity="0.3" />
        </filter>

        {/* 4. Fold Shadow (Under the bent corner) */}
        <filter id={`${id}-fold-shadow`} x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
           <feOffset dx="-1" dy="1" result="offsetblur"/>
           <feComponentTransfer>
             <feFuncA type="linear" slope="0.2"/>
           </feComponentTransfer>
           <feMerge> 
             <feMergeNode/>
             <feMergeNode in="SourceGraphic"/> 
           </feMerge>
        </filter>

        {/* --- GRADIENTS --- */}
        
        {/* Top Paper: Pure White to subtle cool gray */}
        <linearGradient id={`${id}-grad-paper-top`} x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>

        {/* Back Papers: Slightly darker, receding */}
        <linearGradient id={`${id}-grad-paper-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Fold Gradient: Metallic/Paper back look */}
        <linearGradient id={`${id}-grad-fold`} x1="40" y1="8" x2="52" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Badge Gradient: Luxury Amber */}
        <linearGradient id={`${id}-grad-gold`} x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stopColor="#FCD34D" /> {/* Amber 300 */}
           <stop offset="50%" stopColor="#F59E0B" /> {/* Amber 500 */}
           <stop offset="100%" stopColor="#B45309" /> {/* Amber 700 */}
        </linearGradient>
      </defs>

      {/* --- LAYER 1: BOTTOM (Furthest Back) --- */}
      <g transform="translate(-8, 4)">
        <path 
            d={paperPath} 
            fill="#F1F5F9" 
            stroke="#CBD5E1" 
            strokeWidth="0.5" 
        />
      </g>

      {/* --- LAYER 2: MIDDLE --- */}
      <g transform="translate(-4, 2)" filter={`url(#${id}-shadow-contact)`}>
        <path 
            d={paperPath} 
            fill={`url(#${id}-grad-paper-back)`} 
            stroke="#CBD5E1" 
            strokeWidth="0.5" 
        />
        {/* Subtle Fold Line */}
        <path d="M40 8 L 52 20" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.5" />
      </g>

      {/* --- LAYER 3: TOP (The Hero) --- */}
      <g filter={`url(#${id}-shadow-ambient)`}>
        
        {/* Main Body */}
        <path
          d={paperPath}
          fill={`url(#${id}-grad-paper-top)`}
          stroke="#CBD5E1" // Very subtle border
          strokeWidth="1"
        />

        {/* Rim Light (Top Edge Highlight) - This adds the "Premium" feel */}
        <path 
          d="M13 12 V12 C13 9 14 9 16 9 H 39" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeOpacity="0.8" 
          fill="none" 
        />

        {/* The Fold Corner with Shadow */}
        <g>
            {/* Shadow under the fold */}
            <path d="M40 8 L 40 20 L 52 20" fill="black" opacity="0.1" filter="url(#id-blur)" />
            
            {/* The Fold Itself */}
            <path
              d={foldPath}
              fill={`url(#${id}-grad-fold)`}
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeLinejoin="round"
            />
        </g>

        {/* --- CONTENT SKELETON (Structured Table) --- */}
        <g opacity="0.9">
           {/* Header Row - Subtle Blue Tint */}
           <rect x="18" y="28" width="8" height="3" rx="1.5" fill="#E0F2FE" /> {/* Light Sky */}
           <rect x="28" y="28" width="12" height="3" rx="1.5" fill="#F1F5F9" />
           <rect x="42" y="28" width="6" height="3" rx="1.5" fill="#F1F5F9" />

           {/* Divider Line */}
           <path d="M18 34 H 48" stroke="#E2E8F0" strokeWidth="0.5" />

           {/* Row 1 */}
           <rect x="18" y="37" width="16" height="2" rx="1" fill="#E2E8F0" />
           <rect x="36" y="37" width="8" height="2" rx="1" fill="#E2E8F0" />
           
           {/* Row 2 */}
           <rect x="18" y="42" width="10" height="2" rx="1" fill="#E2E8F0" />
           <rect x="30" y="42" width="14" height="2" rx="1" fill="#E2E8F0" />

           {/* Row 3 */}
           <rect x="18" y="47" width="24" height="2" rx="1" fill="#E2E8F0" />
        </g>

        {/* --- THE BADGE (Premium Glossy) --- */}
        <g transform="translate(50, 10)" filter={`url(#${id}-badge-glow)`}>
           {/* Main Circle */}
           <circle cx="0" cy="0" r="6.5" fill={`url(#${id}-grad-gold)`} />
           
           {/* Inner Ring (Highlight/Bevel) */}
           <circle cx="0" cy="0" r="5.5" stroke="white" strokeWidth="0.5" opacity="0.4" fill="none" />
           
           {/* Outer Ring (Crisp border) */}
           <circle cx="0" cy="0" r="6.5" stroke="#FFFFFF" strokeWidth="1.5" />

           {/* Star Icon */}
           <path
             d="M0 -3.5 L 1.1 -1.1 L 3.5 0 L 1.1 1.1 L 0 3.5 L -1.1 1.1 L -3.5 0 L -1.1 -1.1 Z"
             fill="white"
             style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}
           />
        </g>
      </g>

    </svg>
  );
};

export default LatestCsvIllustration;