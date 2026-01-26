import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trash2, ArrowLeft, MessageSquarePlus } from 'lucide-react'; 
import { Notifications } from './Notifications';
import { Chatbot } from './Chatbot';
import { FeedbackModal } from './FeedbackModal';
import { WhatsNewTrigger } from './WhatsNewTrigger';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showHint, setShowHint] = useState(false);

  const isAccountPage = location.pathname === '/account';

  useEffect(() => {
    if (!user?.id || user?.is_feedback_submitted) return;

    const hintKey = `dp_hint_seen_1${user.id}`;
    const hasSeen = localStorage.getItem(hintKey);
    
    if (!hasSeen) {
      setShowHint(true);
    }
  }, [user?.id, user?.is_feedback_submitted]);

  const openFeedback = () => {
    if (user?.id) {
      localStorage.setItem(`dp_hint_seen_1${user.id}`, 'true');
    }
    setShowHint(false);
    setShowFeedback(true);
  };

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
    <div className="min-h-screen flex flex-col font-sans antialiased text-slate-900 relative">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.35] workspace-background" />

      <header className="sticky top-0 z-50 w-full bg-white/75 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              {isAccountPage ? (
                <button 
                  onClick={() => navigate(-1)}
                  className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span>Back</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/home')}>
                  <img src="/DPLogo.png" alt="Logo" className="h-7 w-auto object-contain sm:hidden" />
                  <img src="/DPLogo2.png" alt="Logo" className="h-8 w-auto object-contain hidden sm:block" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/trash')}
                  className="group relative p-2 rounded-md text-slate-400 hover:text-rose-600 transition-all"
                >
                  {/* The Icon - Kept at your h-4 */}
                  <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />

                  {/* Micro-Consistent Tooltip */}
                  <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50">
                    {/* Tiny Pointer: Matches Bell scale */}
                    <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
                    
                    {/* The Pill: text-[9px] and py-0.5 for that ultra-pro micro look */}
                    <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
                      Archive
                    </div>
                  </div>
                </button>
                <Notifications />
                <WhatsNewTrigger />
                
                {!user?.is_feedback_submitted && (
                  <div className="relative">
                   <button
                      onClick={openFeedback}
                      className="group relative p-2 text-slate-400 hover:text-slate-900 transition-colors"
                      aria-label="Send feedback"
                    >
                      <MessageSquarePlus className="h-4 w-4 transition-transform group-hover:scale-110" />
                      <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50">
                        <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
                        <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
                          Feedback
                        </div>
                      </div>
                    </button>

                    {showHint && (
                      <div className="absolute top-12 right-0 w-48 p-3 bg-white border border-slate-200 shadow-xl rounded-lg animate-in fade-in slide-in-from-top-2 z-[60]">
                        <div className="absolute -top-2 right-3 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-slate-900 tracking-wide">Quick Feedback</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">Share feedback, ideas, or issues.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.setItem("dp_feedback_hint_seen", "true");
                            setShowHint(false);
                          }}
                          className="mt-2 w-full text-[9px] font-bold text-slate-400 hover:text-slate-900 text-left uppercase tracking-widest"
                        >
                          Got it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1"></div>

              <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate('/account')}
                    className="group relative flex items-center gap-2.5 pl-1 pr-1 sm:pr-3 py-1 rounded-full border border-transparent hover:border-slate-200 hover:bg-white transition-all active:scale-95"
                  >
                    {/* Avatar Circle */}
                    <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white shadow-sm overflow-hidden shrink-0">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>

                    {/* User Name */}
                    <span className="hidden sm:inline text-xs font-bold text-slate-800 tracking-tight">
                      {user?.name || 'User'}
                    </span>

                    {/* --- The Consistent Micro-Tooltip --- */}
                    <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50">
                      {/* Tiny Pointer */}
                      <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
                      
                      {/* The Pill: Same 9px font as Bell, Trash, and Sparkles */}
                      <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
                        Account settings
                      </div>
                    </div>
                  </button>
                
                <button
                  onClick={() => setShowConfirm(true)}
                  className="group relative p-2 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                >
                  {/* The Icon - h-4 with a tiny hover scale */}
                  <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />

                  {/* The Final Consistent Micro-Tooltip */}
                  <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50">
                    {/* Tiny Pointer */}
                    <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
                    
                    {/* The Pill: 9px font, slate-800 background */}
                    <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
                      Sign out
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full relative z-10">
        <div className={isAccountPage ? 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10' : 'w-full'}>
          {children}
        </div>
      </main>

      <Chatbot />

      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)}
        userId={user?.id} 
        isSubmitted={user?.is_feedback_submitted}
      />

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[320px] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2">Sign out?</h2>
              <p className="text-xs text-slate-500 mb-6"> You’ll be signed out of your account on this device.</p>
              <div className="flex w-full gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-8 rounded-sm border border-slate-200 text-[10px] font-bold text-slate-400 font-manrope tracking-widest hover:bg-slate-50 hover:text-slate-900 hover:bg-black/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 h-8 bg-slate-900 hover:bg-black rounded-sm text-[10px] font-bold text-white font-manrope tracking-widest shadow-sm transition-all active:scale-95"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};