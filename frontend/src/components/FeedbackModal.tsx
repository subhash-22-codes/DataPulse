import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const MIN_CHARS = 5;
const MAX_CHARS = 500;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  isSubmitted?: boolean;
}

interface ApiErrorDetail {
  detail: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  isSubmitted = false,
}) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [showFinalCard, setShowFinalCard] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { setFeedbackSubmitted } = useAuth();

  const isLocked = isSubmitted || status === 'sent';

  const handleClose = useCallback(() => {
    // If they close while in "Sent" state, show the PhonePe style card after 2s
    if (status === 'sent') {
      onClose(); // Close the modal
      setTimeout(() => {
        setShowFinalCard(true);
        // Auto-hide the final card after 4 seconds
        setTimeout(() => setShowFinalCard(false), 4000);
      }, 2000);
    } else {
      setMessage('');
      setStatus('idle');
      onClose();
    }
  }, [onClose, status]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen && !isLocked) {
      timer = setTimeout(() => textAreaRef.current?.focus(), 150);
    }
    return () => clearTimeout(timer);
  }, [isOpen, isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < MIN_CHARS || isLocked) return;

    setStatus('submitting');

    try {
      await api.post('/feedback/', {
        message,
      });

      setFeedbackSubmitted(); 
      setStatus('sent');
      toast.success('Feedback received');
    } catch (err: unknown) {
      setStatus('idle');
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiErrorDetail | undefined;
        toast.error(data?.detail || "Something went wrong");
      }
    }
  };

  if (!isOpen && !showFinalCard) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-[390px] sm:max-w-[420px] md:max-w-[520px] border border-slate-200 overflow-hidden font-manrope animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex flex-col">
                <h3 className="text-[11px] md:text-[12px] font-bold text-slate-800 tracking-wider uppercase">
                  {isLocked ? "Feedback" : "Send Feedback"}
                </h3>
                <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight">
                  {isLocked
                    ? "Thanks for helping us improve DataPulse."
                    : "Share a bug, idea, or anything confusing."}
                </p>
              </div>

              <button
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 md:p-8">
              {isLocked ? (
                <div className="flex flex-col items-center justify-center space-y-5 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center shadow-inner border border-blue-100">
                      <CheckCircle2 className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="text-center space-y-2 max-w-[420px]">
                    <p className="text-[15px] md:text-[16px] font-bold text-slate-900">
                      Sent
                    </p>

                    <p className="text-[11px] md:text-[12px] text-slate-500 leading-relaxed px-2 md:px-6">
                      Thanks. We’ve received your feedback and will review it soon. Your input helps us make DataPulse better for everyone.
                    </p>
                  </div>

                  <button
                    onClick={handleClose}
                    className="mt-4 px-10 py-2.5 text-[10px] font-bold text-slate-500 hover:text-slate-900 uppercase tracking-[0.2em] transition-all border border-slate-100 rounded-sm hover:bg-slate-50 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-0.5">
                      <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Message
                      </label>
                    </div>

                    <div className="relative group">
                      <textarea
                        ref={textAreaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Found a bug or have an idea to improve DataPulse?"
                        className="custom-scrollbar w-full min-h-[150px] md:min-h-[170px] p-4 text-[13px] md:text-[14px] leading-relaxed bg-slate-50/50 border border-slate-200 rounded-sm focus:border-slate-300 outline-none transition-all resize-none placeholder:text-slate-400 shadow-sm"
                        disabled={status === "submitting"}
                      />

                      <div
                        className={`absolute -bottom-5 right-1 text-[9px] md:text-[10px] font-bold tracking-widest ${
                          message.length > MAX_CHARS ? "text-red-500" : "text-slate-400"
                        }`}
                      >
                        {message.length} / {MAX_CHARS}
                      </div>
                    </div>

                    {message.length > 0 && message.length < MIN_CHARS && (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] md:text-[11px] text-amber-600 font-semibold italic">
                          Minimum {MIN_CHARS} characters required
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="w-full flex justify-center items-center h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-[13px] md:text-[14px] font-semibold tracking-wide shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {status === "submitting" ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Send feedback</span>
                          <Send className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] md:text-[11px] text-slate-400 leading-relaxed text-center">
                     Don’t share passwords or private keys.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHONE PE STYLE THANK YOU CARD (Delayed by 2s) */}
      {showFinalCard && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[120] w-[320px] bg-white border border-slate-200 rounded-lg shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-500">
          <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-[12px] font-bold text-slate-900">Thank you for your feedback!</p>
            <p className="text-[10px] text-slate-500">Our team will see and review this soon.</p>
          </div>
        </div>
      )}
    </>
  );
};