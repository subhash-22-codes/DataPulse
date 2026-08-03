// components/website-ui/IconButtonWithTooltip.tsx
import React from 'react';

interface IconButtonWithTooltipProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  className?: string;
}

/**
 * One small icon button with a hover tooltip underneath it.
 * This replaces the same block of code that was copy-pasted 4 times
 * in Layout.tsx (Trash, Feedback, Account, Logout). Now if we want to
 * change how tooltips look, we change it here once.
 */
export const IconButtonWithTooltip: React.FC<IconButtonWithTooltipProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
  className = '',
}) => {
  const colorClasses =
    variant === 'danger'
      ? 'text-slate-400 hover:text-danger-600'
      : 'text-slate-400 hover:text-slate-900';

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`group relative p-2 rounded-md transition-all ${colorClasses} ${className}`}
    >
      <span className="inline-flex transition-transform group-hover:scale-110">
        {icon}
      </span>

      <span className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-dropdown">
        <span className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5" />
        <span className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
          {label}
        </span>
      </span>
    </button>
  );
};