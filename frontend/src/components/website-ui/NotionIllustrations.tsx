import React from 'react';

interface HeroIllustrationProps {
  className?: string;
}

export const HeroIllustration: React.FC<HeroIllustrationProps> = ({ className = "" }) => (
  <div className={`relative w-full aspect-[3/2] flex items-center justify-center bg-gray-100 ${className}`}>
    <svg
      viewBox="0 0 1200 800"
      className="w-full h-full shadow-2xl rounded-xl overflow-hidden"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ backgroundColor: '#FAFAFA', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      <defs>
        {/* Soft shadow for specific callouts only */}
        <filter id="shadow-sm" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.05" />
        </filter>
        
        {/* Chart fill gradient */}
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>

        <clipPath id="chart-clip">
          <rect x="300" y="270" width="520" height="260" />
        </clipPath>
      </defs>

      {/* ==================== LEFT SIDEBAR ==================== */}
      <rect x="0" y="0" width="240" height="800" fill="#FFFFFF" />
      <line x1="240" y1="0" x2="240" y2="800" stroke="#E5E7EB" strokeWidth="1" />

      {/* Brand */}
      <g transform="translate(24, 32)">
        <rect x="0" y="0" width="24" height="24" rx="6" fill="#2563EB" />
        <path d="M7 12h2v5H7zm4-4h2v9h-2zm4 2h2v7h-2z" fill="#FFFFFF" />
        <text x="36" y="17" fontSize="16" fontWeight="600" fill="#111827">DataPulse</text>
      </g>

      {/* Navigation bar */}
      <g transform="translate(16, 88)">
        {/* Active Item */}
        <rect x="0" y="0" width="208" height="36" rx="6" fill="#EFF6FF" />
        <text x="36" y="23" fontSize="14" fontWeight="500" fill="#2563EB">Dashboard</text>
        
        {/* Inactive Items */}
        <g fill="#6B7280" fontSize="14" fontWeight="500">
          <text x="36" y="67">Workspaces</text>
          <text x="36" y="111">Alerts</text>
          <text x="36" y="155">Incidents</text>
          <text x="36" y="199">Sources</text>
          
          <text x="12" y="259" fontSize="12" fontWeight="600" fill="#9CA3AF" letterSpacing="0.5">ADMIN</text>
          <text x="36" y="291">Team</text>
          <text x="36" y="335">Settings</text>
        </g>
        
        {/* Nav Icons (Simplified dots for representation) */}
        <g fill="#9CA3AF">
          <rect x="12" y="55" width="12" height="12" rx="2" />
          <rect x="12" y="99" width="12" height="12" rx="2" />
          <rect x="12" y="143" width="12" height="12" rx="2" />
          <rect x="12" y="187" width="12" height="12" rx="2" />
          
          <rect x="12" y="279" width="12" height="12" rx="2" />
          <rect x="12" y="323" width="12" height="12" rx="2" />
        </g>
        <rect x="12" y="11" width="12" height="12" rx="2" fill="#3B82F6" />
      </g>

      {/* User Profile (Bottom) */}
      <g transform="translate(16, 736)">
        <line x1="0" y1="-16" x2="208" y2="-16" stroke="#E5E7EB" strokeWidth="1" />
        <circle cx="20" cy="20" r="16" fill="#E5E7EB" />
        <text x="48" y="16" fontSize="14" fontWeight="500" fill="#111827">User Name</text>
        <text x="48" y="32" fontSize="12" fill="#6B7280">Admin</text>
      </g>

      {/* ==================== TOP BAR ==================== */}
      <g transform="translate(240, 0)">
        <rect x="0" y="0" width="960" height="64" fill="#FFFFFF" />
        <line x1="0" y1="64" x2="960" y2="64" stroke="#E5E7EB" strokeWidth="1" />
        
        <text x="40" y="38" fontSize="18" fontWeight="600" fill="#111827">Workspace: W_Space</text>
        
        {/* Status Badge */}
        <g transform="translate(230, 24)">
          <rect x="0" y="0" width="60" height="24" rx="12" fill="#ECFDF5" stroke="#D1FAE5" strokeWidth="1" />
          <circle cx="12" cy="12" r="4" fill="#10B981" />
          <text x="24" y="16" fontSize="12" fontWeight="500" fill="#065F46">Live</text>
        </g>

        {/* Global Search / Actions (Right aligned) */}
        <rect x="740" y="16" width="180" height="32" rx="6" fill="#F3F4F6"  stroke="#E5E7EB" />
        <text x="752" y="36" fontSize="13" fill="#9CA3AF">Search...</text>
      </g>

      {/* ==================== MAIN CONTENT ==================== */}
      {/* 4 Metric Cards Row (X: 280, 495, 710, 925 - Width: 195, Gap: 20) */}
      <g transform="translate(0, 96)">
        {/* Card 1 */}
        <g transform="translate(280, 0)">
          <rect width="195" height="100" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" filter="url(#shadow-sm)" />
          <text x="20" y="32" fontSize="13" fontWeight="500" fill="#6B7280">Total Rows</text>
          <text x="20" y="64" fontSize="28" fontWeight="600" fill="#111827">300,320</text>
          <text x="20" y="84" fontSize="13" fontWeight="500" fill="#10B981">+6% this week</text>
        </g>
        
        {/* Card 2 */}
        <g transform="translate(495, 0)">
          <rect width="195" height="100" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" filter="url(#shadow-sm)" />
          <text x="20" y="32" fontSize="13" fontWeight="500" fill="#6B7280">Columns</text>
          <text x="20" y="64" fontSize="28" fontWeight="600" fill="#111827">12</text>
          <text x="20" y="84" fontSize="13" fontWeight="500" fill="#6B7280">No Change</text>
        </g>

        {/* Card 3 */}
        <g transform="translate(710, 0)">
          <rect width="195" height="100" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" filter="url(#shadow-sm)" />
          <text x="20" y="32" fontSize="13" fontWeight="500" fill="#6B7280">Schema Status</text>
          <text x="20" y="64" fontSize="28" fontWeight="600" fill="#2563EB">Stable</text>
          <text x="20" y="84" fontSize="13" fontWeight="500" fill="#6B7280">Last synced 2m ago</text>
        </g>

        {/* Card 4 */}
        <g transform="translate(925, 0)">
          <rect width="195" height="100" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" filter="url(#shadow-sm)" />
          <text x="20" y="32" fontSize="13" fontWeight="500" fill="#6B7280">System Health</text>
          <text x="20" y="64" fontSize="28" fontWeight="600" fill="#111827">99.9%</text>
          <text x="20" y="84" fontSize="13" fontWeight="500" fill="#10B981">Optimal</text>
        </g>
      </g>

      {/* Main Chart Area (X: 280, Y: 220, Width: 560, Height: 380) */}
      <g transform="translate(280, 216)">
        <rect width="560" height="380" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        <text x="24" y="32" fontSize="16" fontWeight="600" fill="#111827">Data Health Trend</text>
        <text x="24" y="52" fontSize="13" fill="#6B7280">Over the last 15 days</text>
        
        {/* Chart Grid */}
        <g stroke="#F3F4F6" strokeWidth="1">
          <line x1="24" y1="100" x2="536" y2="100" />
          <line x1="24" y1="160" x2="536" y2="160" />
          <line x1="24" y1="220" x2="536" y2="220" />
          <line x1="24" y1="280" x2="536" y2="280" />
          <line x1="24" y1="340" x2="536" y2="340" />
        </g>

        {/* Y-Axis Labels */}
        <g fill="#9CA3AF" fontSize="11" textAnchor="end">
          <text x="16" y="104">100</text>
          <text x="16" y="164">75</text>
          <text x="16" y="224">50</text>
          <text x="16" y="284">25</text>
          <text x="16" y="344">0</text>
        </g>

        {/* The Graph Line & Fill */}
        <path 
          d="M 24 320 C 100 320, 150 120, 220 150 C 300 180, 350 280, 420 220 C 480 160, 500 120, 536 140 L 536 340 L 24 340 Z" 
          fill="url(#chart-fill)" 
        />
        <path 
          d="M 24 320 C 100 320, 150 120, 220 150 C 300 180, 350 280, 420 220 C 480 160, 500 120, 536 140" 
          stroke="#2563EB" 
          strokeWidth="3" 
          strokeLinecap="round" 
          fill="none" 
        />
        
        {/* Data Point Marker */}
        <circle cx="420" cy="220" r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
        <rect x="385" y="170" width="70" height="28" rx="4" fill="#111827" />
        <text x="420" y="188" fontSize="12" fontWeight="500" fill="#FFFFFF" textAnchor="middle">Anomaly</text>
        {/* Tooltip triangle */}
        <path d="M416 198 L424 198 L420 203 Z" fill="#111827" />
      </g>

      {/* Right Column Panels (X: 860, Y: 216, Width: 260) */}
      <g transform="translate(860, 216)">
        
        {/* Column Health Panel */}
        <rect width="260" height="210" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        <text x="20" y="32" fontSize="14" fontWeight="600" fill="#111827">Column Health</text>
        
        <g transform="translate(20, 60)" fontSize="13" fill="#374151">
          {/* Item 1 */}
          <text x="0" y="0">order_id</text>
          <circle cx="210" cy="-4" r="4" fill="#10B981" />
          <text x="220" y="0" fontSize="12" fill="#6B7280">OK</text>
          <line x1="0" y1="12" x2="220" y2="12" stroke="#F3F4F6" strokeWidth="1" />

          {/* Item 2 */}
          <text x="0" y="32">user_id</text>
          <circle cx="210" cy="28" r="4" fill="#10B981" />
          <text x="220" y="32" fontSize="12" fill="#6B7280">OK</text>
          <line x1="0" y1="44" x2="220" y2="44" stroke="#F3F4F6" strokeWidth="1" />

          {/* Item 3 */}
          <text x="0" y="64">price</text>
          <circle cx="210" cy="60" r="4" fill="#10B981" />
          <text x="220" y="64" fontSize="12" fill="#6B7280">OK</text>
          <line x1="0" y1="76" x2="220" y2="76" stroke="#F3F4F6" strokeWidth="1" />

          {/* Item 4 */}
          <text x="0" y="96" fontWeight="500">delivery_date</text>
          <circle cx="190" cy="92" r="4" fill="#F59E0B" />
          <text x="200" y="96" fontSize="12" fill="#F59E0B" fontWeight="500">Warn</text>
          <line x1="0" y1="108" x2="220" y2="108" stroke="#F3F4F6" strokeWidth="1" />

          {/* Item 5 */}
          <text x="0" y="128">quantity</text>
          <circle cx="210" cy="124" r="4" fill="#10B981" />
          <text x="220" y="128" fontSize="12" fill="#6B7280">OK</text>
        </g>

        {/* Recent Incidents Panel */}
        <g transform="translate(0, 230)">
          <rect width="260" height="150" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <text x="20" y="32" fontSize="14" fontWeight="600" fill="#111827">Recent Incidents</text>
          
          <g transform="translate(20, 60)" fontSize="13" fill="#374151">
            <text x="0" y="0">Missing Column</text>
            <text x="220" y="0" fontSize="12" fill="#9CA3AF" textAnchor="end">2h ago</text>
            <line x1="0" y1="12" x2="220" y2="12" stroke="#F3F4F6" strokeWidth="1" />

            <text x="0" y="36">Row Count Drop</text>
            <text x="220" y="36" fontSize="12" fill="#9CA3AF" textAnchor="end">5h ago</text>
            <line x1="0" y1="48" x2="220" y2="48" stroke="#F3F4F6" strokeWidth="1" />

            <text x="0" y="72">Schema Drift</text>
            <text x="220" y="72" fontSize="12" fill="#9CA3AF" textAnchor="end">1d ago</text>
          </g>
        </g>
      </g>

      {/* Bottom Area (X: 280, Y: 616) */}
      <g transform="translate(280, 616)">
        
        {/* Data Sources Panel */}
        <rect width="560" height="140" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        <text x="24" y="32" fontSize="14" fontWeight="600" fill="#111827">Active Data Sources</text>
        
        <g transform="translate(24, 60)">
          {/* Source 1 */}
          <rect x="0" y="0" width="160" height="56" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
          <text x="16" y="32" fontSize="13" fontWeight="500" fill="#374151">CSV Files</text>
          <circle cx="140" cy="28" r="4" fill="#10B981" />

          {/* Source 2 */}
          <rect x="176" y="0" width="160" height="56" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
          <text x="192" y="32" fontSize="13" fontWeight="500" fill="#374151">REST APIs</text>
          <circle cx="316" cy="28" r="4" fill="#10B981" />

          {/* Source 3 */}
          <rect x="352" y="0" width="160" height="56" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
          <text x="368" y="32" fontSize="13" fontWeight="500" fill="#374151">PostgreSQL</text>
          <circle cx="492" cy="28" r="4" fill="#10B981" />
        </g>
      </g>

      {/* Smart Alert Panel (Bottom Right) */}
      <g transform="translate(860, 616)">
        <rect width="260" height="140" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        <rect x="0" y="0" width="260" height="4" fill="#F59E0B" clipPath="inset(0 0 0 0 round 8px 8px 0 0)" />
        
        <text x="20" y="32" fontSize="14" fontWeight="600" fill="#111827">Smart Alert</text>
        <circle cx="230" cy="28" r="12" fill="#FEF3C7" />
        <path d="M230 22v6m0 4h.01" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        
        <text x="20" y="60" fontSize="13" fill="#4B5563">
          <tspan x="20" dy="0">Anomaly detected: </tspan>
          <tspan x="20" dy="20" fontWeight="600" fill="#111827">order_id exceeds threshold</tspan>
          <tspan x="20" dy="20">Review suggested limits.</tspan>
        </text>
        
        <rect x="20" y="104" width="80" height="24" rx="4" fill="#F3F4F6" />
        <text x="60" y="120" fontSize="12" fontWeight="500" fill="#374151" textAnchor="middle">Review</text>
      </g>

    </svg>
  </div>
);