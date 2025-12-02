import React from 'react';
import { IllustrationProps } from '../../../types';

const WebsocketIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 220"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Electric Amber Gradient (Speed & Energy) */}
        <linearGradient id="energy-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#F59E0B" />   {/* Amber-500 */}
          <stop offset="0.5" stopColor="#FEF3C7" /> {/* Amber-100 (Bright Center) */}
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>

        {/* Server Terminal Gradient */}
        <linearGradient id="terminal-body" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>

        {/* Connection Glow */}
        <filter id="glow-bolt" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft Drop Shadow for Cards */}
        <filter id="float-shadow-lg" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dy="8" />
          <feComposite in2="SourceAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>

      {/* --- Background: Subtle Connectivity Grid --- */}
      <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="#E2E8F0" />
      </pattern>
      <rect width="400" height="220" fill="url(#dot-pattern)" opacity="0.6" />

      {/* --- The Connection Pipeline (The WebSocket) --- */}
      <g transform="translate(0, 10)">
        {/* Cable Housing */}
        <path d="M120 100 H 280" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
        
        {/* The Active Connection Line */}
        <path d="M120 100 H 280" stroke="#FBBF24" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />

        {/* High Speed Data Packet (Left to Right) */}
        <g filter="url(#glow-bolt)">
            <circle r="4" fill="#FFFFFF">
                <animateMotion path="M120 100 H 280" dur="1s" repeatCount="indefinite" calcMode="linear" />
            </circle>
            <circle r="8" stroke="#F59E0B" strokeWidth="2" opacity="0.5">
                <animateMotion path="M120 100 H 280" dur="1s" repeatCount="indefinite" calcMode="linear" />
                <animate attributeName="r" values="6;10;6" dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="0.5s" repeatCount="indefinite" />
            </circle>
        </g>
        
        {/* Central "Socket" Icon */}
        <g transform="translate(200, 100)">
            <circle cx="0" cy="0" r="14" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
            {/* Lightning Bolt */}
            <path d="M-2 -6 L 4 -1 L 1 1 L 3 7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </g>

      {/* --- LEFT: The Server (Pushing Data) --- */}
      <g transform="translate(40, 60)" filter="url(#float-shadow-lg)">
        {/* Terminal Window */}
        <rect width="100" height="80" rx="8" fill="url(#terminal-body)" stroke="#334155" strokeWidth="1" />
        
        {/* Traffic Lights */}
        <circle cx="12" cy="12" r="3" fill="#EF4444" opacity="0.8"/>
        <circle cx="22" cy="12" r="3" fill="#F59E0B" opacity="0.8"/>
        <circle cx="32" cy="12" r="3" fill="#10B981" opacity="0.8"/>

        {/* Code Lines */}
        <g transform="translate(12, 30)">
            <rect width="20" height="4" rx="1" fill="#64748B" /> {/* const */}
            <rect x="25" width="40" height="4" rx="1" fill="#94A3B8" /> {/* socket */}
            
            <rect y="12" width="15" height="4" rx="1" fill="#64748B" /> {/* emit */}
            <rect x="20" y="12" width="30" height="4" rx="1" fill="#F59E0B" /> {/* 'update' */}
            
            {/* The Active Value being pushed */}
            <rect y="24" width="76" height="14" rx="2" fill="#334155" /> 
            <rect x="4" y="29" width="60" height="4" rx="1" fill="#F59E0B">
                 <animate attributeName="opacity" values="0.5;1;0.5" dur="0.2s" repeatCount="indefinite" />
            </rect>
        </g>
        
        {/* Status Indicator */}
        <rect x="75" y="65" width="16" height="6" rx="2" fill="#10B981" />
      </g>

      {/* --- RIGHT: The Client (Instant Update) --- */}
      <g transform="translate(260, 55)" filter="url(#float-shadow-lg)">
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="260 55; 260 52; 260 55" 
          dur="4s" 
          repeatCount="indefinite" 
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />

        {/* Dashboard Card */}
        <rect width="110" height="90" rx="10" fill="#FFFFFF" />
        <rect width="110" height="90" rx="10" stroke="#E2E8F0" strokeWidth="1" />

        {/* Header */}
        <rect x="12" y="12" width="30" height="4" rx="1" fill="#94A3B8" />
        <circle cx="98" cy="14" r="3" fill="#10B981"> {/* Live Dot */}
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* The Live Chart Area */}
        <path d="M0 45 H 110" stroke="#F1F5F9" strokeWidth="1" />
        
        {/* Metric Value */}
        <g transform="translate(12, 36)">
            <text x="0" y="0" fontFamily="sans-serif" fontSize="20" fontWeight="800" fill="#1E293B">98%</text>
        </g>

        {/* Mini Graph (Updating) */}
        <path d="M12 70 L 30 65 L 50 72 L 70 60 L 98 55" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M12 70 L 30 65 L 50 72 L 70 60 L 98 55 V 90 H 12 V 70 Z" fill="url(#energy-gradient)" opacity="0.1" />
        
        {/* Pulse at the end of graph */}
        <circle cx="98" cy="55" r="3" fill="#F59E0B">
            <animate attributeName="r" values="3;6;3" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  </div>
);

export default WebsocketIllustration;