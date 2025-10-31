import React from 'react';

// --- THIS IS THE FIX ---
// We update the type to allow for undefined or other falsy values.
// The .filter(Boolean) will safely remove them.
const cn = (...classes: (string | undefined | null | false)[]) => 
  classes.filter(Boolean).join(' ');

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
};