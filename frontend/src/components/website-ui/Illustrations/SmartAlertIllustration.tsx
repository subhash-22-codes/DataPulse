import React from 'react';
import { IllustrationProps } from '../../../types';
const SmartAlertIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 700 320"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* --- Gradients --- */}
        {/* Card Surface */}
        <linearGradient id="alert-card-surface" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>

        {/* Data Column Highlight */}
        <linearGradient id="col-highlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFF6FF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#DBEAFE" stopOpacity="1" />
          <stop offset="1" stopColor="#EFF6FF" stopOpacity="0" />
        </linearGradient>

        {/* Threshold Gradient (Green to Red) */}
        <linearGradient id="threshold-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>

        {/* Brevo / Email Gradient */}
        <linearGradient id="brevo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#006A4E" /> {/* Brevo Green-ish tone */}
          <stop offset="1" stopColor="#059669" />
        </linearGradient>

        {/* --- Filters --- */}
        <filter id="alert-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0F172A" floodOpacity="0.15" />
        </filter>

        <filter id="alert-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* --- Masks --- */}
        <mask id="bar-mask">
          <rect x="0" y="0" width="0" height="10" fill="white">
             {/* Animation: Value rising and resetting */}
             <animate attributeName="width" values="0; 120; 120; 0" keyTimes="0; 0.6; 0.8; 1" dur="4s" repeatCount="indefinite" />
          </rect>
        </mask>
      </defs>

      {/* =========================================================================
          BACKGROUND: Logic Connectors
      ========================================================================= */}
      <path d="M 180 160 H 520" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />


      {/* =========================================================================
          LEFT: Analyzed Data Table (Source)
      ========================================================================= */}
      <g transform="translate(60, 80)" filter="url(#alert-shadow)">
        {/* Table Container */}
        <rect width="140" height="160" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Header */}
        <path d="M0 30 H 140" stroke="#F1F5F9" strokeWidth="1" />
        <rect x="10" y="10" width="30" height="10" rx="2" fill="#E2E8F0" />
        <rect x="50" y="10" width="30" height="10" rx="2" fill="#DBEAFE" /> {/* Numeric Field Highlight */}
        <rect x="90" y="10" width="30" height="10" rx="2" fill="#E2E8F0" />

        {/* Column Highlight (The "Numeric" Detection) */}
        <rect x="45" y="30" width="40" height="130" fill="#EFF6FF" opacity="0.5" />
        
        {/* Rows */}
        {[0, 1, 2, 3].map((i) => (
          <g transform={`translate(0, ${45 + i * 25})`} key={i}>
             <rect x="10" y="0" width="20" height="6" rx="2" fill="#F1F5F9" />
             <rect x="55" y="0" width="20" height="6" rx="2" fill="#93C5FD" />
             <rect x="90" y="0" width="40" height="6" rx="2" fill="#F1F5F9" />
          </g>
        ))}

        {/* Scanning Line (Fetching Numeric Fields) */}
        <rect x="45" y="30" width="40" height="2" fill="#3B82F6" opacity="0.5" filter="url(#alert-glow)">
           <animate attributeName="y" values="30; 160; 30" dur="3s" repeatCount="indefinite" />
        </rect>
        
        <text x="70" y="180" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#64748B" fontFamily="sans-serif">Parsed Data</text>
      </g>


      {/* =========================================================================
          CENTER: The Logic Configurator (Smart Alert)
      ========================================================================= */}
      <g transform="translate(260, 100)" filter="url(#alert-shadow)">
         {/* Main Logic Card */}
         <rect x="0" y="0" width="180" height="120" rx="12" fill="url(#alert-card-surface)" stroke="#E2E8F0" strokeWidth="1" />
         
         {/* Header Row */}
         <rect x="15" y="15" width="20" height="20" rx="6" fill="#FEF3C7" stroke="#FDE68A" />
         <path d="M25 19 V 29" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
         <circle cx="25" cy="32" r="1.5" fill="#F59E0B" />
         
         <text x="45" y="29" fontSize="12" fontWeight="bold" fill="#1E293B" fontFamily="sans-serif">Smart Rule</text>
         
         {/* The Rule Logic Display */}
         <g transform="translate(20, 55)">
            <text x="0" y="0" fontSize="10" fontWeight="600" fill="#64748B" fontFamily="monospace">egg_count {'>'} 100</text>
            
            {/* Threshold Visualizer Background */}
            <rect x="0" y="10" width="140" height="10" rx="5" fill="#F1F5F9" />
            
            {/* Active Value Bar (Rising) */}
            <g mask="url(#bar-mask)">
               <rect x="0" y="10" width="140" height="10" rx="5" fill="url(#threshold-bar)" />
            </g>
            
            {/* The Limit Line */}
            <path d="M 100 6 V 24" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x="100" y="32" textAnchor="middle" fontSize="8" fill="#EF4444" fontWeight="bold">100</text>
         </g>

         {/* Trigger Status (Appears when bar passes line) */}
         <g transform="translate(130, 25)">
            <rect x="-10" y="-6" width="50" height="16" rx="8" fill="#FEF2F2" stroke="#FECACA" opacity="0">
               <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.5; 0.55; 0.8; 1" dur="4s" repeatCount="indefinite" />
            </rect>
            <text x="15" y="5" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#EF4444" opacity="0">
               ALERT
               <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.5; 0.55; 0.8; 1" dur="4s" repeatCount="indefinite" />
            </text>
         </g>
      </g>


      {/* =========================================================================
          RIGHT: Brevo / Notification (Destination)
      ========================================================================= */}
      <g transform="translate(500, 110)" filter="url(#alert-shadow)">
         {/* Notification Bubble */}
         <path d="M 0 20 H 100 C 110 20, 120 30, 120 40 V 80 C 120 90, 110 100, 100 100 H 20 C 10 100, 0 90, 0 80 Z" fill="white" stroke="#E2E8F0" strokeWidth="1" />
         
         {/* Brevo-style Icon */}
         <rect x="15" y="35" width="30" height="30" rx="8" fill="url(#brevo-grad)" />
         <path d="M20 45 L 30 53 L 40 45" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
         
         {/* Message Lines */}
         <rect x="55" y="40" width="50" height="6" rx="2" fill="#1E293B" />
         <rect x="55" y="52" width="40" height="4" rx="2" fill="#94A3B8" />
         <rect x="55" y="60" width="30" height="4" rx="2" fill="#94A3B8" />

         {/* Incoming Alert Badge (Pops in) */}
         <circle cx="42" cy="35" r="8" fill="#EF4444" stroke="white" strokeWidth="2" opacity="0">
            <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.6; 0.65; 0.9; 1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="r" values="8; 10; 8" keyTimes="0; 0.5; 1" dur="0.5s" begin="2.4s" repeatCount="1" />
         </circle>
         <text x="42" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white" opacity="0">
            1
            <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.6; 0.65; 0.9; 1" dur="4s" repeatCount="indefinite" />
         </text>
         
         <text x="60" y="120" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#006A4E" fontFamily="sans-serif">Gmail</text>
      </g>


      {/* =========================================================================
          ANIMATIONS: The Trigger Event
      ========================================================================= */}
      
      {/* 1. Data Analysis Particle (Left to Center) */}
      <circle r="4" fill="#3B82F6">
         <animateMotion path="M 180 160 H 260" dur="4s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
      </circle>

      {/* 2. Alert Trigger Particle (Center to Right) */}
      {/* Fires ONLY when the bar hits the threshold (approx 60% of animation) */}
      <circle r="5" fill="#EF4444" filter="url(#alert-glow)">
         <animateMotion path="M 440 160 H 500" dur="4s" begin="0.1s" repeatCount="indefinite" />
         {/* Logic: Hidden until threshold hit (0.6), then flies, then hides */}
         <animate attributeName="opacity" values="0; 0; 1; 0" keyTimes="0; 0.6; 0.7; 1" dur="4s" repeatCount="indefinite" />
      </circle>

    </svg>
  </div>
);

export default SmartAlertIllustration;