import type React from "react"
import { useId } from "react"
import type { IllustrationProps } from "../../../types"

/**
 * Production-grade AI Robot illustration.
 * Minimal, scalable, and optimized for modern SaaS applications.
 */
const RobotIllustration: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => {
  const rawId = useId()
  const id = `robot-${rawId.replace(/[:\s]/g, "")}`

  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AI Robot Assistant"
    >
      <defs>
        <linearGradient id={`${id}-head`} x1="100" y1="40" x2="100" y2="160">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <radialGradient id={`${id}-eye-glow`} cx="0.5" cy="0.5">
          <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </radialGradient>

        <radialGradient id={`${id}-antenna`} cx="0.5" cy="0.5">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </radialGradient>

        <filter id={`${id}-shadow`}>
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.15" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id={`${id}-chest`} x1="100" y1="110" x2="100" y2="145">
          <stop offset="0%" stopColor="#E0E7FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
      </defs>

      <line x1="100" y1="48" x2="100" y2="28" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="100" cy="22" r="7" fill={`url(#${id}-antenna)`} />
      <circle cx="100" cy="22" r="3.5" fill="#FFFFFF" opacity="0.6" />

      <g filter={`url(#${id}-shadow)`}>
        <rect x="55" y="48" width="90" height="95" rx="16" fill={`url(#${id}-head)`} stroke="#94A3B8" strokeWidth="2" />
      </g>

      <rect x="47" y="68" width="7" height="55" rx="3.5" fill="#64748B" />
      <rect x="48" y="69" width="2" height="25" rx="1" fill="#CBD5E1" opacity="0.6" />
      <rect x="146" y="68" width="7" height="55" rx="3.5" fill="#64748B" />
      <rect x="150" y="69" width="2" height="25" rx="1" fill="#CBD5E1" opacity="0.6" />

      <rect x="68" y="68" width="30" height="30" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x="102" y="68" width="30" height="30" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />

      <circle cx="83" cy="83" r="10" fill={`url(#${id}-eye-glow)`} />
      <circle cx="117" cy="83" r="10" fill={`url(#${id}-eye-glow)`} />

      {/* Eye highlights for life */}
      <circle cx="80" cy="80" r="3" fill="#FFFFFF" opacity="0.9" />
      <circle cx="114" cy="80" r="3" fill="#FFFFFF" opacity="0.9" />

      <circle cx="83" cy="83" r="5" fill="#1E293B" />
      <circle cx="117" cy="83" r="5" fill="#1E293B" />

      <rect x="68" y="108" width="64" height="2" rx="1" fill="#E2E8F0" />

      <rect
        x="75"
        y="115"
        width="50"
        height="25"
        rx="4"
        fill={`url(#${id}-chest)`}
        stroke="#A5B4FC"
        strokeWidth="1.5"
      />

      {/* Chest details */}
      <circle cx="85" cy="127.5" r="3" fill="#6366F1" opacity="0.7" />
      <circle cx="100" cy="127.5" r="3" fill="#6366F1" opacity="0.7" />
      <circle cx="115" cy="127.5" r="3" fill="#6366F1" opacity="0.7" />

      <rect x="85" y="143" width="30" height="10" rx="3" fill="#94A3B8" />
      <rect x="87" y="144" width="3" height="8" rx="1.5" fill="#CBD5E1" opacity="0.5" />
      <rect x="110" y="144" width="3" height="8" rx="1.5" fill="#CBD5E1" opacity="0.5" />
    </svg>
  )
}

export default RobotIllustration
