import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { api } from "../services/api";
import {
  Bell,
  Trash2,
  Inbox,
  Loader2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModalShell } from "./ModelShell";

/* =======================
   Types (matches backend)
======================= */

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  priority: "low" | "info" | "warning" | "critical";
  created_at: string;
  action_url?: string | null;
}

/* =======================
   Helpers
======================= */

const relativeTime = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const summarizeMessage = (message: string) => {
  const workspace =
    message.match(/Data updated in '(.+?)'/)?.[1] ?? "Workspace";

  const parts: React.ReactNode[] = [];

  const schema = message.match(/\+(\d+)\s*\/\s*-(\d+)/);
  if (schema) {
    const added = Number(schema[1]);
    const removed = Number(schema[2]);

    if (added > 0) {
      parts.push(
        <span key="schema-add" className="inline-flex items-center gap-1">
          Structure <ArrowUp className="h-3 w-3 text-green-600" />
          {added}
        </span>
      );
    }

    if (removed > 0) {
      parts.push(
        <span key="schema-remove" className="inline-flex items-center gap-1">
          Structure <ArrowDown className="h-3 w-3 text-red-600" />
          {removed}
        </span>
      );
    }
  }

  const rows = message.match(/rows\s+(\d+)\s*→\s*(\d+)/);
  if (rows) {
    const from = Number(rows[1]);
    const to = Number(rows[2]);

    parts.push(
      <span key="rows" className="inline-flex items-center gap-1">
        Rows
        {to > from ? (
          <ArrowUp className="h-3 w-3 text-green-600" />
        ) : (
          <ArrowDown className="h-3 w-3 text-red-600" />
        )}
        {from} → {to}
      </span>
    );
  }

  const cols = message.match(/columns\s+(\d+)\s*→\s*(\d+)/);
  if (cols) {
    const from = Number(cols[1]);
    const to = Number(cols[2]);

    parts.push(
      <span key="cols" className="inline-flex items-center gap-1">
        Columns
        {to > from ? (
          <ArrowUp className="h-3 w-3 text-green-600" />
        ) : (
          <ArrowDown className="h-3 w-3 text-red-600" />
        )}
        {from} → {to}
      </span>
    );
  }

  return { workspace, parts };
};

/* =======================
   Skeletons
======================= */

const NotificationSkeletonRow = () => (
  <div className="flex items-start justify-between gap-3 px-3 py-2">
    <div className="flex gap-2 w-full">
      <div className="mt-1 h-4 w-4 rounded bg-slate-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
        <div className="h-2 w-24 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

const NotificationsSkeleton = () => (
  <div className="rounded-md border border-slate-200 bg-white divide-y">
    {Array.from({ length: 5 }).map((_, i) => (
      <NotificationSkeletonRow key={i} />
    ))}
  </div>
);

/* =======================
   Component
======================= */

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [mutating, setMutating] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    abortRef.current = new AbortController();

    try {
      const res = await api.get<Notification[]>("/notifications", {
        signal: abortRef.current?.signal,
      });

      const sorted = [...res.data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setNotifications(sorted);
      setError(null);

      if (sorted.some(n => !n.is_read)) {
        api.post("/notifications/read-all").catch(() => {});
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.code === "ERR_CANCELED"
      ) {
        return;
      }
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const retryFetch = () => {
    setError(null);
    setLoading(true);
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
    return () => abortRef.current?.abort();
  }, []);

  const handleDelete = async (id: string) => {
    if (processingId || clearingAll) return;

    setProcessingId(id);
    setMutating(true);

    const backup = notifications;
    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      await api.delete(`/notifications/${id}`);
      setError(null);
    } catch {
      setNotifications(backup);
      setError("Failed to delete notification.");
    } finally {
      setProcessingId(null);
      setMutating(false);
    }
  };

  const handleClearAll = async () => {
    if (clearingAll) return;

    setClearingAll(true);
    setMutating(true);
    setShowClearModal(false);

    const backup = notifications;
    setNotifications([]);

    try {
      await api.delete("/notifications");
      setError(null);
    } catch {
      setNotifications(backup);
      setError("Failed to clear notifications.");
    } finally {
      setClearingAll(false);
      setMutating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-5">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-slate-900">
            Notifications
          </h1>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={notifications.length === 0 || clearingAll}
            className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-30"
          >
            Clear all
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          Activity from your connected data sources. We highlight meaningful changes.
        </p>

        {error && notifications.length === 0 && (
          <div className="mb-4 text-xs text-red-600 flex items-center gap-3">
            <span>{error}</span>
            <button
              onClick={retryFetch}
              className="text-xs font-medium text-slate-900 underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <NotificationsSkeleton />
        ) : mutating && notifications.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Inbox className="h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white divide-y">
            {notifications.map(n => {
              const { workspace, parts } =
                summarizeMessage(n.message);

              return (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex gap-2">
                    <Bell className="mt-1 h-4 w-4 text-slate-400" />

                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        {workspace}
                      </div>

                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-600">
                        {parts.map((p, i) => (
                          <React.Fragment key={i}>
                            {p}
                            {i < parts.length - 1 && (
                              <span className="text-slate-400">•</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {relativeTime(n.created_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={processingId === n.id || clearingAll}
                    className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-40"
                  >
                    {processingId === n.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showClearModal && (
        <ModalShell>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[320px] rounded-sm border border-slate-300 bg-white p-4 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-900">
                Clear notifications?
              </h3>

              <p className="mt-2 text-xs text-slate-500">
                This will permanently remove all notifications.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>

                <button
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="rounded-sm bg-neutral-900 hover:bg-neutral-800 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
