import React from 'react';
import { IllustrationProps } from '../../../types';

const TimezoneIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 220"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Day Gradient (Warm) */}
        <linearGradient id="day-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFF7ED" />
          <stop offset="1" stopColor="#FFEDD5" />
        </linearGradient>

        {/* Night Gradient (Cool/Dark) */}
        <linearGradient id="night-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>

        {/* UTC Core Gradient */}
        <linearGradient id="utc-core" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>

        {/* Card Shadow */}
        <filter id="float-shadow-tz" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dy="8" />
          <feComposite in2="SourceAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>

      {/* --- Background: Abstract World Map Dots --- */}
      <g opacity="0.3" fill="#CBD5E1">
        <circle cx="50" cy="50" r="2" /> <circle cx="70" cy="40" r="2" /> <circle cx="90" cy="60" r="2" />
        <circle cx="310" cy="50" r="2" /> <circle cx="330" cy="70" r="2" /> <circle cx="350" cy="40" r="2" />
        <circle cx="200" cy="180" r="2" /> <circle cx="220" cy="190" r="2" />
      </g>
      
      {/* Connectivity Lines (Curved Bezier) */}
      <path d="M200 110 C 160 110, 150 110, 110 110" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M200 110 C 240 110, 250 110, 290 110" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />

      {/* --- LEFT: New York User (Day Mode) --- */}
      <g transform="translate(40, 75)" filter="url(#float-shadow-tz)">
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="40 75; 40 72; 40 75" 
          dur="5s" 
          repeatCount="indefinite" 
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />

        {/* Card Body */}
        <rect width="110" height="70" rx="10" fill="url(#day-gradient)" stroke="#FED7AA" strokeWidth="1" />

        {/* Sun Icon (Spinning Rays) */}
        <g transform="translate(90, 20)">
            <circle cx="0" cy="0" r="5" fill="#F59E0B" />
            <g>
                <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="8s" repeatCount="indefinite" />
                <path d="M0 -9 V -7 M 6 -6 L 5 -5 M 9 0 H 7 M 6 6 L 5 5 M 0 9 V 7 M -6 6 L -5 5 M -9 0 H -7 M -6 -6 L -5 -5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
            </g>
        </g>

        {/* User Info */}
        <circle cx="20" cy="20" r="8" fill="#FDBA74" opacity="0.5" />
        <rect x="34" y="16" width="30" height="4" rx="1" fill="#9A3412" opacity="0.4" />
        <rect x="34" y="24" width="20" height="3" rx="1" fill="#9A3412" opacity="0.2" />

        {/* Local Time Display (Hero) */}
        <rect x="10" y="42" width="90" height="18" rx="4" fill="#FFFFFF" />
        <text x="55" y="55" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#F97316">10:00 AM</text>
        
        {/* Location Tag */}
        <rect x="68" y="-6" width="34" height="14" rx="4" fill="#FFFFFF" stroke="#FED7AA" strokeWidth="1" />
        <text x="85" y="4" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#F97316">NYC</text>
      </g>

      {/* --- RIGHT: Tokyo User (Night Mode) --- */}
      <g transform="translate(250, 75)" filter="url(#float-shadow-tz)">
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="250 75; 250 72; 250 75" 
          dur="5s" 
          repeatCount="indefinite" 
          begin="0.5s"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />

        {/* Card Body */}
        <rect width="110" height="70" rx="10" fill="url(#night-gradient)" stroke="#334155" strokeWidth="1" />

        {/* Moon Icon (Subtle Rocking) */}
        <g transform="translate(90, 20)">
            <animateTransform attributeName="transform" type="rotate" values="-10 0 0; 10 0 0; -10 0 0" dur="6s" repeatCount="indefinite" />
            <path d="M5 -5 C 3 -5 0 -2 0 2 C 0 6 3 9 7 9 C 7 5 6 1 5 -5 Z" fill="#A78BFA" />
            {/* Stars */}
            <circle cx="-6" cy="-2" r="1" fill="#FFF" opacity="0.8" />
            <circle cx="-2" cy="6" r="1" fill="#FFF" opacity="0.5" />
        </g>

        {/* User Info */}
        <circle cx="20" cy="20" r="8" fill="#475569" />
        <rect x="34" y="16" width="30" height="4" rx="1" fill="#94A3B8" />
        <rect x="34" y="24" width="20" height="3" rx="1" fill="#64748B" />

        {/* Local Time Display (Hero) */}
        <rect x="10" y="42" width="90" height="18" rx="4" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="55" y="55" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#A78BFA">11:00 PM</text>
        
        {/* Location Tag */}
        <rect x="68" y="-6" width="34" height="14" rx="4" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="85" y="4" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#A78BFA">TYO</text>
      </g>

      {/* --- CENTER: UTC Sync Core (The Smart Converter) --- */}
      <g transform="translate(180, 90)">
        {/* Outer Glow Ring */}
        <circle cx="20" cy="20" r="24" stroke="#3B82F6" strokeWidth="1" strokeDasharray="2 2" opacity="0.5">
           <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="20s" repeatCount="indefinite" />
        </circle>
        
        {/* Core Body */}
        <circle cx="20" cy="20" r="18" fill="url(#utc-core)" stroke="#FFFFFF" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(37,99,235,0.4))" />
        
        {/* Text "UTC" */}
        <text x="20" y="24" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="800" fill="#FFFFFF">UTC</text>
        
        {/* Pulsing Sync Dot */}
        <circle cx="20" cy="20" r="22" stroke="#60A5FA" strokeWidth="2" opacity="0">
            <animate attributeName="r" values="18;26" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  </div>
);

export default TimezoneIllustration;