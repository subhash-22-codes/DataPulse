import React from 'react';
import { IllustrationProps } from '../../../types';

const AuditLogsIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 240"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Modern Log List Gradient */}
        <linearGradient id="log-list-bg" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>

        {/* The Scanning Beam Gradient */}
        <linearGradient id="compliance-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#10B981" stopOpacity="0" />
          <stop offset="0.5" stopColor="#10B981" stopOpacity="0.5" />
          <stop offset="1" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>

        {/* Deep Shadow for the Log Card */}
        <filter id="audit-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dy="8" />
          <feComposite in2="SourceAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0.05 0 0 0 0 0.05 0 0 0 0 0.1 0 0 0 0.1 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>

        {/* Clip Path for Scanner */}
        <clipPath id="card-clip">
          <rect x="60" y="40" width="280" height="160" rx="8" />
        </clipPath>
      </defs>

      {/* --- Background: Subtle Security Grid --- */}
      <path d="M40 20 V 220 M 80 20 V 220 M 120 20 V 220 M 160 20 V 220 M 200 20 V 220 M 240 20 V 220 M 280 20 V 220 M 320 20 V 220 M 360 20 V 220" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
      <path d="M20 40 H 380 M 20 80 H 380 M 20 120 H 380 M 20 160 H 380 M 20 200 H 380" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />

      {/* --- Main Interface: The Log Viewer --- */}
      <g transform="translate(60, 40)" filter="url(#audit-shadow)">
        
        {/* Card Frame */}
        <rect width="280" height="160" rx="8" fill="url(#log-list-bg)" stroke="#E2E8F0" strokeWidth="1" />

        {/* Header Bar */}
        <path d="M0 32 H 280" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="16" y="10" width="12" height="12" rx="3" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" /> {/* Icon */}
        <rect x="36" y="13" width="60" height="6" rx="2" fill="#64748B" /> {/* Title: Audit Log */}
        <rect x="220" y="12" width="44" height="8" rx="4" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1" /> {/* Live Badge */}
        <circle cx="228" cy="16" r="2" fill="#16A34A">
           <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        
        {/* Column Headers */}
        <g transform="translate(16, 45)">
           <rect width="40" height="4" rx="1" fill="#94A3B8" /> {/* Time */}
           <rect x="60" width="40" height="4" rx="1" fill="#94A3B8" /> {/* User */}
           <rect x="120" width="60" height="4" rx="1" fill="#94A3B8" /> {/* Action */}
           <rect x="220" width="20" height="4" rx="1" fill="#94A3B8" /> {/* Status */}
        </g>

        {/* --- Log Rows --- */}
        <g transform="translate(16, 60)">
          {/* Row 1 */}
          <rect y="0" width="248" height="24" rx="4" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="1" />
          <rect x="10" y="10" width="30" height="4" rx="1" fill="#CBD5E1" />
          <rect x="60" y="10" width="40" height="4" rx="1" fill="#64748B" />
          <rect x="120" y="10" width="80" height="4" rx="1" fill="#64748B" />
          <circle cx="230" cy="12" r="3" fill="#10B981" /> {/* Status: Green */}

          {/* Row 2 */}
          <rect y="32" width="248" height="24" rx="4" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="1" />
          <rect x="10" y="42" width="30" height="4" rx="1" fill="#CBD5E1" />
          <rect x="60" y="42" width="35" height="4" rx="1" fill="#64748B" />
          <rect x="120" y="42" width="70" height="4" rx="1" fill="#64748B" />
          <circle cx="230" cy="44" r="3" fill="#10B981" /> 

          {/* Row 3 (Being Scanned) */}
          <rect y="64" width="248" height="24" rx="4" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="1" />
          <rect x="10" y="74" width="30" height="4" rx="1" fill="#CBD5E1" />
          <rect x="60" y="74" width="45" height="4" rx="1" fill="#64748B" />
          <rect x="120" y="74" width="60" height="4" rx="1" fill="#64748B" />
          {/* Pulsing Status Dot */}
          <circle cx="230" cy="76" r="3" fill="#E2E8F0"> 
             <animate attributeName="fill" values="#E2E8F0;#10B981" dur="3s" repeatCount="indefinite" begin="0.5s" />
          </circle>

           {/* Row 4 */}
          <rect y="96" width="248" height="24" rx="4" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="1" opacity="0.6" />
          <rect x="10" y="106" width="30" height="4" rx="1" fill="#E2E8F0" />
          <rect x="60" y="106" width="40" height="4" rx="1" fill="#CBD5E1" />
        </g>
      </g>

      {/* --- The "Compliance Beam" Scanner --- */}
      <g clipPath="url(#card-clip)">
        <g>
          <animateTransform 
             attributeName="transform" 
             type="translate" 
             values="0 0; 0 200; 0 0" 
             dur="4s" 
             repeatCount="indefinite"
             keyTimes="0; 0.6; 1"
          />
          {/* The Laser Line */}
          <rect x="0" y="20" width="400" height="2" fill="#10B981" opacity="0.8" />
          {/* The Gradient Wash */}
          <rect x="0" y="-20" width="400" height="40" fill="url(#compliance-beam)" />
        </g>
      </g>

      {/* --- The "Verified" Security Seal (Floating Badge) --- */}
      <g transform="translate(290, 160)" filter="url(#audit-shadow)">
        <animateTransform 
             attributeName="transform" 
             type="translate" 
             values="290 160; 290 156; 290 160" 
             dur="5s" 
             repeatCount="indefinite" 
             calcMode="spline"
             keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
        
        {/* Badge Body */}
        <circle cx="30" cy="30" r="28" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="1" />
        <circle cx="30" cy="30" r="24" fill="#DCFCE7" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Shield Icon */}
        <path d="M30 14L22 18V24C22 29 25 33 30 35C35 33 38 29 38 24V18L30 14Z" fill="#10B981" />
        <path d="M27 24L29 26L33 22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Ribbon Detail */}
        <path d="M14 44 L 24 38 L 24 38" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
        <path d="M46 44 L 36 38" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  </div>
);

export default AuditLogsIllustration;