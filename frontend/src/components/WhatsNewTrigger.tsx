import React, { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { WhatNewModal } from './WhatNewModal';

// This is the unique ID for our latest batch of updates.
// When you add new features, you will change this string.
const LATEST_UPDATE_ID = 'v1.0-db-connector-and-polish';

export const WhatsNewTrigger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  useEffect(() => {
    // Check localStorage to see if the user has already seen this update.
    const lastSeenUpdate = localStorage.getItem('datapulse_last_seen_update');
    if (lastSeenUpdate !== LATEST_UPDATE_ID) {
      setHasNewUpdate(true);
    }
  }, []);

  const handleOpenModal = () => {
    setIsOpen(true);
    // When the user opens the modal, we mark this update as "seen".
    localStorage.setItem('datapulse_last_seen_update', LATEST_UPDATE_ID);
    setHasNewUpdate(false); // The dot will now disappear.
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-offset-2 transition-colors"
        title="What's New"
      >
        <span className="sr-only">View What's New</span>
        <Gift className="h-6 w-6" />
        {hasNewUpdate && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>

      <WhatNewModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};