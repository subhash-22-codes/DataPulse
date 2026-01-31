import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import {
  Bell,
  Trash2,
  Inbox,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ModalShell } from "./ModelShell";

/* =======================
   Types
======================= */

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  priority: "low" | "info" | "warning" | "critical";
  created_at: string;
}

interface ParsedNotification {
  workspace: string;
  summary: string;
  timestamp: string;
}

/* =======================
   Parsing (frontend only)
======================= */

const parseMessage = (
  message: string,
  createdAt: string
): ParsedNotification => {
  const workspace =
    message.match(/Data updated in '(.+?)'/)?.[1] ?? "Workspace";

  const parts: string[] = [];

  const schema = message.match(/\(\+(\d+)\s*\/\s*-(\d+)\)/);
  if (schema) {
    const added = Number(schema[1]);
    const removed = Number(schema[2]);
    if (added) parts.push(`${added} column${added > 1 ? "s" : ""} added`);
    if (removed)
      parts.push(`${removed} column${removed > 1 ? "s" : ""} removed`);
  }

  const rows = message.match(/rows\s+(\d+)\s*→\s*(\d+)/);
  if (rows) {
    const diff = Number(rows[2]) - Number(rows[1]);
    if (diff > 0) parts.push(`row count increased by ${diff}`);
    if (diff < 0) parts.push(`row count decreased by ${Math.abs(diff)}`);
  }

  const cols = message.match(/columns\s+(\d+)\s*→\s*(\d+)/);
  if (cols) {
    parts.push(`total columns ${cols[2]}`);
  }

  return {
    workspace,
    summary:
      parts.length > 0
        ? `Schema updated: ${parts.join(", ")}`
        : "Data updated",
    timestamp: new Date(createdAt).toLocaleString(),
  };
};

/* =======================
   Component
======================= */

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const navigate = useNavigate();

  /* ---------------- Fetch ---------------- */

  const fetchNotifications = async () => {
    try {
      const res = await api.get<Notification[]>("/notifications/");
      setNotifications(res.data);

      if (res.data.some(n => !n.is_read)) {
        await api.post("/notifications/read-all");
      }
    } catch {
      toast.error("Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  /* ---------------- Actions ---------------- */

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    const backup = notifications;
    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(backup);
      toast.error("Delete failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleClearAll = async () => {
    setShowClearModal(false);
    const backup = notifications;
    setNotifications([]);

    try {
      await api.delete("/notifications/");
    } catch {
      setNotifications(backup);
      toast.error("Clear failed");
    }
  };

  /* ---------------- Derived ---------------- */

  const parsed = useMemo(
    () =>
      notifications.map(n => ({
        raw: n,
        parsed: parseMessage(n.message, n.created_at),
      })),
    [notifications]
  );

  /* ---------------- Loading ---------------- */

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            Workspace Activity
          </h1>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={notifications.length === 0}
            className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-30"
          >
            Clear history
          </button>
        </div>

        {/* Empty */}
        {parsed.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No recent activity
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {parsed.map(({ raw, parsed }) => (
              <div
                key={raw.id}
                className="group flex items-start justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex gap-3">
                  <Bell className="mt-0.5 h-4 w-4 text-slate-400" />

                  <div>
                    <div className="text-sm text-slate-900">
                      <span className="font-semibold">
                        {parsed.workspace}
                      </span>{" "}
                      <span className="text-slate-600">
                        {parsed.summary}
                      </span>
                    </div>

                    <div className="mt-0.5 text-xs text-slate-400">
                      {parsed.timestamp}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(raw.id)}
                  disabled={processingId === raw.id}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:text-red-600 transition"
                >
                  {processingId === raw.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Modal (unchanged, your style) */}
      {showClearModal && (
        <ModalShell>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
            <div className="w-full max-w-[340px] rounded-sm border border-slate-300 bg-white p-4 shadow-2xl">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Empty inbox?
              </h3>

              <p className="mt-2 text-xs text-slate-500 leading-normal font-medium">
                All your current notifications will be removed. You won't be able to see them again.
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors font-manrope hover:bg-black/5 tracking-widest"
                >
                  Cancel
                </button>

                <button
                  onClick={handleClearAll}
                  className="rounded-sm bg-slate-900 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-black shadow-sm transition-all font-manrope tracking-widest"
                >
                  Clear Inbox
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
