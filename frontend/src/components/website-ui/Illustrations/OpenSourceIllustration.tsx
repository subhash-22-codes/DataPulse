import React from 'react';
import { IllustrationProps } from '../../../types';
const OpenSourceIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
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
        <linearGradient id="branch-a-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="branch-b-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
          <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="core-glow-grad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>

        {/* --- Filters --- */}
        <filter id="code-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="shadow-clean" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* =========================================================================
          BACKGROUND: Git Grid
      ========================================================================= */}
      <path d="M 50 150 H 550" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M 300 50 V 250" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="6 6" />


      {/* =========================================================================
          BRANCH A (Student 1 - Blue)
      ========================================================================= */}
      <g>
        {/* The Path */}
        <path 
          d="M 50 80 C 150 80, 200 150, 300 150" 
          stroke="url(#branch-a-grad)" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round" 
        />
        
        {/* Commit Nodes */}
        <circle cx="120" cy="80" r="6" fill="#F8FAFC" stroke="#3B82F6" strokeWidth="2" />
        <circle cx="200" cy="110" r="6" fill="#F8FAFC" stroke="#3B82F6" strokeWidth="2" />

        {/* Moving Code Particle */}
        <circle r="4" fill="#3B82F6" filter="url(#code-glow)">
           <animateMotion path="M 50 80 C 150 80, 200 150, 300 150" dur="3s" repeatCount="indefinite" />
           <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Avatar/Icon Indicator */}
        <g transform="translate(40, 80)">
           <circle r="12" fill="#EFF6FF" stroke="#BFDBFE" />
           <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#3B82F6">S1</text>
        </g>
      </g>


      {/* =========================================================================
          BRANCH B (Student 2 - Purple)
      ========================================================================= */}
      <g>
        {/* The Path */}
        <path 
          d="M 50 220 C 150 220, 200 150, 300 150" 
          stroke="url(#branch-b-grad)" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round" 
        />
        
        {/* Commit Nodes */}
        <circle cx="140" cy="220" r="6" fill="#F8FAFC" stroke="#8B5CF6" strokeWidth="2" />
        <circle cx="220" cy="190" r="6" fill="#F8FAFC" stroke="#8B5CF6" strokeWidth="2" />

        {/* Moving Code Particle */}
        <circle r="4" fill="#8B5CF6" filter="url(#code-glow)">
           <animateMotion path="M 50 220 C 150 220, 200 150, 300 150" dur="3s" begin="0.5s" repeatCount="indefinite" />
           <animate attributeName="opacity" values="0;1;1;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
        </circle>

        {/* Avatar/Icon Indicator */}
        <g transform="translate(40, 220)">
           <circle r="12" fill="#FAF5FF" stroke="#E9D5FF" />
           <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#8B5CF6">S2</text>
        </g>
      </g>


      {/* =========================================================================
          THE MERGE CORE (The Project)
      ========================================================================= */}
      <g transform="translate(300, 150)" filter="url(#shadow-clean)">
         
         {/* Pulse Ring */}
         <circle r="40" fill="none" stroke="#64748B" strokeWidth="1" strokeDasharray="4 4" opacity="0.3">
            <animate attributeName="r" values="35; 45; 35" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3; 0.1; 0.3" dur="4s" repeatCount="indefinite" />
         </circle>

         {/* Core Hexagon / Badge */}
         <path d="M0 -30 L 26 -15 V 15 L 0 30 L -26 15 V -15 Z" fill="white" stroke="#E2E8F0" strokeWidth="2" />
         
         {/* Inner Code Bracket Icon */}
         <g transform="scale(1.2)">
           <path d="M-8 -6 L-14 0 L-8 6" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
           <path d="M8 -6 L14 0 L8 6" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
           <path d="M-4 8 L 4 -8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
         </g>

         {/* "Merged" Flash Effect */}
         <circle r="30" fill="white" opacity="0">
            <animate attributeName="opacity" values="0; 0.5; 0" dur="3s" repeatCount="indefinite" />
         </circle>
      </g>


      {/* =========================================================================
          OUTPUT (The Community / Value)
      ========================================================================= */}
      <g>
         {/* Main Trunk Line */}
         <path d="M 326 150 H 500" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
         
         {/* Product Badge (Right) */}
         <g transform="translate(520, 150)" filter="url(#shadow-clean)">
            <rect x="-40" y="-20" width="80" height="40" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            <text x="0" y="5" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#334155">v1.0 Ready</text>
            
            {/* Status Dot */}
            <circle cx="30" cy="-12" r="3" fill="#10B981">
               <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </circle>
         </g>

         {/* Success Particles flowing out */}
         <circle r="3" fill="#10B981">
            <animateMotion path="M 330 150 H 480" dur="2s" repeatCount="indefinite" />
         </circle>
      </g>

    </svg>
  </div>
);

export default OpenSourceIllustration;