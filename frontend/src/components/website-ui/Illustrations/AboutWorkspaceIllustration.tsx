import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const AboutWorkspaceIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `workspace-prod-${rawId.replace(/[:\s]/g, '')}`;

  return (
    <svg
      className={className}
      width="512"
      height="512"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Workspace Illustration"
    >
      <defs>
        {/* 1. Deep Ambient Shadow (Soft lift) */}
        <filter id={`${id}-shadow-ambient`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#1E293B" floodOpacity="0.2" />
        </filter>

        {/* 2. Crisp Contact Shadow (Grounding) */}
        <filter id={`${id}-shadow-contact`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.2" />
        </filter>

        {/* 3. Bookmark Shadow */}
        <filter id={`${id}-shadow-bookmark`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
        </filter>

        {/* --- GRADIENTS --- */}
        
        {/* Cover Gradient (Professional Deep Slate) */}
        <linearGradient id={`${id}-grad-cover`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" /> {/* Slate 700 */}
          <stop offset="100%" stopColor="#1E293B" /> {/* Slate 800 */}
        </linearGradient>

        <linearGradient id={`${id}-grad-cover-edge`} x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stopColor="#1E293B" />
           <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Page Gradients (Realistic Gutter Shadow) */}
        <linearGradient id={`${id}-grad-page-left`} x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#CBD5E1" /> {/* Darker gutter */}
          <stop offset="10%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        <linearGradient id={`${id}-grad-page-right`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#CBD5E1" /> {/* Darker gutter */}
          <stop offset="10%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Bookmark Gradient (Premium Emerald) */}
        <linearGradient id={`${id}-grad-bookmark`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* --- MAIN BOOK GROUP --- */}
      <g filter={`url(#${id}-shadow-ambient)`}>
        
        {/* --- 1. THE COVER (Base Layer) --- */}
        <g filter={`url(#${id}-shadow-contact)`}>
            {/* Main Cover Body */}
            <path
              d="M20 70 Q60 90 100 80 Q140 90 180 70 L180 155 Q140 180 100 165 Q60 180 20 155 Z"
              fill={`url(#${id}-grad-cover)`}
              stroke="#475569" 
              strokeWidth="0.5"
            />
             {/* Rim Light on Cover Top Edge */}
             <path
              d="M20 70 Q60 90 100 80 Q140 90 180 70"
              fill="none"
              stroke="#64748B"
              strokeWidth="1"
              strokeOpacity="0.5"
            />

            {/* Cover Thickness */}
            <path
              d="M20 155 Q60 180 100 165 Q140 180 180 155 L180 165 Q140 190 100 175 Q60 190 20 165 Z"
              fill={`url(#${id}-grad-cover-edge)`}
            />
        </g>

        {/* --- 2. THE PAGES BLOCK (Middle Layer) --- */}
        <path
          d="M25 145 Q60 165 100 155 Q140 165 175 145 L175 150 Q140 170 100 160 Q60 170 25 150 Z"
          fill="#E2E8F0" 
          stroke="#CBD5E1" 
          strokeWidth="0.5"
        />

        {/* --- 3. TOP PAGE SURFACE (Top Layer) --- */}
        {/* Left Page */}
        <path
          d="M100 80 Q60 90 25 75 L25 145 Q60 165 100 155 Z"
          fill={`url(#${id}-grad-page-left)`}
        />
        
        {/* Right Page */}
        <path
          d="M100 80 Q140 90 175 75 L175 145 Q140 165 100 155 Z"
          fill={`url(#${id}-grad-page-right)`}
        />

        {/* --- 4. SPINE GUTTER Detail --- */}
        <path
          d="M100 82 L100 153"
          stroke="#94A3B8"
          strokeWidth="1.5"
          strokeOpacity="0.3"
          strokeLinecap="round"
        />

        {/* --- 5. CONTENT (SaaS Style Workspace UI) --- */}
        
        {/* Left Page: Task List Widget */}
        <g transform="translate(35, 95) rotate(6) skewX(2)" opacity="0.9">
            {/* Header */}
            <rect x="0" y="0" width="40" height="3" rx="1.5" fill="#E0F2FE" />
            <rect x="0" y="5" width="15" height="1" rx="0.5" fill="#38BDF8" opacity="0.5" />

            {/* Checklist Items */}
            <g transform="translate(0, 12)">
                <circle cx="2" cy="2" r="2" fill="#CBD5E1" /> <rect x="6" y="1" width="30" height="2" rx="1" fill="#E2E8F0"/>
                <circle cx="2" cy="8" r="2" fill="#34D399" /> <rect x="6" y="7" width="30" height="2" rx="1" fill="#94A3B8"/>
                <circle cx="2" cy="14" r="2" fill="#CBD5E1" /> <rect x="6" y="13" width="25" height="2" rx="1" fill="#E2E8F0"/>
            </g>
        </g>

        {/* Right Page: Analytics Widget */}
        <g transform="translate(120, 90) rotate(-6) skewX(-2)" opacity="0.9">
             {/* Widget Container Border */}
            <rect x="0" y="0" width="45" height="30" rx="2" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
            
            {/* Header */}
            <rect x="4" y="4" width="20" height="2" rx="1" fill="#94A3B8" />

            {/* Tiny Bar Chart */}
            <g transform="translate(4, 12)">
                <rect x="0" y="8" width="4" height="8" rx="1" fill="#CBD5E1" />
                <rect x="6" y="4" width="4" height="12" rx="1" fill="#38BDF8" /> 
                <rect x="12" y="10" width="4" height="6" rx="1" fill="#CBD5E1" />
                <rect x="18" y="2" width="4" height="14" rx="1" fill="#CBD5E1" />
                <rect x="24" y="6" width="4" height="10" rx="1" fill="#CBD5E1" />
            </g>
             {/* Base line */}
            <line x1="4" y1="28" x2="41" y2="28" stroke="#E2E8F0" strokeWidth="1"/>
        </g>

        {/* --- 6. BOOKMARK (Premium Accent) --- */}
        <g filter={`url(#${id}-shadow-bookmark)`}>
            <path
              d="M138 60 V 100 L 145 93 L 152 100 V 58"
              fill={`url(#${id}-grad-bookmark)`}
              stroke="#059669" 
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
             {/* Glossy highlight */}
             <path d="M139 60 V 98 L 145 92" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" fill="none" />
        </g>

      </g>
    </svg>
  );
};

export default AboutWorkspaceIllustration;