import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";

interface WhatNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    title: "Direct Database Connector",
    description: "Connect directly to PostgreSQL and run scheduled SQL queries.",
    tag: "NEW",
  },
  {
    title: "AI Assistance",
    description: "Get explanations for schema changes and contextual usage help.",
    tag: "BETA",
  },
  {
    title: "Real-time Updates",
    description: "Background jobs and WebSockets keep data in sync instantly.",
    tag: "PERF",
  },
  {
    title: "Security Improvements",
    description: "Rate limiting added to authentication endpoints.",
    tag: "SEC",
  },
  {
    title: "UI Refinements",
    description: "Subtle layout and typography improvements across the app.",
    tag: "UX",
  },
  {
    title: "Timezone Accuracy",
    description: "All timestamps now respect your local timezone.",
    tag: "FIX",
  },
];

export const WhatNewModal: React.FC<WhatNewModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          {/* RESPONSIVE CONTAINER: 
            p-4 ensures the modal never touches the mobile screen edges.
            items-center centers it vertically.
          */}
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-95"
            >
              {/* MODAL PANEL:
                w-full + max-w-md: Ensures it's wide on mobile but stops getting too big on desktop.
                mx-auto: Centers it perfectly.
              */}
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left shadow-xl ring-1 ring-black/5 transition-all">
                
                {/* Header: Compact padding on mobile (px-4), slightly more on desktop if needed */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4 py-3">
                  <div className="flex items-baseline gap-3">
                    <Dialog.Title
                      as="h3"
                      className="text-sm font-semibold text-gray-900"
                    >
                      Release Notes
                    </Dialog.Title>
                    <span className="font-mono text-xs text-gray-500">
                      v1.0.0
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Content: Adjusted height for mobile screens */}
                <div className="max-h-[60vh] overflow-y-auto px-4 py-2 custom-scrollbar">
                  <ul className="divide-y divide-gray-100">
                    {features.map((feature, idx) => (
                      <li key={idx} className="py-3">
                        {/* Flex-col on tiny screens, Row on normal screens? 
                            Actually, keeping it row works best for density unless text is huge. */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-900">
                              {feature.title}
                            </p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>

                          <span className="flex-shrink-0 rounded-[3px] border border-gray-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                            {feature.tag}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 flex justify-end">
                  <button
                    type="button"
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-gray-200 focus:ring-offset-1"
                    onClick={onClose}
                  >
                    Close
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