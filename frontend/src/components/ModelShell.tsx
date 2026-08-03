// components/website-ui/ModalShell.tsx
import React, { useEffect } from 'react';
import { ModalPortal } from './ModalPortal';

interface ModalShellProps {
  children: React.ReactNode;
  onClose?: () => void;
  labelledBy?: string; // id of the heading inside the modal, for screen readers
  maxWidth?: string; // tailwind max-width class, e.g. 'max-w-md' (default) or 'max-w-lg'
}

export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  onClose,
  labelledBy,
  maxWidth = 'max-w-md',
}) => {
  // Lock background scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // NEW: pressing Escape now closes the modal, like every other
    // modal in a real product should behave.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/20 backdrop-blur-sm px-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={onClose}
      >
        <div
          className={`relative w-full ${maxWidth} bg-white rounded-lg border border-slate-200 shadow-overlay`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
};