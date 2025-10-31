import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, X } from 'lucide-react';
import { Notifications } from './Notifications';
import { Chatbot } from './Chatbot';
import { WhatsNewTrigger } from './WhatsNewTrigger';
interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo */}
            <div className="flex items-center space-x-2">
              <img src="/DPLogo2.png" alt="DataPulse Logo" className="h-8 w-8" />
              <span className="font-bold text-xl text-gray-800">DataPulse</span>
            </div>

            {/* Right: User */}
            <div className="flex items-center space-x-4">
              <WhatsNewTrigger />

              <Notifications />
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-3 hidden sm:block">
                  Hello, {user?.name || user?.email}
                </span>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main>{children}</main>

      {/* --- ADD THE CHATBOT COMPONENT HERE --- */}
      <Chatbot />

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-6 relative animate-fadeIn">
            {/* Close button */}
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Confirm Logout
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to log out of DataPulse?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};