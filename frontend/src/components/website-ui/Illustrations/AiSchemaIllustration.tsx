import React from 'react';
import { IllustrationProps } from '../../../types';


const AiSchemaIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 240"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* AI/Gemini Gradient (Deep Purple to Pink) */}
        <linearGradient id="ai-deep-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#A855F7" /> {/* Purple-500 */}
          <stop offset="1" stopColor="#EC4899" /> {/* Pink-500 */}
        </linearGradient>

        {/* The Scanning Beam (Transparent to Color) */}
        <linearGradient id="scan-beam-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A855F7" stopOpacity="0" />
          <stop offset="0.5" stopColor="#A855F7" stopOpacity="0.3" />
          <stop offset="1" stopColor="#EC4899" stopOpacity="0.6" />
        </linearGradient>

        {/* Data Table Surface */}
        <linearGradient id="table-surface" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F8FAFC" />
        </linearGradient>

        {/* Soft Glow for AI Elements */}
        <filter id="ai-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dy="0" />
          <feComposite in2="SourceAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0.65 0 0 0 0 0.33 0 0 0 0 0.96 0 0 0 0.4 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>

        {/* Clip Path for the Scanner to stay inside the table */}
        <clipPath id="table-clip">
          <rect x="60" y="60" width="280" height="140" rx="8" />
        </clipPath>
      </defs>

      {/* --- Background Decorative Elements --- */}
      <g opacity="0.4">
        <circle cx="50" cy="40" r="2" fill="#CBD5E1" />
        <circle cx="350" cy="200" r="2" fill="#CBD5E1" />
        <path d="M40 200 L 60 220 M 60 200 L 40 220" stroke="#E2E8F0" strokeWidth="1" />
      </g>

      {/* --- 1. The Schema / Data Frame (Pandas Representation) --- */}
      <g transform="translate(60, 60)">
        {/* Main Table Container */}
        <rect width="280" height="140" rx="8" fill="url(#table-surface)" stroke="#E2E8F0" strokeWidth="1" />
        
        {/* Header Row */}
        <path d="M0 36 H 280" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="1" y="1" width="278" height="35" rx="7" fill="#F8FAFC" />
        <path d="M0 36 H 280" stroke="#E2E8F0" strokeWidth="1" />

        {/* Column Dividers */}
        <path d="M80 0 V 140" stroke="#F1F5F9" strokeWidth="1" />
        <path d="M180 0 V 140" stroke="#F1F5F9" strokeWidth="1" />

        {/* Header Text Skeletons */}
        <rect x="20" y="14" width="40" height="8" rx="2" fill="#94A3B8" />
        <rect x="100" y="14" width="60" height="8" rx="2" fill="#94A3B8" />
        <rect x="200" y="14" width="50" height="8" rx="2" fill="#94A3B8" />

        {/* Data Rows (Skeleton) */}
        <g fill="#E2E8F0">
          {/* Row 1 */}
          <rect x="20" y="55" width="30" height="6" rx="2" />
          <rect x="100" y="55" width="50" height="6" rx="2" />
          <rect x="200" y="55" width="40" height="6" rx="2" />
          
          {/* Row 2 */}
          <rect x="20" y="85" width="40" height="6" rx="2" />
          <rect x="100" y="85" width="40" height="6" rx="2" />
          <rect x="200" y="85" width="30" height="6" rx="2" />
          
          {/* Row 3 */}
          <rect x="20" y="115" width="25" height="6" rx="2" />
          <rect x="100" y="115" width="55" height="6" rx="2" />
          <rect x="200" y="115" width="45" height="6" rx="2" />
        </g>
      </g>

      {/* --- 2. The Scanning Beam (Pandas/AI Detection) --- */}
      {/* Defined inside the coordinate space of the table but animated independently */}
      <g clipPath="url(#table-clip)">
        <g>
          <animateTransform 
            attributeName="transform" 
            type="translate" 
            from="-50 0" 
            to="350 0" 
            dur="3s" 
            repeatCount="indefinite" 
          />
          
          {/* The Laser Line */}
          <rect x="0" y="60" width="2" height="140" fill="#A855F7" opacity="0.8" />
          
          {/* The Gradient Trail */}
          <rect x="-40" y="60" width="40" height="140" fill="url(#scan-beam-gradient)" />
        </g>
      </g>

      {/* --- 3. The AI Brain / Gemini Node (Floating Above) --- */}
      <g transform="translate(200, 30)" filter="url(#ai-glow-soft)">
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="200 30; 200 25; 200 30" 
          dur="4s" 
          repeatCount="indefinite" 
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />

        {/* Connection Line to Table */}
        <path d="M0 20 L 0 50" stroke="url(#ai-deep-gradient)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

        {/* The Gemini Spark Icon */}
        <path d="M0 -14 C 0 -6 -6 0 -14 0 C -6 0 0 6 0 14 C 0 6 6 0 14 0 C 6 0 0 -6 0 -14 Z" fill="url(#ai-deep-gradient)" />
        
        {/* Orbiting Satellite 1 */}
        <circle cx="16" cy="-8" r="2" fill="#EC4899">
           <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="5s" repeatCount="indefinite" />
        </circle>
        {/* Orbiting Satellite 2 */}
        <circle cx="-14" cy="10" r="1.5" fill="#A855F7">
           <animateTransform attributeName="transform" type="rotate" from="360 0 0" to="0 0 0" dur="7s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* --- 4. The Actionable Insight Card (Result) --- */}
      <g transform="translate(260, 110)" filter="url(#ai-glow-soft)">
        <animate 
          attributeName="opacity" 
          values="0;1;1;0" 
          dur="3s" 
          repeatCount="indefinite" 
          keyTimes="0;0.3;0.8;1" 
        />
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="260 120; 260 110; 260 110; 260 100" 
          dur="3s" 
          repeatCount="indefinite"
          keyTimes="0;0.3;0.8;1" 
        />

        {/* Card Body */}
        <rect x="0" y="0" width="100" height="46" rx="6" fill="#FFFFFF" stroke="#F0ABFC" strokeWidth="1" />
        
        {/* Icon: Checkmark/Alert */}
        <circle cx="16" cy="23" r="8" fill="#FDF2F8" />
        <path d="M16 19 V 23" stroke="#DB2777" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="26" r="1" fill="#DB2777" />

        {/* Text Lines */}
        <rect x="32" y="12" width="50" height="5" rx="1" fill="#1E293B" />
        <rect x="32" y="22" width="60" height="4" rx="1" fill="#94A3B8" />
        <rect x="32" y="30" width="40" height="4" rx="1" fill="#94A3B8" />
      </g>
    </svg>
  </div>
);

export default AiSchemaIllustration;
