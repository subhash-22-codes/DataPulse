import React from 'react';
import { LucideProps } from 'lucide-react';

interface EmptyStateProps {
  Icon: React.ElementType<LucideProps>;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ Icon, title, message, actionText, onAction }) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">{message}</p>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};