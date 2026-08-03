// components/website-ui/ConfirmDialog.tsx
import React from 'react';
import { ModalShell } from '../ModelShell';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

/**
 * A reusable "are you sure?" popup. Built on top of ModalShell so every
 * confirmation popup in the app (sign out, delete workspace, etc.) looks
 * and behaves the same way — instead of each one being hand-built.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = true,
}) => {
  return (
    <ModalShell onClose={onCancel} labelledBy="confirm-dialog-title" maxWidth="max-w-[320px]">
      <div className="p-6 text-center">
        <h2
          id="confirm-dialog-title"
          className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2"
        >
          {title}
        </h2>
        <p className="text-xs text-slate-500 mb-6">{description}</p>
        <div className="flex w-full gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-8 rounded-sm border border-slate-200 text-[10px] font-bold text-slate-400 font-manrope tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-8 rounded-sm text-[10px] font-bold text-white font-manrope tracking-widest shadow-sm transition-all active:scale-95 ${
              isDanger ? 'bg-danger-600 hover:bg-danger-700' : 'bg-slate-900 hover:bg-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};