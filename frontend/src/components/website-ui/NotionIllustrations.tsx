import React from 'react';

interface IllustrationProps {
  className?: string;
}

export const HeroIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 800 600"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* --- 1. Gradients --- */}
        {/* Card 1: Schema (Blue) */}
        <linearGradient id="hero-card-blue" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#EFF6FF" />
          <stop offset="1" stopColor="#DBEAFE" />
        </linearGradient>
        
        {/* Card 2: Alerts (Purple) */}
        <linearGradient id="hero-card-purple" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FAF5FF" />
          <stop offset="1" stopColor="#E9D5FF" />
        </linearGradient>
        
        {/* Card 3: Health (Teal) */}
        <linearGradient id="hero-card-teal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F0FDF4" />
          <stop offset="1" stopColor="#BBF7D0" />
        </linearGradient>

        {/* Main Chart Line (Multi-color) */}
        <linearGradient id="hero-chart-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>

        {/* Chart Area Fill (Fade down) */}
        <linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B82F6" stopOpacity="0.1" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>

        {/* Sidebar Gradient */}
        <linearGradient id="hero-sidebar" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>

        {/* --- 2. Filters & Shadows --- */}
        {/* Deep Ambient Shadow for the Main Window */}
        <filter id="hero-soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="20" stdDeviation="25" floodColor="#0F172A" floodOpacity="0.15" />
        </filter>

        {/* Sharp Shadow for Floating Elements */}
        <filter id="hero-float-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.1" />
        </filter>

        {/* Glow for Active Elements */}
        <filter id="hero-glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* --- 3. Patterns --- */}
        <pattern id="hero-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1" opacity="0.6"/>
        </pattern>

        {/* --- 4. Clip Paths for Animation --- */}
        <clipPath id="chart-reveal-clip">
          <rect x="0" y="0" width="0" height="180">
            {/* Looping animation: Draws in 3s, holds, then resets over 5s cycle */}
            <animate attributeName="width" values="0; 382; 382" keyTimes="0; 0.6; 1" dur="5s" repeatCount="indefinite" />
          </rect>
        </clipPath>
      </defs>

      {/* =========================================================================
          MAIN WINDOW CONTAINER
      ========================================================================= */}
      <g transform="translate(50, 40)">
        
        {/* Window Frame/Shadow */}
        <rect width="700" height="520" rx="16" fill="white" filter="url(#hero-soft-shadow)" />
        <rect width="700" height="520" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />

        {/* --- Top Bar (Browser/App Header) --- */}
        <path d="M 0 48 H 700" stroke="#F1F5F9" strokeWidth="1" />
        {/* Traffic Lights */}
        <g transform="translate(24, 24)">
          <circle cx="0" cy="0" r="6" fill="#EF4444" />
          <circle cx="20" cy="0" r="6" fill="#F59E0B" />
          <circle cx="40" cy="0" r="6" fill="#10B981" />
        </g>
        {/* Search Bar Skeleton */}
        <rect x="240" y="14" width="220" height="20" rx="4" fill="#F1F5F9" />

        {/* --- Sidebar (Navigation) --- */}
        <path d="M 200 48 V 520" stroke="#F1F5F9" strokeWidth="1" />
        <rect x="0" y="49" width="200" height="470" rx="0 0 0 16" fill="url(#hero-sidebar)" opacity="0.3" />
        
        {/* Sidebar Items */}
        <g transform="translate(24, 80)">
           {/* Active Item */}
           <rect x="-12" y="-8" width="180" height="32" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1" filter="url(#hero-float-shadow)" />
           <rect y="0" width="16" height="16" rx="4" fill="#3B82F6" />
           <rect x="28" y="4" width="80" height="8" rx="2" fill="#1E293B" />
           
           {/* Inactive Items */}
           <g opacity="0.5">
             <rect y="40" width="16" height="16" rx="4" fill="#94A3B8" />
             <rect x="28" y="44" width="100" height="8" rx="2" fill="#64748B" />
             
             <rect y="80" width="16" height="16" rx="4" fill="#94A3B8" />
             <rect x="28" y="84" width="70" height="8" rx="2" fill="#64748B" />
             
             <rect y="120" width="16" height="16" rx="4" fill="#94A3B8" />
             <rect x="28" y="124" width="90" height="8" rx="2" fill="#64748B" />
           </g>

           {/* User Profile at Bottom */}
           <g transform="translate(0, 380)">
              <circle cx="16" cy="16" r="16" fill="#CBD5E1" />
              <rect x="40" y="8" width="80" height="6" rx="2" fill="#475569" />
              <rect x="40" y="20" width="50" height="6" rx="2" fill="#94A3B8" />
           </g>
        </g>

        {/* =========================================================================
            MAIN CONTENT AREA
        ========================================================================= */}
        <g transform="translate(200, 48)">
          
          {/* --- KPI Cards Row --- */}
          <g transform="translate(30, 30)">
            
            {/* Card 1: Schema Status */}
            <g transform="translate(0, 0)" filter="url(#hero-float-shadow)">
              <rect width="130" height="90" rx="12" fill="url(#hero-card-blue)" stroke="#BFDBFE" strokeWidth="1" />
              <circle cx="24" cy="24" r="12" fill="white" stroke="#DBEAFE" />
              <path d="M24 18V30M18 24H30" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
              <text x="16" y="60" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#1E293B">Schema</text>
              <text x="16" y="76" fontFamily="sans-serif" fontSize="10" fill="#64748B">Updated</text>
            </g>

            {/* Card 2: Alerts (Animated Pulse) */}
            <g transform="translate(150, 0)" filter="url(#hero-float-shadow)">
              <rect width="130" height="90" rx="12" fill="url(#hero-card-purple)" stroke="#E9D5FF" strokeWidth="1" />
              <circle cx="24" cy="24" r="12" fill="white" stroke="#F3E8FF" />
              <path d="M24 16C24 16 20 20 20 24C20 28 28 28 28 24C28 20 24 16 24 16ZM24 32V30" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Pulse Dot */}
              <circle cx="32" cy="16" r="4" fill="#EF4444" stroke="white" strokeWidth="1.5">
                 <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="16" y="60" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#1E293B">Alerts</text>
              <text x="16" y="76" fontFamily="sans-serif" fontSize="10" fill="#64748B">3 Active</text>
            </g>

            {/* Card 3: System Health */}
            <g transform="translate(300, 0)" filter="url(#hero-float-shadow)">
              <rect width="130" height="90" rx="12" fill="url(#hero-card-teal)" stroke="#BBF7D0" strokeWidth="1" />
              <circle cx="24" cy="24" r="12" fill="white" stroke="#DCFCE7" />
              <path d="M18 24L22 28L30 20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <text x="16" y="60" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#1E293B">Healthy</text>
              <text x="16" y="76" fontFamily="sans-serif" fontSize="10" fill="#64748B">99.9% Uptime</text>
            </g>
          </g>

          {/* --- Main Chart Section (Data Trends) --- */}
          <g transform="translate(30, 150)">
            {/* Chart Container */}
            <rect width="430" height="280" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" filter="url(#hero-float-shadow)" />
            
            {/* Header */}
            <text x="24" y="32" fontFamily="sans-serif" fontSize="14" fontWeight="bold" fill="#0F172A">Traffic Trends</text>
            <rect x="340" y="20" width="66" height="20" rx="4" fill="#F1F5F9" />
            <circle cx="350" cy="30" r="3" fill="#10B981" />
            <text x="360" y="34" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#64748B">Live</text>
            
            {/* Chart Grid Area */}
            <g transform="translate(24, 60)">
              <rect width="382" height="180" fill="url(#hero-grid)" />
              
              {/* Axes */}
              <path d="M0 180H382" stroke="#E2E8F0" strokeWidth="1" />
              <path d="M0 120H382" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M0 60H382" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* The Data Curve - Animated Drawing Loop */}
              <g clipPath="url(#chart-reveal-clip)">
                {/* Area Fill */}
                <path 
                  d="M0 150 C 40 150, 60 120, 100 130 C 140 140, 160 100, 200 110 C 230 117, 250 50, 280 40 C 310 30, 340 90, 382 80 V 180 H 0 Z" 
                  fill="url(#hero-chart-fill)" 
                />
              </g>
              
              {/* Line Stroke - Looping Dashoffset Animation */}
              <path 
                d="M0 150 C 40 150, 60 120, 100 130 C 140 140, 160 100, 200 110 C 230 117, 250 50, 280 40 C 310 30, 340 90, 382 80" 
                stroke="url(#hero-chart-stroke)" 
                strokeWidth="3" 
                strokeLinecap="round" 
                fill="none" 
                filter="url(#hero-glow)"
                strokeDasharray="450"
              >
                {/* Draws in 3s, holds, resets. Total 5s cycle. */}
                <animate attributeName="stroke-dashoffset" values="450; 0; 0" keyTimes="0; 0.6; 1" dur="5s" repeatCount="indefinite" />
              </path>

              {/* Anomaly Point & Tooltip - Looping Appearance */}
              <g transform="translate(280, 40)" opacity="0">
                 {/* Appears at 2.2s (0.44), stays till 4s (0.8), fades out. */}
                 <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.44; 0.54; 0.8; 1" dur="5s" repeatCount="indefinite" />
                 
                 {/* The Point */}
                 <circle r="5" fill="#FFFFFF" stroke="#EF4444" strokeWidth="2">
                   <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                 </circle>
                 
                 {/* The Tooltip Card */}
                 <g transform="translate(-40, -50)" filter="url(#hero-float-shadow)">
                   <path d="M0 4C0 1.79 1.79 0 4 0H76C78.21 0 80 1.79 80 4V28C80 30.21 78.21 32 76 32H44L40 38L36 32H4C1.79 32 0 30.21 0 28V4Z" fill="#1E293B" />
                   <text x="40" y="14" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#FFFFFF">Anomaly</text>
                   <text x="40" y="26" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#94A3B8">+24% Spike</text>
                 </g>
              </g>

              {/* Current Live Point - Looping Appearance */}
              <g opacity="0">
                {/* Appears at 3s (0.6), stays till 4s (0.8), fades out. */}
                <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; 0.6; 0.66; 0.8; 1" dur="5s" repeatCount="indefinite" />
                <circle cx="382" cy="80" r="4" fill="#3B82F6">
                  <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </g>
            </g>
          </g>

        </g>
      </g>
    </svg>
  </div>
);
