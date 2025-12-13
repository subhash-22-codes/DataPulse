import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Sparkles, Database, ShieldCheck, Palette, Zap, Clock, FileText, CheckCircle2 } from 'lucide-react';

interface WhatNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: Database,
    title: "Direct Database Connector",
    description: "Connect DataPulse directly to your PostgreSQL database to run SQL queries on a recurring schedule.",
    tag: "NEW FEATURE",
    tagStyle: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Assistance", 
    description: "Receive AI explanations for why your data structure changed, and ask our smart assistant for instant help on how to use DataPulse.",
    tag: "AI BETA",
    tagStyle: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    icon: Zap,
    title: "Instant UI Updates",
    description: "OTP emails are now sent in the background. The dashboard updates in real-time via WebSockets.",
    tag: "PERFORMANCE",
    tagStyle: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: ShieldCheck,
    title: "Enhanced Security",
    description: "Implemented professional API rate limiting on all authentication endpoints to prevent brute-force attacks.",
    tag: "SECURITY",
    tagStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Palette,
    title: "Visual Improvements",
    description: "We've polished the interface for a smoother, faster, and more modern experience.",
    tag: "IMPROVEMENT",
    tagStyle: "bg-gray-50 text-gray-700 border-gray-200",
  },
  {
    icon: Clock,
    title: "Timezone Clarity",
    description: "All timestamps throughout the application are now correctly displayed in your local timezone.",
    tag: "FIX",
    tagStyle: "bg-gray-50 text-gray-700 border-gray-200",
  },
];

export const WhatNewModal: React.FC<WhatNewModalProps> = ({ isOpen, onClose }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        
        {/* BACKDROP: Removed blur for 60fps performance. Using a clean dark overlay. */}
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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              {/* PANEL: Added max-h and flex-col for sticky header/footer behavior */}
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all ring-1 ring-black/5 flex flex-col max-h-[85vh]">
                
                {/* 1. HEADER (Fixed at top) */}
                {/* Added a subtle radial gradient for that "premium paper" feel */}
                <div className="relative px-8 pt-8 pb-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] border-b border-gray-100 flex-shrink-0 z-10 bg-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-mono font-medium text-gray-600 shadow-sm">
                                    <FileText className="w-3 h-3 text-gray-500" />
                                    v1.1.0 Release
                                </span>
                                <span className="text-xs text-gray-400 font-medium">December 5, 2025</span>
                            </div>
                            <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 tracking-tight">
                                What's New
                            </Dialog.Title>
                            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                                We've shipped major improvements to connectivity and security.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. CONTENT (Scrollable area) */}
                <div className="px-8 py-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                  <div className="relative">
                    
                    {/* Continuous vertical line */}
                    <div className="absolute left-6 top-2 bottom-2 w-px bg-gray-100" />

                    <div className="space-y-8">
                        {features.map((feature, index) => (
                        <div key={index} className="relative flex gap-6 group">
                            
                            {/* Icon Bubble - Slightly lifted */}
                            <div className="relative z-10 flex-shrink-0">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:border-blue-200 group-hover:scale-105 transition-all duration-300">
                                    <feature.icon className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 pt-1.5">
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-sm font-bold text-gray-900">
                                        {feature.title}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${feature.tagStyle}`}>
                                        {feature.tag}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* 3. FOOTER (Fixed at bottom) */}
                <div className="px-8 py-5 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>All systems operational</span>
                    </div>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 hover:shadow-md transition-all active:scale-95"
                        onClick={onClose}
                    >
                        Got it
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