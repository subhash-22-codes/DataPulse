import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Gift, Sparkles, Database, ShieldCheck, Palette, Zap, Clock } from 'lucide-react';

interface WhatNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Features list
const features = [
  {
    icon: Database,
    title: "Direct Database Connector",
    description: "Connect DataPulse directly to your PostgreSQL database to run SQL queries on a recurring schedule.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Get AI-generated business analysis on schema changes and chat with an AI assistant to learn about the app.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: Zap,
    title: "Instant & Asynchronous UI",
    description: "OTP emails are now sent in the background, making the UI feel instantaneous. The dashboard updates in real-time via WebSockets.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: ShieldCheck,
    title: "Enhanced Security",
    description: "Implemented professional API rate limiting on all authentication endpoints to prevent abuse and brute-force attacks.",
    color: "text-red-600 bg-red-50",
  },
  {
    icon: Palette,
    title: "Professional UI/UX Polish",
    description: "Added skeleton loaders, animated number counters, and polished empty states for a smoother, more premium user experience.",
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    icon: Clock,
    title: "Timezone-Aware Interface",
    description: "All timestamps throughout the application are now correctly displayed in your local timezone for perfect clarity.",
    color: "text-green-600 bg-green-50",
  },
];

export const WhatNewModal: React.FC<WhatNewModalProps> = ({ isOpen, onClose }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 md:p-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl transform rounded-2xl bg-white shadow-xl overflow-hidden max-h-[calc(100vh-40px)] sm:max-h-[calc(100vh-80px)] md:max-h-[90vh]">
                
                {/* Header */}
                <div className="relative bg-gray-50 p-4 sm:p-6 md:p-8 border-b border-gray-200">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-offset-2"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Gift className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                        What's New in DataPulse
                      </Dialog.Title>
                      <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
                        Discover our latest features and improvements.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div
                  className="p-4 sm:p-6 md:p-8 overflow-y-auto scrollbar-hide"
                  style={{ maxHeight: 'calc(100vh - 40px)' }}
                >
                  <ul className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 sm:gap-x-8 sm:gap-y-6">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 sm:gap-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                          <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base md:text-lg">{feature.title}</h4>
                          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Got It
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
