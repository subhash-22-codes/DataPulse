import React from 'react';
import { IllustrationProps } from '../../../types';

const DirectDbIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${className}`}>
    <svg
      viewBox="0 0 600 320"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* ── BACKGROUND & EFFECTS ── */}
        <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        
        <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0F172A" floodOpacity="0.06" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.04" />
        </filter>

        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glass-blur">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>

        {/* ── DATABASE GRADIENTS ── */}
        <linearGradient id="db-surface" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="db-highlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="db-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="neon-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* ── DATA STREAM GRADIENTS ── */}
        <linearGradient id="stream-track" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="15%" stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="85%" stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>

        {/* ── DASHBOARD GRADIENTS ── */}
        <linearGradient id="dash-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ════════════════════════════════════════════════
          BACKGROUND AMBIENCE
      ════════════════════════════════════════════════ */}
      <circle cx="300" cy="160" r="250" fill="url(#bg-glow)" />
      
      {/* Premium subtle grid */}
      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="15" cy="15" r="1" fill="#CBD5E1" opacity="0.3" />
      </pattern>
      <rect width="600" height="320" fill="url(#grid)" />

      {/* ════════════════════════════════════════════════
          CENTER: FIBER OPTIC DATA STREAM
      ════════════════════════════════════════════════ */}
      <g transform="translate(140, 160)">
        {/* Core track */}
        <path d="M 0 0 C 100 0, 200 0, 280 0" stroke="url(#stream-track)" strokeWidth="16" strokeLinecap="round" />
        <path d="M 0 0 C 100 0, 200 0, 280 0" stroke="#DBEAFE" strokeWidth="4" strokeLinecap="round" opacity="0.5" />

        {/* Animated glowing pulses */}
        <path d="M 0 -4 C 100 -4, 200 -4, 280 -4" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 120" filter="url(#neon-glow)">
          <animate attributeName="stroke-dashoffset" from="160" to="0" dur="1.5s" repeatCount="indefinite" />
        </path>
        <path d="M 0 0 C 100 0, 200 0, 280 0" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="20 80" filter="url(#neon-glow)">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" repeatCount="indefinite" />
        </path>
        <path d="M 0 4 C 100 4, 200 4, 280 4" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="60 160" filter="url(#neon-glow)">
          <animate attributeName="stroke-dashoffset" from="220" to="0" dur="2s" repeatCount="indefinite" />
        </path>

        {/* ── Floating Crypto Shield ── */}
        <g transform="translate(140, 0)" filter="url(#premium-shadow)">
          <circle cx="0" cy="0" r="28" fill="#FFFFFF" fillOpacity="0.9" stroke="#E2E8F0" strokeWidth="1" />
          <circle cx="0" cy="0" r="22" fill="#F8FAFC" />
          <circle cx="0" cy="0" r="22" stroke="url(#neon-ring)" strokeWidth="1.5" opacity="0.3" />
          
          {/* Shield Icon */}
          <path d="M0 -10 L10 -5 V2 C10 8 5 12 0 14 C-5 12 -10 8 -10 2 V-5 L0 -10 Z" fill="url(#neon-ring)" />
          {/* Lock inside shield */}
          <rect x="-3" y="-1" width="6" height="5" rx="1" fill="#FFFFFF" />
          <path d="M-2 -1 V-3 C-2 -4.1 -1.1 -5 0 -5 C1.1 -5 2 -4.1 2 -3 V-1" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
          
          {/* Subtle orbiting particles */}
          <g>
            <circle cx="0" cy="-34" r="2" fill="#3B82F6" filter="url(#neon-glow)" />
            <circle cx="0" cy="34" r="2" fill="#3B82F6" filter="url(#neon-glow)" />
            <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="8s" repeatCount="indefinite" />
          </g>
        </g>
      </g>

      {/* ════════════════════════════════════════════════
          LEFT: MULTI-LAYER POSTGRES STACK
      ════════════════════════════════════════════════ */}
      <g transform="translate(50, 100)" filter="url(#premium-shadow)">
        {/* Layer 3 (Bottom) */}
        <g transform="translate(0, 70)">
          <path d="M 0 16 C 0 32, 90 32, 90 16 L 90 -16 C 90 0, 0 0, 0 -16 Z" fill="url(#db-surface)" />
          <ellipse cx="45" cy="-16" rx="45" ry="16" fill="url(#db-top)" stroke="#334155" strokeWidth="1" />
        </g>
        
        {/* Glowing Data Ring */}
        <ellipse cx="45" cy="50" rx="46" ry="17" fill="none" stroke="url(#neon-ring)" strokeWidth="2" filter="url(#neon-glow)" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
        </ellipse>

        {/* Layer 2 (Middle) */}
        <g transform="translate(0, 35)">
          <path d="M 0 16 C 0 32, 90 32, 90 16 L 90 -16 C 90 0, 0 0, 0 -16 Z" fill="url(#db-surface)" />
          <ellipse cx="45" cy="-16" rx="45" ry="16" fill="url(#db-top)" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Glowing Data Ring */}
        <ellipse cx="45" cy="15" rx="46" ry="17" fill="none" stroke="url(#neon-ring)" strokeWidth="2" filter="url(#neon-glow)" opacity="0.6">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="4s" repeatCount="indefinite" />
        </ellipse>

        {/* Layer 1 (Top) */}
        <g transform="translate(0, 0)">
          <path d="M 0 16 C 0 32, 90 32, 90 16 L 90 -40 C 90 -24, 0 -24, 0 -40 Z" fill="url(#db-highlight)" />
          <ellipse cx="45" cy="-40" rx="45" ry="16" fill="url(#db-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="45" cy="-40" rx="35" ry="10" fill="none" stroke="#64748B" strokeWidth="0.5" opacity="0.5" />
          
          {/* Subtle Postgres Elephant Logo on Top */}
          <g transform="translate(33, -50)" stroke="#94A3B8" strokeWidth="1.2" fill="none" opacity="0.6">
            <path d="M7 14 C7 14 5 13 5 10 C5 6.5 7.5 4 11 4 C14.5 4 16.5 6.5 16.5 9.5 C16.5 12 15 13.5 13 14" strokeLinecap="round" />
            <path d="M7 12 C6 13 5 15 6.5 16.5 C7 17.5 8 17 8 16" strokeLinecap="round" />
            <circle cx="12" cy="8.5" r="1" fill="#94A3B8" />
          </g>
        </g>

        {/* Floating Tag (WIDENED & CENTERED) */}
        <g transform="translate(45, 120)">
          <rect x="-50" y="0" width="100" height="24" rx="12" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <circle cx="-32" cy="12" r="3.5" fill="#3B82F6" filter="url(#neon-glow)" />
          <text x="-18" y="15.5" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="10" fontWeight="600" fill="#E2E8F0" letterSpacing="0.5">
            PostgreSQL
          </text>
        </g>
      </g>

      {/* ════════════════════════════════════════════════
          RIGHT: HIGH-END DASHBOARD UI
      ════════════════════════════════════════════════ */}
      <g transform="translate(400, 60)" filter="url(#premium-shadow)">
        {/* Main Glass Panel */}
        <rect width="180" height="210" rx="16" fill="url(#dash-surface)" stroke="#E2E8F0" strokeWidth="1.5" />
        
        {/* Top Header */}
        <path d="M 1.5 16 C 1.5 8 8 1.5 16 1.5 L 164 1.5 C 172 1.5 178.5 8 178.5 16 L 178.5 36 L 1.5 36 Z" fill="#F8FAFC" />
        <line x1="0" y1="36" x2="180" y2="36" stroke="#F1F5F9" strokeWidth="1.5" />
        
        {/* macOS Style Window Dots */}
        <circle cx="18" cy="18" r="4" fill="#E2E8F0" />
        <circle cx="32" cy="18" r="4" fill="#E2E8F0" />
        <circle cx="46" cy="18" r="4" fill="#E2E8F0" />
        
        {/* Live Badge */}
        <g transform="translate(118, 12)">
          <rect width="46" height="16" rx="8" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />
          <circle cx="10" cy="8" r="2.5" fill="#10B981" filter="url(#neon-glow)">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="26" y="11.5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="7" fontWeight="800" fill="#047857" letterSpacing="0.5">
            LIVE
          </text>
        </g>

        {/* Inner Content Area */}
        <g transform="translate(16, 52)">
          <text x="0" y="0" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="10" fontWeight="700" fill="#0F172A">
            Data Pulse
          </text>
          <text x="0" y="14" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="8" fontWeight="500" fill="#64748B">
            Real-time synchronization
          </text>

          {/* Premium Skeleton Rows */}
          <g transform="translate(0, 30)">
            {/* Row 1 */}
            <rect x="0" y="0" width="148" height="24" rx="6" fill="#F8FAFC" stroke="#F1F5F9" strokeWidth="1" />
            <rect x="8" y="8" width="8" height="8" rx="2" fill="#3B82F6" opacity="0.2" />
            <rect x="24" y="10" width="40" height="4" rx="2" fill="#CBD5E1" />
            <rect x="70" y="10" width="20" height="4" rx="2" fill="#E2E8F0" />
            <circle cx="134" cy="12" r="4" fill="#10B981" />

            {/* Row 2 */}
            <rect x="0" y="32" width="148" height="24" rx="6" fill="#F8FAFC" stroke="#F1F5F9" strokeWidth="1" />
            <rect x="8" y="40" width="8" height="8" rx="2" fill="#3B82F6" opacity="0.2" />
            <rect x="24" y="42" width="60" height="4" rx="2" fill="#CBD5E1" />
            <circle cx="134" cy="44" r="4" fill="#10B981" />

            {/* Row 3 (Syncing state) */}
            <rect x="0" y="64" width="148" height="24" rx="6" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
            <rect x="8" y="72" width="8" height="8" rx="2" fill="#3B82F6" />
            <rect x="24" y="74" width="50" height="4" rx="2" fill="#93C5FD" />
            <circle cx="134" cy="76" r="4" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="6 4">
              <animateTransform attributeName="transform" type="rotate" from="0 134 76" to="360 134 76" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Mini Glowing Area Chart */}
          <g transform="translate(0, 140)">
            <path d="M 0 15 Q 20 10, 40 18 T 80 5 T 120 12 T 148 0 L 148 20 L 0 20 Z" fill="url(#chart-fill)" />
            <path d="M 0 15 Q 20 10, 40 18 T 80 5 T 120 12 T 148 0" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            <circle cx="80" cy="5" r="3" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2" filter="url(#neon-glow)" />
          </g>
        </g>
      </g>
    </svg>
  </div>
);

export default DirectDbIllustration;