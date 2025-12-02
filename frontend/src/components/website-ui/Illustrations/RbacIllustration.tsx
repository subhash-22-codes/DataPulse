import React from 'react';
import { IllustrationProps } from '../../../types';

const RbacIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 220"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Toggle Gradient (Green for Active) */}
        <linearGradient id="toggle-active" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>

        {/* User Avatar Gradient */}
        <linearGradient id="avatar-grad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F1F5F9" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Premium Card Shadow */}
        <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
          <feOffset dy="8" />
          <feComposite in2="SourceAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0.06 0 0 0 0 0.09 0 0 0 0 0.16 0 0 0 0.12 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>

      {/* --- Background: The Data Table (The Protected Resource) --- */}
      <g opacity="0.4" transform="translate(40, 40)">
        <rect width="320" height="160" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
        {/* Table Header */}
        <rect x="0" y="30" width="320" height="1" fill="#E2E8F0" />
        <rect x="20" y="12" width="60" height="6" rx="2" fill="#94A3B8" />
        <rect x="120" y="12" width="80" height="6" rx="2" fill="#94A3B8" />
        
        {/* Row 1 */}
        <rect x="20" y="50" width="40" height="6" rx="2" fill="#CBD5E1" />
        <rect x="120" y="50" width="100" height="6" rx="2" fill="#CBD5E1" />
        {/* Row 2 */}
        <rect x="20" y="80" width="30" height="6" rx="2" fill="#CBD5E1" />
        <rect x="120" y="80" width="120" height="6" rx="2" fill="#CBD5E1" />
        {/* Row 3 */}
        <rect x="20" y="110" width="50" height="6" rx="2" fill="#CBD5E1" />
        <rect x="120" y="110" width="80" height="6" rx="2" fill="#CBD5E1" />
      </g>

      {/* --- Foreground: The Access Control Card --- */}
      <g transform="translate(100, 50)" filter="url(#card-shadow)">
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="100 50; 100 46; 100 50" 
          dur="6s" 
          repeatCount="indefinite" 
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />

        {/* Card Body */}
        <rect width="200" height="130" rx="10" fill="#FFFFFF" />
        <rect width="200" height="130" rx="10" stroke="#E2E8F0" strokeWidth="1" />

        {/* -- Section 1: User Profile -- */}
        <g transform="translate(20, 20)">
          {/* Avatar Circle */}
          <circle cx="20" cy="20" r="20" fill="url(#avatar-grad)" stroke="#F1F5F9" strokeWidth="1" />
          {/* User Icon/Silhouette */}
          <path d="M20 20 C 15 20 12 24 12 28 V 32 H 28 V 28 C 28 24 25 20 20 20 Z" fill="#94A3B8" />
          <circle cx="20" cy="15" r="5" fill="#94A3B8" />
          
          {/* Text Info */}
          <rect x="50" y="8" width="80" height="8" rx="2" fill="#1E293B" /> {/* Name */}
          <rect x="50" y="22" width="60" height="6" rx="2" fill="#16A34A" fillOpacity="0.2" /> {/* Role Badge BG */}
          <rect x="50" y="22" width="60" height="6" rx="2" stroke="#16A34A" strokeWidth="0.5" fill="none" />
          <rect x="56" y="24" width="30" height="2" rx="1" fill="#16A34A" /> {/* Role Text */}
        </g>

        {/* Divider */}
        <path d="M0 70 H 200" stroke="#F1F5F9" strokeWidth="1" />

        {/* -- Section 2: Permissions (Toggles) -- */}
        <g transform="translate(20, 80)">
          
          {/* Permission Row 1: Read Access (Active) */}
          <g>
            <rect y="4" width="80" height="6" rx="2" fill="#64748B" />
            
            {/* The Toggle Switch (ON) */}
            <g transform="translate(130, 0)">
              <rect width="32" height="18" rx="9" fill="url(#toggle-active)" />
              <circle cx="23" cy="9" r="7" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))">
                <animate attributeName="cx" values="9;23" dur="0.6s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1" />
              </circle>
            </g>
          </g>

          {/* Permission Row 2: Write Access (Inactive/Disabled) */}
          <g transform="translate(0, 30)">
            <rect y="4" width="60" height="6" rx="2" fill="#CBD5E1" />
            
            {/* The Toggle Switch (OFF) */}
            <g transform="translate(130, 0)">
              <rect width="32" height="18" rx="9" fill="#E2E8F0" />
              <circle cx="9" cy="9" r="7" fill="white" stroke="#CBD5E1" strokeWidth="1" />
            </g>
          </g>
        </g>
        
        {/* Lock Icon Indicator (Top Right) */}
        <g transform="translate(170, 15)">
            <rect x="0" y="5" width="14" height="10" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M3 5 V 3 C 3 1 5 0 7 0 C 9 0 11 1 11 3 V 5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="10" r="1.5" fill="#94A3B8" />
        </g>
      </g>
    </svg>
  </div>
);

export default RbacIllustration;