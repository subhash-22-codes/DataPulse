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
                  onClick={() => navigate('/home')}
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
                  className="p-2 rounded-md text-slate-400 hover:bg-slate-100/50 hover:text-slate-900 transition-all"
                  title="Archive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Notifications />
                <WhatsNewTrigger />
                
                {!user?.is_feedback_submitted && (
                  <div className="relative">
                    <button
                      onClick={openFeedback}
                      className="p-2 text-slate-400 hover:text-slate-900"
                      aria-label="Send feedback"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
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
                  className="group flex items-center gap-2.5 pl-1 pr-1 sm:pr-3 py-1 rounded-full border border-transparent hover:border-slate-200 hover:bg-white transition-all active:scale-95"
                >
                  <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white shadow-sm overflow-hidden shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-slate-800 tracking-tight">
                    {user?.name || 'User'}
                  </span>
                </button>
                
                <button
                  onClick={() => setShowConfirm(true)}
                  className="p-2 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
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