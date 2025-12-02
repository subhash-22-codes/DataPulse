import React from "react";
import { IllustrationProps } from "../../../types";

const AlertIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 400 300"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* --- GRADIENTS & FILLS --- */}
        
        <linearGradient id="adv-alert-frame" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E2E8F0" />
          <stop offset="0.5" stopColor="#CBD5E1" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>

        <linearGradient id="adv-alert-screen-bg" x1="100" y1="0" x2="100" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>

        {/* Chart Gradient: Changed to Purple/Blue to match "Schema" theme nicely, or keep Red for Alert */}
        <linearGradient id="adv-alert-chart" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" stopOpacity="0.2" />
          <stop offset="0.8" stopColor="#818CF8" stopOpacity="0.8" />
        </linearGradient>

        {/* SHADOW FIX: Keeping the percentage values so it doesn't clip */}
        <filter id="adv-alert-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dy="8" />
          <feComposite in2="SourceAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0.05 0 0 0 0 0.06 0 0 0 0 0.1 0 0 0 0.12 0" />
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>

        <clipPath id="adv-alert-screen-mask">
          <rect x="114" y="24" width="172" height="252" rx="20" />
        </clipPath>
      </defs>

      {/* --- PHONE CHASSIS --- */}
      <g transform="translate(0, 10)">
         <rect x="110" y="20" width="180" height="260" rx="24" fill="url(#adv-alert-frame)" stroke="#94A3B8" strokeWidth="1" />
         <rect x="113" y="23" width="174" height="254" rx="21" fill="#0F172A" />
         <rect x="114" y="24" width="172" height="252" rx="20" fill="url(#adv-alert-screen-bg)" />
      </g>

      {/* --- SCREEN CONTENT --- */}
      <g clipPath="url(#adv-alert-screen-mask)" transform="translate(0, 10)">
         
         {/* 1. DASHBOARD UI (Subtle Background) */}
         <g opacity="0.4">
             <rect x="130" y="45" width="40" height="6" rx="2" fill="#CBD5E1" />
             <rect x="250" y="45" width="20" height="6" rx="2" fill="#CBD5E1" />
             
             {/* Chart Area */}
             <g transform="translate(130, 80)">
                <rect width="140" height="80" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                <line x1="10" y1="20" x2="130" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="10" y1="40" x2="130" y2="40" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="10" y1="60" x2="130" y2="60" stroke="#F1F5F9" strokeWidth="1" />
             </g>
         </g>

         {/* 2. LIVE CHART (Visualizing the data change) */}
         <g transform="translate(130, 80)">
             <path d="M10 50 C30 50, 40 45, 60 45 S 80 30, 90 30 S 110 35, 120 25" 
                   fill="none" 
                   stroke="url(#adv-alert-chart)" 
                   strokeWidth="3" 
                   strokeLinecap="round" 
                   strokeLinejoin="round"
             />
             <circle cx="120" cy="25" r="4" fill="#6366F1">
                <animate attributeName="opacity" values="0; 1; 1; 0" dur="4s" repeatCount="indefinite" keyTimes="0; 0.4; 0.8; 1" />
                <animate attributeName="r" values="4; 7; 4" dur="1s" repeatCount="indefinite" />
             </circle>
         </g>

         {/* 3. GMAIL NOTIFICATION CARD (Slides In) */}
         <g filter="url(#adv-alert-shadow)">
            <animateTransform 
               attributeName="transform" 
               type="translate" 
               values="0 -100; 0 0; 0 0; 0 -100" 
               keyTimes="0; 0.3; 0.85; 1"
               dur="4s" 
               repeatCount="indefinite" 
               calcMode="spline"
               keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
            />

            <g transform="translate(125, 40)">
               {/* Card Body */}
               <rect width="150" height="60" rx="12" fill="#FFFFFF" fillOpacity="0.98" />
               <rect width="150" height="60" rx="12" stroke="#E2E8F0" strokeWidth="1" />
               
               {/* Gmail Branding Area */}
               <g transform="translate(12, 12)">
                   {/* Envelope Background */}
                   <rect width="24" height="18" rx="4" fill="#FEE2E2" /> 
                   {/* The Red M */}
                   <path d="M4 5 L12 11 L20 5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
               </g>

               {/* Text Content */}
               <g transform="translate(46, 14)">
                  {/* Row 1: App Name & Time */}
                  <g>
                     <text x="0" y="6" fontFamily="sans-serif" fontSize="9" fontWeight="700" fill="#1E293B">DataPulse Alert</text>
                     <text x="80" y="6" fontFamily="sans-serif" fontSize="8" fill="#94A3B8">Now</text>
                  </g>
                  
                  {/* Row 2: Subject Line */}
                  <text x="0" y="19" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#334155">Schema change</text>
                  
                  {/* Row 3: Preview Text */}
                  <text x="0" y="30" fontFamily="sans-serif" fontSize="8" fill="#64748B">public.users: col "role" </text>
               </g>
            </g>
         </g>

         {/* 4. DYNAMIC ISLAND (Overlays everything) */}
         <rect x="170" y="34" width="60" height="16" rx="8" fill="#1E293B" />

      </g>
    </svg>
  </div>
);

export default AlertIllustration;