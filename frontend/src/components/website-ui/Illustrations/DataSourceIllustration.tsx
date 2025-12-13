import React, { useId } from 'react';
import { IllustrationProps } from '../../../types';

const DataSourceIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId();
  const id = `server-rack-prod-${rawId.replace(/[:\s]/g, '')}`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Server Rack Data Source"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* --- 1. FILTERS --- */}
        {/* Soft Ambient Shadow */}
        <filter id={`${id}-shadow-ground`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#0F172A" floodOpacity="0.4" />
          <feComposite operator="in" in2="blur" />
          <feComposite operator="over" in="SourceGraphic" />
        </filter>

        {/* LED Glow (Bloom) */}
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
           <feGaussianBlur stdDeviation="1.5" result="blur" />
           <feComposite operator="over" in="SourceGraphic" in2="blur" />
        </filter>

        {/* --- 2. GRADIENTS --- */}
        {/* Side Panel (Dark Matte Metal) */}
        <linearGradient id={`${id}-grad-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" /> {/* Slate 700 */}
          <stop offset="100%" stopColor="#0F172A" /> {/* Slate 900 */}
        </linearGradient>

        {/* Front Face (Interface Panel) */}
        <linearGradient id={`${id}-grad-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" /> {/* Slate 600 */}
          <stop offset="100%" stopColor="#1E293B" /> {/* Slate 800 */}
        </linearGradient>

        {/* Top Cap (Catching Top Light) */}
        <linearGradient id={`${id}-grad-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#64748B" /> {/* Slate 500 */}
          <stop offset="100%" stopColor="#475569" /> {/* Slate 600 */}
        </linearGradient>

        {/* Drive Bay Inset (Recessed) */}
        <linearGradient id={`${id}-grad-bay`} x1="0" y1="0" x2="1" y2="0">
           <stop offset="0%" stopColor="#0F172A" />
           <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* --- 3. PATTERNS --- */}
        {/* Side Ventilation Mesh */}
        <pattern id={`${id}-pat-mesh`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <circle cx="2" cy="2" r="0.8" fill="#000" fillOpacity="0.3" />
        </pattern>
      </defs>

      {/* --- GROUND SHADOW --- */}
      <ellipse 
        cx="32" cy="56" rx="18" ry="6" 
        fill="none" filter={`url(#${id}-shadow-ground)`} 
      />

      {/* --- THE TOWER STRUCTURE (Isometric) --- */}
      
      {/* 1. Left Side Panel (Structural + Mesh) */}
      <g>
          <path 
            d="M16 18 L 32 26 V 54 L 16 46 Z" 
            fill={`url(#${id}-grad-side)`} 
            stroke="#1E293B" strokeWidth="0.5"
          />
          {/* Mesh Overlay */}
          <path 
             d="M16 18 L 32 26 V 54 L 16 46 Z" 
             fill={`url(#${id}-pat-mesh)`} opacity="0.6"
          />
          {/* Edge Highlight (Corner) */}
          <line x1="16" y1="18" x2="16" y2="46" stroke="#475569" strokeWidth="0.5" />
      </g>

      {/* 2. Right Front Face (The Interface) */}
      <g>
          <path 
            d="M32 26 L 48 18 V 46 L 32 54 Z" 
            fill={`url(#${id}-grad-front)`} 
            stroke="#1E293B" strokeWidth="0.5"
          />
          
          {/* --- HOT SWAP DRIVE BAYS --- */}
          {/* We skew these to match the isometric perspective roughly */}
          <g transform="translate(32, 26)">
             {/* Bay 1 */}
             <path d="M4 2 L 12 -2 V 3 L 4 7 Z" fill={`url(#${id}-grad-bay)`} stroke="#1E293B" strokeWidth="0.2"/>
             {/* Status Light Bay 1 */}
             <circle cx="11" cy="0" r="0.8" fill="#10B981" filter={`url(#${id}-glow)`} />

             {/* Bay 2 */}
             <path d="M4 8 L 12 4 V 9 L 4 13 Z" fill={`url(#${id}-grad-bay)`} stroke="#1E293B" strokeWidth="0.2"/>
             <circle cx="11" cy="6" r="0.8" fill="#10B981" filter={`url(#${id}-glow)`} />

             {/* Bay 3 */}
             <path d="M4 14 L 12 10 V 15 L 4 19 Z" fill={`url(#${id}-grad-bay)`} stroke="#1E293B" strokeWidth="0.2"/>
             {/* Busy Light (Amber) */}
             <circle cx="11" cy="12" r="0.8" fill="#F59E0B" filter={`url(#${id}-glow)`} />
             
             {/* Bay 4 */}
             <path d="M4 20 L 12 16 V 21 L 4 25 Z" fill={`url(#${id}-grad-bay)`} stroke="#1E293B" strokeWidth="0.2"/>
             <circle cx="11" cy="18" r="0.8" fill="#10B981" filter={`url(#${id}-glow)`} />
          </g>
      </g>

      {/* 3. Top Cap (The Lid) */}
      <g>
          <path 
            d="M16 18 L 32 10 L 48 18 L 32 26 Z" 
            fill={`url(#${id}-grad-top)`} 
            stroke="#475569" strokeWidth="0.5"
          />
          {/* Power Button Detail */}
          <ellipse cx="32" cy="18" rx="3" ry="1.5" fill="#1E293B" opacity="0.5" />
          <circle cx="32" cy="18" r="0.8" fill="#06B6D4" filter={`url(#${id}-glow)`} />
      </g>

      {/* --- FINISHING TOUCHES --- */}

      {/* Rim Lighting (High contrast white stroke on top edges) */}
      <path d="M16 18 L 32 10 L 48 18" stroke="white" strokeWidth="1" strokeOpacity="0.4" fill="none" />
      
      {/* Central Spine Highlight */}
      <line x1="32" y1="26" x2="32" y2="54" stroke="black" strokeOpacity="0.3" strokeWidth="1" />
      <line x1="32" y1="26" x2="32" y2="54" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" transform="translate(-0.5, 0)"/>

    </svg>
  );
}

export default DataSourceIllustration;