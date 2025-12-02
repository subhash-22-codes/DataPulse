import React from 'react';
import { IllustrationProps } from '../../../types';


const TeamIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* --- Gradients --- */}
        <linearGradient id="grad-purple" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#C084FC" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
        <linearGradient id="grad-blue" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="grad-pink" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F472B6" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
        
        {/* Hub Screen Gradient */}
        <linearGradient id="grad-hub-screen" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Connection Line Gradients */}
        <linearGradient id="grad-line-purple" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C084FC" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#C084FC" stopOpacity="0.4" />
            <stop offset="1" stopColor="#C084FC" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="grad-line-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#60A5FA" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#60A5FA" stopOpacity="0.4" />
            <stop offset="1" stopColor="#60A5FA" stopOpacity="0.05" />
        </linearGradient>
          <linearGradient id="grad-line-pink" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F472B6" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#F472B6" stopOpacity="0.4" />
            <stop offset="1" stopColor="#F472B6" stopOpacity="0.05" />
        </linearGradient>

        {/* --- Filters --- */}
        <filter id="avatar-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
        
        <filter id="cursor-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* --- Connectivity Layer --- */}
      <g transform="translate(0, 10)">
        {/* Left Connection */}
        <path d="M 145 130 C 160 130, 160 100, 180 100" stroke="url(#grad-line-purple)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle r="2" fill="#C084FC">
          <animateMotion dur="3s" repeatCount="indefinite" path="M 145 130 C 160 130, 160 100, 180 100" />
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Top Connection */}
        <path d="M 200 65 L 200 82" stroke="url(#grad-line-blue)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle r="2" fill="#60A5FA">
          <animateMotion dur="3s" repeatCount="indefinite" begin="1s" path="M 200 65 L 200 82" />
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Right Connection */}
        <path d="M 255 130 C 240 130, 240 100, 220 100" stroke="url(#grad-line-pink)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle r="2" fill="#F472B6">
          <animateMotion dur="3s" repeatCount="indefinite" begin="2s" path="M 255 130 C 240 130, 240 100, 220 100" />
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* --- Central Workspace Hub (Shared Document View) --- */}
      <g transform="translate(200, 110)">
          <animateTransform attributeName="transform" type="translate" values="200 110; 200 106; 200 110" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
          
          {/* Main Interface Card */}
          <rect x="-40" y="-30" width="80" height="60" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1" filter="url(#avatar-shadow)" />
          
          {/* Header Bar */}
          <path d="M -40 -20 H 40" stroke="#F1F5F9" strokeWidth="1" />
          <circle cx="-32" cy="-25" r="2" fill="#EF4444" />
          <circle cx="-26" cy="-25" r="2" fill="#F59E0B" />
          <circle cx="-20" cy="-25" r="2" fill="#10B981" />
          
          {/* Content Skeletons */}
          <rect x="-30" y="-10" width="30" height="4" rx="1" fill="#94A3B8" />
          <rect x="-30" y="0" width="60" height="4" rx="1" fill="#E2E8F0" />
          <rect x="-30" y="10" width="50" height="4" rx="1" fill="#E2E8F0" />
          <rect x="-30" y="20" width="40" height="4" rx="1" fill="#E2E8F0" />

          {/* --- Live Cursors (Multiplayer Feel) --- */}
          
          {/* Cursor A (Purple) */}
          <g transform="translate(10, 5)">
            <animateTransform attributeName="transform" type="translate" values="10 5; 25 15; 5 20; 10 5" dur="8s" repeatCount="indefinite" />
            <path d="M0 0 L 3 9 L 5 5 L 9 3 L 0 0" fill="#C084FC" stroke="white" strokeWidth="0.5" filter="url(#cursor-shadow)" />
            <rect x="2" y="10" width="14" height="6" rx="2" fill="#C084FC" />
            <text x="9" y="14.5" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold" fontFamily="sans-serif">JD</text>
          </g>

          {/* Cursor C (Pink) */}
          <g transform="translate(-20, 15)">
            <animateTransform attributeName="transform" type="translate" values="-20 15; -10 5; -25 -5; -20 15" dur="7s" repeatCount="indefinite" />
            <path d="M0 0 L 3 9 L 5 5 L 9 3 L 0 0" fill="#F472B6" stroke="white" strokeWidth="0.5" filter="url(#cursor-shadow)" />
            <rect x="2" y="10" width="14" height="6" rx="2" fill="#F472B6" />
            <text x="9" y="14.5" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold" fontFamily="sans-serif">MK</text>
          </g>
      </g>

      {/* --- Team Member A (Purple - Left) --- */}
      <g transform="translate(130, 140)" filter="url(#avatar-shadow)">
          <animateTransform attributeName="transform" type="translate" values="130 140; 130 138; 130 140" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
          
          {/* Avatar Ring */}
          <circle cx="0" cy="0" r="13" fill="none" stroke="#C084FC" strokeWidth="1" strokeOpacity="0.3" />
          
          <path d="M -16 20 C -16 12, -8 8, 0 8 C 8 8, 16 12, 16 20 V 24 H -16 Z" fill="url(#grad-purple)" />
          <circle cx="0" cy="0" r="10" fill="url(#grad-purple)" stroke="#F8FAFC" strokeWidth="2" />
          <text x="0" y="4" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">JD</text>
          <circle cx="10" cy="-6" r="3.5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1.5" />
      </g>

      {/* --- Team Member B (Blue - Top) --- */}
      <g transform="translate(200, 55)" filter="url(#avatar-shadow)">
          <animateTransform attributeName="transform" type="translate" values="200 55; 200 53; 200 55" dur="4s" begin="1.3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
          
          {/* Avatar Ring */}
          <circle cx="0" cy="0" r="13" fill="none" stroke="#60A5FA" strokeWidth="1" strokeOpacity="0.3" />

          <path d="M -16 20 C -16 12, -8 8, 0 8 C 8 8, 16 12, 16 20 V 24 H -16 Z" fill="url(#grad-blue)" />
          <circle cx="0" cy="0" r="10" fill="url(#grad-blue)" stroke="#F8FAFC" strokeWidth="2" />
          <text x="0" y="4" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">AL</text>
          <circle cx="10" cy="-6" r="3.5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1.5" />
          
          {/* Typing Indicator */}
          <g transform="translate(18, -10)">
            <rect width="24" height="14" rx="7" fill="white" stroke="#E2E8F0" strokeWidth="1" />
            <circle cx="6" cy="7" r="1.5" fill="#94A3B8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="12" cy="7" r="1.5" fill="#94A3B8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="18" cy="7" r="1.5" fill="#94A3B8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite" />
            </circle>
          </g>
      </g>

      {/* --- Team Member C (Pink - Right) --- */}
      <g transform="translate(270, 140)" filter="url(#avatar-shadow)">
          <animateTransform attributeName="transform" type="translate" values="270 140; 270 138; 270 140" dur="4s" begin="2.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
          
          {/* Avatar Ring */}
          <circle cx="0" cy="0" r="13" fill="none" stroke="#F472B6" strokeWidth="1" strokeOpacity="0.3" />

          <path d="M -16 20 C -16 12, -8 8, 0 8 C 8 8, 16 12, 16 20 V 24 H -16 Z" fill="url(#grad-pink)" />
          <circle cx="0" cy="0" r="10" fill="url(#grad-pink)" stroke="#F8FAFC" strokeWidth="2" />
          <text x="0" y="4" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">MK</text>
          <circle cx="10" cy="-6" r="3.5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1.5" />
      </g>

    </svg>
  </div>
);

export default TeamIllustration;