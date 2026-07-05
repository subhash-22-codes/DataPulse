import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Bug, Lightbulb, MessageCircle, Heart } from "lucide-react";
import { api } from "../services/api";

const MIN_CHARS = 5;
const MAX_CHARS = 500;
const REQUEST_TIMEOUT = 8000;

type SubmitState = "idle" | "submitting" | "success" | "error" | "cooldown";
type FeedbackType = "bug" | "feature" | "general" | "praise";

interface MoodOption { value: number; emoji: string; label: string; }
interface FeedbackTypeOption { value: FeedbackType; label: string; icon: React.ReactNode; }

const MOOD_OPTIONS: MoodOption[] = [
  { value: 1, emoji: "😍", label: "Love it" },
  { value: 2, emoji: "😊", label: "Happy" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "😕", label: "Unhappy" },
  { value: 5, emoji: "😤", label: "Frustrated" },
];

const TYPE_OPTIONS: FeedbackTypeOption[] = [
  { value: "bug",     label: "Bug",     icon: <Bug className="h-3.5 w-3.5" /> },
  { value: "feature", label: "Feature", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { value: "general", label: "General", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: "praise",  label: "Praise",  icon: <Heart className="h-3.5 w-3.5" /> },
];

interface Props { isOpen: boolean; onClose: () => void; }

export const FeedbackModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [message, setMessage]         = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [mood, setMood]               = useState<number | null>(null);
  const [hoveredMood, setHoveredMood] = useState<number | null>(null);
  const [state, setState]             = useState<SubmitState>("idle");
  const [error, setError]             = useState<string | null>(null);
  const [cooldownDays, setCooldownDays] = useState<number | null>(null);

  const abortRef    = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 120);
    } else {
      setTimeout(() => {
        setMessage(""); setFeedbackType("general"); setMood(null);
        setState("idle"); setError(null); setCooldownDays(null);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => { return () => abortRef.current?.abort(); }, []);

  if (!isOpen) return null;

  const charsLeft     = MAX_CHARS - message.length;
  const isNearLimit   = charsLeft <= 50;
  const submitDisabled =
    state === "submitting" ||
    message.trim().length < MIN_CHARS ||
    message.trim().length > MAX_CHARS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    setError(null);

    if (!navigator.onLine) { setError("You're offline. Check your connection and try again."); return; }

    const trimmed = message.trim();
    if (trimmed.length < MIN_CHARS) { setError(`At least ${MIN_CHARS} characters required.`); return; }

    abortRef.current = new AbortController();
    setState("submitting");

    try {
      await api.post("/feedback",
        { message: trimmed, feedback_type: feedbackType, mood: mood ?? undefined },
        { timeout: REQUEST_TIMEOUT, signal: abortRef.current.signal }
      );
      setState("success");
      setTimeout(onClose, 2800);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (!navigator.onLine) { setState("error"); setError("Connection lost. Try again."); return; }
      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") { setState("error"); setError("Request timed out. Try again."); return; }
        const s      = err.response?.status;
        const detail = err.response?.data?.detail as string | undefined;
        if (s === 429 && detail?.startsWith("COOLDOWN:")) {
          setCooldownDays(parseInt(detail.split(":")[1], 10));
          setState("cooldown"); return;
        }
        if (s && s >= 500) { setState("error"); setError("Something went wrong on our end. Try again later."); return; }
        setState("error"); setError(detail || "Submission failed. Try again."); return;
      }
      setState("error"); setError("Unexpected error. Try again.");
    }
  };

  const activeMood = hoveredMood ?? mood;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-[440px] bg-white sm:rounded-sm rounded-t-2xl border border-slate-200/80 overflow-hidden shadow-[0_32px_80px_-16px_rgba(15,23,42,0.3)] flex flex-col"
        style={{ maxHeight: "92vh", animation: "dpSlideUp 0.26s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M2 12h4l2-6 4 12 3-9 2 3h5" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <h2 className="text-[13px] font-bold font-poppins text-slate-900 tracking-tight">Share feedback</h2>
              <p className="text-[10.5px] text-slate-400 font-manrope mt-0.5">Helps us improve DataPulse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-90"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {state === "success" ? (
            <SuccessState />
          ) : state === "cooldown" ? (
            <CooldownState days={cooldownDays} onClose={onClose} />
          ) : (
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

              {/* Mood */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-manrope">How are you feeling?</p>
                  <span className="text-[11px] font-semibold font-manrope text-blue-600 min-h-[14px]">
                    {activeMood !== null ? MOOD_OPTIONS.find(m => m.value === activeMood)?.label : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1">
                  {MOOD_OPTIONS.map((m) => {
                    const selected = mood === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMood(selected ? null : m.value)}
                        onMouseEnter={() => setHoveredMood(m.value)}
                        onMouseLeave={() => setHoveredMood(null)}
                        title={m.label}
                        className="flex flex-col items-center"
                      >
                        <span className={`text-[26px] leading-none transition-all duration-200 ${
                          selected ? "scale-[1.18]" : activeMood === m.value ? "scale-110" : "scale-100"
                        } ${
                          activeMood !== null && activeMood !== m.value ? "opacity-25 grayscale" : "opacity-100"
                        }`}>
                          {m.emoji}
                        </span>
                        <span className={`mt-1.5 h-[3px] rounded-full transition-all duration-200 ${
                          selected ? "bg-blue-500 w-4" : "bg-transparent w-[3px]"
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type */}
              <div>
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-manrope mb-2.5">Type</p>
                <div className="relative flex bg-slate-50 rounded-sm p-1 border border-slate-100">
                  {TYPE_OPTIONS.map((t) => {
                    const selected = feedbackType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFeedbackType(t.value)}
                        className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm text-[11px] font-bold font-manrope transition-all duration-200 z-10 ${
                          selected ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {selected && (
                          <span className="absolute inset-0 bg-white rounded-sm shadow-sm -z-10" />
                        )}
                        <span className={selected ? "text-blue-500" : "text-slate-400"}>{t.icon}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-manrope mb-2.5">Message</p>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setMessage(e.target.value); }}
                  placeholder={
                    feedbackType === "bug"     ? "Describe what happened and what you expected…" :
                    feedbackType === "feature" ? "What would you like to see in DataPulse?" :
                    feedbackType === "praise"  ? "What's working well for you?" :
                    "Share anything on your mind…"
                  }
                  className="w-full min-h-[110px] resize-none rounded-sm border border-slate-200 bg-white px-3.5 py-3 text-base sm:text-sm font-manrope text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all duration-150 custom-scrollbar"
                  disabled={state === "submitting"}
                />
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[10.5px] text-slate-400 font-manrope">Don't share passwords or secrets</span>
                  <span className={`text-[10.5px] font-semibold font-manrope tabular-nums ${isNearLimit ? "text-red-500" : "text-slate-400"}`}>
                    {charsLeft}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && state === "error" && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-sm bg-red-50 border border-red-100" style={{ animation: "dpFadeUp 0.2s ease-out" }}>
                  <span className="text-red-400 text-[11px] mt-0.5">⚠</span>
                  <p className="text-[11.5px] text-red-600 font-manrope">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitDisabled}
                className={`group w-full flex items-center justify-center gap-2 h-11 rounded-sm text-[12.5px] font-bold font-manrope tracking-wide transition-all duration-150 active:scale-[0.98] ${
                  submitDisabled
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-600/25"
                }`}
              >
                {state === "submitting" ? (
                  <><Spinner /> Sending…</>
                ) : (
                  <>
                    Send feedback
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${submitDisabled ? "" : "group-hover:translate-x-0.5"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dpSlideUp {
          from { opacity:0; transform:translateY(18px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes dpFadeUp {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes dpScaleIn {
          from { opacity:0; transform:scale(0.94); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes dpSpin {
          to { transform:rotate(360deg); }
        }
        @keyframes dpDrain {
          from { width:100%; }
          to   { width:0%; }
        }
        @keyframes dpFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

const Spinner = () => (
  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white" style={{ animation: "dpSpin 0.7s linear infinite" }} />
);

// Illustration box: a fixed, generous square with simple object-contain.
// No forced oversized image height, no negative margins, no overflow-hidden
// cropping — the SVG is never larger than its container, so nothing gets
// sliced off regardless of the source file's own internal proportions.
const SuccessState: React.FC = () => (
  <div className="flex flex-col items-center text-center px-5 py-7" style={{ animation: "dpScaleIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
    <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-4">
      <img
        src="/images/thanks.svg"
        alt=""
        aria-hidden="true"
        className="max-w-full max-h-full object-contain"
        style={{ animation: "dpFloat 3.5s ease-in-out infinite" }}
      />
    </div>

    <p className="text-[14.5px] font-bold font-poppins text-slate-900 tracking-tight mb-1">
      Feedback received
    </p>
    <p className="text-[11.5px] text-slate-400 font-manrope max-w-[200px] mb-5">
      Thanks for helping us improve DataPulse.
    </p>

    {/* Drain bar — purely decorative, mirrors the real 2800ms close timer */}
    <div className="w-28 h-[3px] rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full bg-emerald-400 rounded-full" style={{ animation: "dpDrain 2.8s linear forwards" }} />
    </div>
    <p className="text-[10px] text-slate-300 font-manrope mt-2">Closing automatically…</p>
  </div>
);

const CooldownState: React.FC<{ days: number | null; onClose: () => void }> = ({ days, onClose }) => (
  <div className="flex flex-col items-center text-center px-5 py-7" style={{ animation: "dpScaleIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
    <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-4">
      <img
        src="/images/wait.svg"
        alt=""
        aria-hidden="true"
        className="max-w-full max-h-full object-contain"
      />
    </div>

    <p className="text-[14.5px] font-bold font-poppins text-slate-900 tracking-tight mb-1">
      Already submitted
    </p>
    <p className="text-[11.5px] text-slate-400 font-manrope max-w-[220px] mb-5">
      {days && days > 1
        ? `You can submit again in ${days} days.`
        : "You can submit again tomorrow."}
    </p>
    <button
      onClick={onClose}
      className="px-5 py-2 rounded-sm text-[11.5px] font-bold font-manrope text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
    >
      Got it
    </button>
  </div>
);