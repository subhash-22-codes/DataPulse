import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { WhatNewModal } from './WhatNewModal';

// This is the unique ID for our latest batch of updates.
const LATEST_UPDATE_ID = 'v1.0-db-connector-and-polish';

export const WhatsNewTrigger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  useEffect(() => {
    const lastSeenUpdate = localStorage.getItem('datapulse_last_seen_update');
    if (lastSeenUpdate !== LATEST_UPDATE_ID) {
      setHasNewUpdate(true);
    }
  }, []);

  const handleOpenModal = () => {
    setIsOpen(true);
    localStorage.setItem('datapulse_last_seen_update', LATEST_UPDATE_ID);
    setHasNewUpdate(false);
  };

  return (
    <>
     <button
        onClick={handleOpenModal}
        className={`group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
          hasNewUpdate 
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <span className="sr-only">View Product Updates</span>
        
        <Sparkles 
          className={`w-[18px] h-[18px] transition-transform duration-300 ${hasNewUpdate ? 'fill-blue-200' : 'group-hover:scale-110'}`} 
          strokeWidth={2}
        />

        {/* Micro-Badge: Same size/pos as the Bell dot */}
        {hasNewUpdate && (
          <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
            {/* The Dot: Tiny (8px), no ping, just a sharp, high-contrast finish */}
            <span className="h-2 w-2 rounded-full bg-indigo-600 ring-[1.5px] ring-white shadow-sm"></span>
          </span>
        )}

        {/* Micro-Consistent Tooltip */}
        <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50">
          {/* Tiny Pointer */}
          <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
          
          {/* The Pill: Same text-[9px] and py-0.5 as Archive & Bell */}
          <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
            What's New
          </div>
        </div>
      </button>

      <WhatNewModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};