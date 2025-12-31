// components/ModalShell.tsx
import { useEffect } from 'react';
import { ModalPortal } from './ModalPortal';

interface ModalShellProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  onClose,
}) => {
  // Lock background scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <ModalPortal>
      <div
        className="
          fixed inset-0 z-[9999]
          flex items-center justify-center
          bg-slate-900/50
          px-4
        "
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="
            relative
            w-full max-w-md
            bg-white
            rounded-lg
            border border-slate-200
            shadow-xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
};
