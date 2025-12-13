import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, X, Trash2 } from 'lucide-react'; // <--- Added Trash2
import { Notifications } from './Notifications';
import { Chatbot } from './Chatbot';
import { WhatsNewTrigger } from './WhatsNewTrigger';
import { useNavigate } from 'react-router-dom'; // <--- Added for navigation

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate(); // <--- Hook for navigation

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/30">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-md border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left: Your Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <img 
                  src="/DPLogo2.png" 
                  alt="DataPulse Logo" 
                  className="h-8 w-8 object-contain" 
                />
              </div>
              <span className="font-poppins font-bold text-xl text-gray-900 tracking-tight">DataPulse</span>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-3 sm:gap-5">
              
              {/* Action Icons */}
              <div className="flex items-center gap-2">
                
                {/* --- NEW: TRASH ICON --- */}
                <button
                  onClick={() => navigate('/trash')}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
                  title="View Trash"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                {/* ----------------------- */}

                <WhatsNewTrigger />
                <Notifications />
              </div>

              <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

              {/* Profile & Logout */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-800 leading-none">
                        {user?.name || user?.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                        {'User'}
                    </span>
                </div>
                
                <button
                  onClick={() => setShowConfirm(true)}
                  className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow w-full">
        {children}
      </main>

      {/* --- CHATBOT & MODALS --- */}
      <Chatbot />

      {/* Minimal Logout Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-[2px] transition-opacity" 
            onClick={() => setShowConfirm(false)}
          />
          
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Sign Out</h2>
                    <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to end your session?
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors"
                    >
                        Log Out
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};