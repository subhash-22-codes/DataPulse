import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trash2, ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { Notifications } from './Notifications';
import { Chatbot } from './Chatbot';
import { FeedbackModal } from './FeedbackModal';
import { WhatsNewTrigger } from './WhatsNewTrigger';
import { IconButtonWithTooltip } from './website-ui/IconButtonWithTooltip';
import { ConfirmDialog } from './website-ui/ConfirmDialog';
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

  const isOnCooldown = user?.last_feedback_at
    ? (Date.now() - new Date(user.last_feedback_at).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false;

  useEffect(() => {
    if (!user?.id || isOnCooldown) return;

    const hintKey = `dp_hint_seen_1${user.id}`;
    const hasSeen = localStorage.getItem(hintKey);

    if (!hasSeen) {
      setShowHint(true);
    }
  }, [user?.id, isOnCooldown]);

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

      <header className="sticky top-0 z-header w-full bg-white/75 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              {isAccountPage ? (
                <button
                  onClick={() => navigate('/home')}
                  className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span></span>
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
                <IconButtonWithTooltip
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Archive"
                  variant="danger"
                  onClick={() => navigate('/trash')}
                />

                <Notifications />
                <WhatsNewTrigger />

                {!isOnCooldown && (
                  <div className="relative">
                    <IconButtonWithTooltip
                      icon={<MessageSquarePlus className="h-4 w-4" />}
                      label="Feedback"
                      onClick={openFeedback}
                    />

                    {showHint && (
                      <div className="absolute top-12 right-0 w-48 p-3 bg-white border border-slate-200 shadow-elevated rounded-lg animate-in fade-in slide-in-from-top-2 z-dropdown">
                        <div className="absolute -top-2 right-3 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-slate-900 tracking-wide">Quick Feedback</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">Share feedback, ideas, or issues.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.setItem(`dp_hint_seen_1${user?.id}`, 'true');
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
                  <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white shadow-sm overflow-hidden shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>

                  <span className="hidden sm:inline text-xs font-bold text-slate-800 tracking-tight">
                    {user?.name || 'User'}
                  </span>

                  <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-dropdown">
                    <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
                    <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
                      Account settings
                    </div>
                  </div>
                </button>

                <IconButtonWithTooltip
                  icon={<LogOut className="h-4 w-4" />}
                  label="Sign out"
                  variant="danger"
                  onClick={() => setShowConfirm(true)}
                />
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
      />

      {showConfirm && (
        <ConfirmDialog
          title="Sign out?"
          description="You'll be signed out of your account on this device."
          confirmLabel="Sign Out"
          cancelLabel="Cancel"
          onConfirm={handleLogout}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};