import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const NatrajPaperIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `natraj-pencil-${rawId.replace(/[:\s]/g, '')}`;

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Notebook and Pencil Illustration"
    >
      <defs>
        {/* --- 1. Realistic Body Gradient (Iconic Red/Black stripes theme) --- */}
        <linearGradient id={`${id}-pencilBody`} x1="0" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991B1B" />   {/* Dark Red Edge */}
          <stop offset="30%" stopColor="#DC2626" />  {/* Main Red */}
          <stop offset="50%" stopColor="#EF4444" />  {/* Highlight */}
          <stop offset="70%" stopColor="#DC2626" />  {/* Main Red */}
          <stop offset="100%" stopColor="#7F1D1D" /> {/* Dark Red Edge */}
        </linearGradient>

        {/* --- 2. Metal Ferrule Gradient (Silver) --- */}
        <linearGradient id={`${id}-silverMetal`} x1="0" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="20%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#F1F5F9" /> {/* Shine */}
          <stop offset="80%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* --- 3. Wood Gradient (Realistic Cedar) --- */}
        <linearGradient id={`${id}-woodGrain`} x1="0" y1="85" x2="16" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="50%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* --- 4. Paper Gradient (Subtle depth) --- */}
        <linearGradient id={`${id}-paperSurface`} x1="0" y1="0" x2="100" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>

        {/* --- 5. Drop Shadow Filter (Floating Effect) --- */}
        <filter id={`${id}-realShadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="3" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.15" /> 
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ================= PAPER (Notebook Style) ================= */}
      <g transform="rotate(-6 100 100)" filter={`url(#${id}-realShadow)`}>
        
        {/* 1. The Sheet Base */}
        <rect 
          x="60" y="40" width="100" height="130" rx="2" 
          fill={`url(#${id}-paperSurface)`} 
          stroke="#E2E8F0" 
          strokeWidth="0.5" 
        />
        
        {/* 2. The Corner Fold (Dog-ear effect at top right) */}
        <path d="M140 40 L160 60 L140 60 Z" fill="#F1F5F9" />
        <path d="M140 40 L160 60" stroke="#CBD5E1" strokeWidth="0.5" />
        <path d="M140 40 V 60 H 160" stroke="#CBD5E1" strokeWidth="0.5" fill="none"/>

        {/* 3. Notebook Guidelines (Soft Blue Rows) */}
        <g stroke="#DBEAFE" strokeWidth="1">
           <line x1="60" y1="65" x2="160" y2="65" />
           <line x1="60" y1="85" x2="160" y2="85" />
           <line x1="60" y1="105" x2="160" y2="105" />
           <line x1="60" y1="125" x2="160" y2="125" />
           <line x1="60" y1="145" x2="160" y2="145" />
        </g>

        {/* 4. The Margin Line (Classic Red/Pink) */}
        <line x1="85" y1="40" x2="85" y2="170" stroke="#FECDD3" strokeWidth="1" />

        {/* 5. Content Blocks (Skeleton Text) */}
        <rect x="90" y="61" width="50" height="4" rx="2" fill="#94A3B8" />
        <rect x="90" y="81" width="60" height="4" rx="2" fill="#CBD5E1" />
        <rect x="90" y="101" width="40" height="4" rx="2" fill="#CBD5E1" />
        {/* Active line being written */}
        <rect x="90" y="121" width="20" height="4" rx="2" fill="#94A3B8" />
      </g>

      {/* ================= THE PENCIL (Realistic Natraj Style) ================= */}
      <g transform="translate(108, 115) rotate(45)" filter={`url(#${id}-realShadow)`}>
        
        {/* 1. ERASER (Pink) */}
        <path d="M0 -14 L16 -14 L16 -6 L0 -6 Z" fill="#FB7185" />

        {/* 2. METAL FERRULE (Silver Gradient) */}
        <rect x="0" y="-6" width="16" height="8" fill={`url(#${id}-silverMetal)`} />
        <line x1="0" y1="-4" x2="16" y2="-4" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
        <line x1="0" y1="-2" x2="16" y2="-2" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

        {/* 3. PENCIL BODY (Red Gradient) */}
        <rect x="0" y="2" width="16" height="88" fill={`url(#${id}-pencilBody)`} />

        {/* 4. BLACK STRIPES (Overlay on Red - The Signature Look) */}
        <rect x="2" y="2" width="1.5" height="88" fill="rgba(17,24,39,0.9)" />
        <rect x="7.5" y="2" width="1" height="88" fill="rgba(17,24,39,0.9)" />
        <rect x="12.5" y="2" width="1.5" height="88" fill="rgba(17,24,39,0.9)" />

        {/* 5. WOODEN TIP (Conical Cut) */}
        <path d="M0 90 Q8 86 16 90 L8 110 Z" fill={`url(#${id}-woodGrain)`} />

        {/* 6. GRAPHITE LEAD (Dark Gray) */}
        <path d="M6 105 L10 105 L8 110 Z" fill="#1F2937" />
        
        {/* 7. TIP HIGHLIGHT (Glossy graphite shine) */}
        <circle cx="8" cy="108" r="0.8" fill="rgba(255,255,255,0.4)" />
      </g>
    </svg>
  );
};

export default NatrajPaperIllustration;