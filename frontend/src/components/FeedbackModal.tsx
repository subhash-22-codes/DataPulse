import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { api } from "../services/api";

const MIN_CHARS = 5;
const MAX_CHARS = 500;
const REQUEST_TIMEOUT = 8000;

type SubmitState = "idle" | "submitting" | "success" | "error";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  isSubmitted?: boolean;
}

export const FeedbackModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (!isOpen) return null;

  const submitDisabled =
    state === "submitting" ||
    message.trim().length < MIN_CHARS ||
    message.trim().length > MAX_CHARS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;

    setError(null);

    if (!navigator.onLine) {
      setError("You are offline. Check your connection.");
      return;
    }

    const trimmed = message.trim();

    if (trimmed.length < MIN_CHARS) {
      setError(`Minimum ${MIN_CHARS} characters required.`);
      return;
    }

    abortRef.current = new AbortController();
    setState("submitting");

    try {
      await api.post(
        "/feedback/",
        { message: trimmed },
        {
          timeout: REQUEST_TIMEOUT,
          signal: abortRef.current.signal,
        }
      );

      setState("success");
      setTimeout(onClose, 1200);
    } catch (err) {
      setState("error");

      if (!navigator.onLine) {
        setError("Network connection lost.");
        return;
      }

      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          setError("Request timed out. Try again.");
          return;
        }

        const status = err.response?.status;
        const detail = err.response?.data?.detail;

        if (status && status >= 500) {
          setError("Server error. This is on us.");
          return;
        }

        if (detail === "DB_UNAVAILABLE") {
          setError("Service temporarily unavailable.");
          return;
        }

        setError(detail || "Request failed.");
        return;
      }

      setError("Unexpected error.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="
          w-full max-w-[420px]
          rounded-md
          bg-white
          shadow-xl
          border border-slate-200
          max-h-[90vh]
          overflow-y-auto
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Send feedback
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close feedback modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          {state === "success" ? (
            <p className="text-sm text-green-600">
              Thanks. Feedback received.
            </p>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    setMessage(e.target.value);
                  }
                }}
                placeholder="Share feedback, suggestions, or anything you’d like us to know."
                className="
                  w-full
                  min-h-[140px] sm:min-h-[120px]
                  resize-none
                  rounded-md
                  border border-slate-300
                  bg-white
                  p-3
                  text-sm
                  outline-none
                  focus:border-slate-500
                  custom-scrollbar
                "
                disabled={state === "submitting"}
              />

              <div className="flex justify-between text-xs text-slate-500">
                <span>{message.length} / {MAX_CHARS}</span>
                <span>Do not share secrets</span>
              </div>

              {error && (
                <p className="text-xs text-red-600">
                  {error}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="
                    w-full
                    inline-flex items-center justify-center
                    rounded-sm
                    bg-blue-600 hover:bg-blue-700
                    py-2.5
                    text-[13px] font-semibold text-white
                    transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed
                  "
                >
                  {state === "submitting" ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );

};
