import React from 'react';
import { IllustrationProps } from '../../../types';


const CsvUploadIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 600 300"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* --- Gradients --- */}
        <linearGradient id="csv-paper" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>

        <linearGradient id="chart-fill-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10B981" stopOpacity="0.2" />
          <stop offset="1" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="flow-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#10B981" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="1" stopColor="#10B981" stopOpacity="0.1" />
        </linearGradient>

        {/* --- Filters --- */}
        <filter id="drop-shadow-lg" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>

        <filter id="glow-highlight" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* --- Masks --- */}
        <mask id="chart-mask">
          <rect x="0" y="0" width="0" height="150" fill="white">
            <animate attributeName="width" values="0; 200; 200" keyTimes="0; 0.6; 1" dur="4s" repeatCount="indefinite" />
          </rect>
        </mask>
      </defs>

      {/* =========================================================================
          BACKGROUND: Workflow Connector
      ========================================================================= */}
      <path d="M 160 150 H 380" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="6 6" />


      {/* =========================================================================
          LEFT: The Upload Zone
      ========================================================================= */}
      <g transform="translate(60, 70)">
        {/* Dashed Drop Area */}
        <rect x="0" y="0" width="140" height="160" rx="12" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" strokeDasharray="8 8" />
        
        {/* Animated Floating CSV File */}
        <g transform="translate(40, 40)">
          <animateTransform attributeName="transform" type="translate" values="40 40; 40 30; 40 40" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
          
          {/* File Body */}
          <path d="M0 0 H 40 L 60 20 V 80 H 0 Z" fill="url(#csv-paper)" stroke="#CBD5E1" strokeWidth="1" filter="url(#drop-shadow-lg)" />
          <path d="M40 0 V 20 H 60" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
          
          {/* CSV Label */}
          <rect x="10" y="35" width="40" height="24" rx="4" fill="#10B981" />
          <text x="30" y="52" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="white">CSV</text>
          
          {/* Decorative Lines */}
          <rect x="12" y="65" width="36" height="2" rx="1" fill="#E2E8F0" />
          <rect x="12" y="70" width="24" height="2" rx="1" fill="#E2E8F0" />
        </g>

        {/* Upload Progress Indicator (Bottom) */}
        <g transform="translate(20, 130)">
           <text x="0" y="-8" fontSize="10" fontWeight="600" fill="#64748B">Processing...</text>
           <rect x="0" y="0" width="100" height="4" rx="2" fill="#E2E8F0" />
           <rect x="0" y="0" width="100" height="4" rx="2" fill="#10B981">
             <animate attributeName="width" values="0; 100; 100" keyTimes="0; 0.6; 1" dur="4s" repeatCount="indefinite" />
           </rect>
        </g>
      </g>


      {/* =========================================================================
          CENTER: Data Processing Stream
      ========================================================================= */}
      <g transform="translate(200, 150)">
         {/* Particles flowing from CSV to Chart */}
         <circle r="4" fill="#10B981" filter="url(#glow-highlight)">
            <animateMotion path="M 0 0 H 180" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
         </circle>
         <circle r="3" fill="#34D399">
            <animateMotion path="M 0 0 H 180" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
         </circle>
      </g>


      {/* =========================================================================
          RIGHT: Comparison & Trend Analysis
      ========================================================================= */}
      <g transform="translate(380, 60)" filter="url(#drop-shadow-lg)">
        {/* Card Frame */}
        <rect width="200" height="180" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Header */}
        <text x="20" y="30" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#1E293B">Monthly Trends</text>
        <rect x="140" y="18" width="40" height="16" rx="4" fill="#F0FDF4" stroke="#BBF7D0" />
        <text x="160" y="29" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#15803D">+12%</text>

        {/* --- The Chart Area --- */}
        <g transform="translate(0, 50)">
           {/* Grid Lines */}
           <path d="M 20 20 H 180" stroke="#F1F5F9" />
           <path d="M 20 60 H 180" stroke="#F1F5F9" />
           <path d="M 20 100 H 180" stroke="#F1F5F9" />

           {/* 1. Historical Data (The "Past") - Ghost Line */}
           <path 
             d="M 20 80 C 50 70, 80 90, 110 60 S 150 50, 180 55" 
             stroke="#94A3B8" 
             strokeWidth="2" 
             strokeDasharray="4 4" 
             strokeOpacity="0.5" 
             fill="none" 
           />
           <text x="175" y="45" textAnchor="end" fontSize="8" fill="#94A3B8">Prev</text>

           {/* 2. New Data (The "Present") - Animated Drawing Line */}
           <g mask="url(#chart-mask)">
             {/* Area Fill */}
             <path 
               d="M 20 90 C 50 80, 80 50, 110 30 S 150 40, 180 20 V 120 H 20 Z" 
               fill="url(#chart-fill-grad)" 
             />
             {/* Solid Line */}
             <path 
               d="M 20 90 C 50 80, 80 50, 110 30 S 150 40, 180 20" 
               stroke="#10B981" 
               strokeWidth="3" 
               strokeLinecap="round" 
               fill="none" 
               filter="url(#glow-highlight)"
             />
             {/* Data Points */}
             <circle cx="110" cy="30" r="3" fill="white" stroke="#10B981" strokeWidth="2" />
             <circle cx="180" cy="20" r="4" fill="#10B981" stroke="white" strokeWidth="2" />
           </g>
           
           {/* Comparison Tooltip (Pops up at end of animation) */}
           <g transform="translate(140, 10)">
              <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0; 0.6; 0.7; 0.9; 1" dur="4s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="140 10; 140 0; 140 0" keyTimes="0; 0.6; 1" dur="4s" repeatCount="indefinite" />
              
              <path d="M0 4 C 0 1.8 1.8 0 4 0 H 46 C 48.2 0 50 1.8 50 4 V 16 C 50 18.2 48.2 20 46 20 H 30 L 25 25 L 20 20 H 4 C 1.8 20 0 18.2 0 16 Z" fill="#1E293B" />
              <text x="25" y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">New High</text>
           </g>
        </g>
      </g>

    </svg>
  </div>
);

export default CsvUploadIllustration;