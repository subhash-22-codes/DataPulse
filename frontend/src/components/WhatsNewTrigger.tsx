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
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title="What's New in DataPulse"
      >
        <span className="sr-only">View Product Updates</span>
        
        {/* Using Sparkles implies "Polish & Features" instead of "Gifts" */}
        <Sparkles 
            className={`w-5 h-5 transition-transform duration-300 ${hasNewUpdate ? 'fill-blue-200' : 'group-hover:scale-110'}`} 
            strokeWidth={2}
        />

        {hasNewUpdate && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            {/* The Ping Animation - softer blue */}
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            
            {/* The Dot - Solid blue with a white border to make it 'pop' against the icon */}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 ring-2 ring-white"></span>
          </span>
        )}
      </button>

      <WhatNewModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};