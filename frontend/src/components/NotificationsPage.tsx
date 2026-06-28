import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { api } from "../services/api";
import {
  Trash2, Loader2, ArrowLeft, Database,
  ArrowUp, ArrowDown, Table, Columns, ExternalLink,
  Clock, RotateCw, AlertTriangle, WifiOff, CloudOff,
  Bell, CheckCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModalShell } from "./ModelShell";
import { Link } from "react-router-dom";

// ─── TYPES — untouched ───────────────────────────────────────────────────────
type Priority =
  | "low"
  | "medium"
  | "high"
  | "info"
  | "warning"
  | "critical";

interface Payload {
  workspace_name?: string | null;
  event?: string | null;
  violations_count?: number | null;
  rows_from?: number | null;
  rows_to?: number | null;
  cols_from?: number | null;
  cols_to?: number | null;
  schema_added?: string[] | null;
  schema_removed?: string[] | null;
  actor_email?: string | null;
}

interface Notification {
  id: string;
  workspace_id: string | null;
  ai_insight: string | null;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  notification_type: string;
  priority: Priority;
  action_url: string | null;
  created_at: string;
  payload: Payload | null;
}

// ─── HELPERS — untouched ─────────────────────────────────────────────────────
const formatPreciseTime = (date: string) => {
  const d = new Date(date);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const getStatusLabel = (n: Notification) => {
  const p = n.payload;
  if (n.notification_type === "polling_error") {
    if (n.priority === "critical") return { text: "Polling Stopped", color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold" };
    return { text: "Polling Issue", color: "text-amber-700 bg-amber-50 border-amber-100 font-manrope font-bold" };
  }
  if (n.notification_type === "team_update") {
    if (p?.event === "team_removed") return { text: "Access Removed", color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold" };
    if (p?.event === "team_added")   return { text: "Team Update",    color: "text-blue-700 bg-blue-50 border-blue-100 font-manrope font-bold" };
    return { text: "Workspace Update", color: "text-slate-700 bg-slate-50 border-slate-100 font-manrope font-bold" };
  }
  if (n.notification_type === "incident") {
    if (n.priority === "critical" || n.priority === "high") return { text: "Incident", color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold" };
    if (n.priority === "warning" || n.priority === "medium") return { text: "Incident", color: "text-amber-700 bg-amber-50 border-amber-100 font-manrope font-bold" };
    return { text: "Incident", color: "text-blue-700 bg-blue-50 border-blue-100 font-manrope font-bold" };
  }
  if (n.notification_type === "data_update") {
  if (n.priority === "critical" || n.priority === "high")
    return {
      text: "Action Needed",
      color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold",
    };

  if (n.priority === "warning" || n.priority === "medium")
    return {
      text: "Data Changed",
      color: "text-amber-700 bg-amber-50 border-amber-100 font-manrope font-bold",
    };

  return {
    text: "Data Updated",
    color: "text-blue-700 bg-blue-50 border-blue-100 font-manrope font-bold",
  };
}
  if (
    p?.event === "data_violation" ||
    n.priority === "critical" ||
    n.priority === "high"
  )
    return {
      text: "Action Needed",
      color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold"
    };
  if (p?.event === "workspace_deleted")  return { text: "Workspace Deleted",  color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold" };
  if (p?.event === "workspace_restored") return { text: "Workspace Restored", color: "text-emerald-700 bg-emerald-50 border-emerald-100 font-manrope font-bold" };
  if (
    p?.event === "pipeline_failure" ||
    n.priority === "warning" ||
    n.priority === "medium"
  )
    return {
      text: "Issue Found",
      color: "text-amber-700 bg-amber-50 border-amber-100 font-manrope font-bold"
    };
  if (!p && (n.notification_type === "alert" || n.priority === "info")) return { text: "Update", color: "text-slate-700 bg-slate-50 border-slate-100 font-manrope font-bold" };
  return { text: "Healthy", color: "text-emerald-700 bg-emerald-50 border-emerald-100 font-manrope font-bold" };
};

const getVerbalFeedback = (n: Notification) => {
  const p = n.payload;
  if (n.notification_type === "polling_error") return n.message;
  if (n.notification_type === "team_update")   return n.message;
  if (n.notification_type === "incident") return n.message;
  if (p?.event === "workspace_deleted" || p?.event === "workspace_restored") return n.message;

  let feedback = !p ? n.message : "";
  if (p) {
    if (p.event === "data_violation") {
      feedback = `Quality check failed: ${p.violations_count || 1} violations detected in your dataset.`;
    } else {
      const hasSchemaDiff =
        Array.isArray(p.schema_added) && Array.isArray(p.schema_removed) &&
        (p.schema_added.length > 0 || p.schema_removed.length > 0);
      if (hasSchemaDiff) {
        const added   = p.schema_added?.length   ? `Added: ${p.schema_added.join(", ")}`   : "";
        const removed = p.schema_removed?.length ? `Removed: ${p.schema_removed.join(", ")}` : "";
        const schemaText = [added, removed].filter(Boolean).join(" | ");
        feedback = `Schema updated: ${schemaText}.`;
        return n.ai_insight ? `${feedback} Tip: ${n.ai_insight}` : feedback;
      }
      const rowsChanged = p.rows_from != null && p.rows_to != null && p.rows_from !== p.rows_to;
      const colsChanged = p.cols_from != null && p.cols_to != null && p.cols_from !== p.cols_to;
      if (rowsChanged && colsChanged) {
        feedback = `Data structure and volume updated: Row count shifted from ${p.rows_from} to ${p.rows_to}, and columns changed from ${p.cols_from} to ${p.cols_to}.`;
      } else if (rowsChanged) {
        const direction = (p.rows_to ?? 0) > (p.rows_from ?? 0) ? "increased" : "decreased";
        feedback = `Data volume ${direction}: Your previous upload had ${p.rows_from} rows, and it has now ${direction} to ${p.rows_to} rows.`;
      } else if (colsChanged) {
        feedback = `Schema modification: Row count remains stable at ${p.rows_from}, but columns have been updated from ${p.cols_from} to ${p.cols_to}.`;
      } else {
        feedback = p.rows_to != null && p.cols_to != null
          ? `Dataset processed successfully. ${p.rows_to} rows and ${p.cols_to} columns verified.`
          : "Dataset processed successfully. No structural changes detected.";
      }
    }
  }
  return n.ai_insight ? `${feedback} Tip: ${n.ai_insight}` : feedback;
};

// ─── PRIORITY ACCENT ─────────────────────────────────────────────────────────
const priorityAccent = (priority: Priority) => {
  switch (priority) {
    case "critical":
    case "high":
      return "border-l-red-400";

    case "warning":
    case "medium":
      return "border-l-amber-400";

    case "info":
      return "border-l-blue-400";

    case "low":
      return "border-l-slate-200";

    default:
      return "border-l-slate-200";
  }
};

// ─── SKELETON ─────────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div className="flex bg-white border-b border-slate-100 p-4 sm:px-5 sm:py-4 animate-pulse">
    <div className="flex-1 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <div className="h-3 bg-slate-100 rounded-sm w-32" />
          <div className="h-4 bg-slate-100 rounded-full w-16" />
        </div>
        <div className="h-3 bg-slate-100 rounded-sm w-24" />
      </div>
      <div className="h-3 bg-slate-50 rounded-sm w-3/4" />
      <div className="h-3 bg-slate-50 rounded-sm w-1/2" />
      <div className="flex gap-2 mt-1">
        <div className="h-6 bg-slate-50 rounded-sm w-24" />
        <div className="h-6 bg-slate-50 rounded-sm w-24" />
      </div>
    </div>
  </div>
);

// ─── NOTIFICATION CARD ───────────────────────────────────────────────────────
const NotificationCard: React.FC<{
  n: Notification;
  processingId: string | null;
  onDelete: (id: string) => void;
}> = ({ n, processingId, onDelete }) => {
  const p = n.payload;
  const status   = getStatusLabel(n);
  const feedback = getVerbalFeedback(n);

  const hasSchemaDiff =
    (Array.isArray(p?.schema_added)   && (p?.schema_added?.length   ?? 0) > 0) ||
    (Array.isArray(p?.schema_removed) && (p?.schema_removed?.length ?? 0) > 0);

  const isCritical =
    n.priority === "critical" || n.priority === "high";
  const accent     = priorityAccent(n.priority);

  return (
    <div className={`group relative bg-white border-b border-slate-100 last:border-0 border-l-2 ${accent} transition-all duration-150 hover:bg-slate-50/50`}>
      <div className="flex gap-3 px-4 sm:px-5 py-4">

        {/* ── Icon ── */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={`w-7 h-7 rounded-sm border flex items-center justify-center ${
            isCritical
              ? "bg-red-50 border-red-200 text-red-500"
              : n.priority === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-500"
              : "bg-slate-50 border-slate-200 text-slate-400"
          }`}>
            {isCritical
              ? <AlertTriangle className="h-3.5 w-3.5" />
              : <Database className="h-3.5 w-3.5" />
            }
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[12px] font-bold text-slate-900 font-manrope truncate">
                {p?.workspace_name || (n.notification_type === "alert" ? "Console update" : "System update")}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${status.color} flex-shrink-0`}>
                {status.text}
              </span>
              {!n.is_read && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-manrope">
                <Clock className="h-2.5 w-2.5" />
                {formatPreciseTime(n.created_at)}
              </div>
              <button
                onClick={() => onDelete(n.id)}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-sm flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete"
              >
                {processingId === n.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Trash2 className="h-3 w-3" />
                }
              </button>
            </div>
          </div>

          {/* Feedback text */}
          <p className="text-[12px] text-slate-500 font-manrope leading-relaxed mb-3 max-w-2xl">
            {feedback}
          </p>

          {/* Chips row */}
          <div className="flex flex-wrap items-center gap-1.5">

            {/* Rows chip */}
            {p?.rows_to !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-sm text-[10px] font-semibold font-manrope">
                <Table className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400">Rows</span>
                {p.rows_from !== undefined ? (
                  <>
                    <span className="text-slate-600 tabular-nums">{p.rows_from?.toLocaleString()}</span>
                    {p.rows_to !== p.rows_from ? (
                      (p.rows_to ?? 0) > (p.rows_from ?? 0)
                        ? <ArrowUp   className="h-2.5 w-2.5 text-emerald-500" />
                        : <ArrowDown className="h-2.5 w-2.5 text-red-500" />
                    ) : (
                      <span className="text-slate-400">·</span>
                    )}
                    <span className="text-slate-900 font-bold tabular-nums">{p.rows_to?.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-slate-900 font-bold tabular-nums">{p.rows_to?.toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Columns chip */}
            {p?.cols_to !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-sm text-[10px] font-semibold font-manrope">
                <Columns className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400">Cols</span>
                {p.cols_from !== undefined ? (
                  <>
                    <span className="text-slate-600 tabular-nums">{p.cols_from}</span>
                    {p.cols_to !== p.cols_from ? (
                      (p.cols_to ?? 0) > (p.cols_from ?? 0)
                        ? <ArrowUp   className="h-2.5 w-2.5 text-emerald-500" />
                        : <ArrowDown className="h-2.5 w-2.5 text-red-500" />
                    ) : (
                      <span className="text-slate-400">·</span>
                    )}
                    <span className="text-slate-900 font-bold tabular-nums">{p.cols_to}</span>
                  </>
                ) : (
                  <span className="text-slate-900 font-bold tabular-nums">{p.cols_to}</span>
                )}
              </div>
            )}

            {/* View details */}
            {n.action_url && (
              <Link
                to={n.action_url}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all font-manrope ml-auto"
              >
                View details
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            )}

            {/* Mobile time */}
            <span className="text-[10px] text-slate-400 font-manrope sm:hidden ml-auto">
              {formatPreciseTime(n.created_at)}
            </span>
          </div>

          {/* Schema diff */}
          {hasSchemaDiff && (
            <div className="mt-3 rounded-sm border border-amber-100 bg-amber-50/60 p-3">
              <div className="flex items-start gap-2">
                <svg className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
                </svg>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-manrope">Schema changes</p>
                  {Array.isArray(p?.schema_added) && p.schema_added.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[9px] font-bold text-emerald-700 font-manrope mr-1">Added:</span>
                      {p.schema_added.map((col) => (
                        <span key={col} className="text-[9px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-sm">
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(p?.schema_removed) && p.schema_removed.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[9px] font-bold text-red-700 font-manrope mr-1">Removed:</span>
                      {p.schema_removed.map((col) => (
                        <span key={col} className="text-[9px] font-mono font-semibold bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded-sm">
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export const NotificationsPage: React.FC = () => {
  // ── All original state — untouched ───────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [processingId,  setProcessingId]  = useState<string | null>(null);
  const [clearingAll,   setClearingAll]   = useState(false);
  const [showClearModal,setShowClearModal]= useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  // ── Original fetchNotifications — untouched ──────────────────────────────
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    try {
      const res = await api.get<Notification[]>("/notifications", {
        signal: abortRef.current.signal,
      });
      const sorted = res.data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(sorted);
      if (sorted.some((n) => !n.is_read)) {
        api.post("/notifications/read-all").catch(() => {});
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.code === "ERR_NETWORK") {
          setError("Connection Issue: Please check your network environment.");
        } else if (err.response?.status === 500 || err.response?.status === 504) {
          setError("Service Notice: The system is currently optimizing your workspace. Please refresh in a moment.");
        } else if (err.code !== "ERR_CANCELED") {
          setError("Notice: We encountered a temporary issue while syncing your updates.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    return () => abortRef.current?.abort();
  }, []);

  // ── Original handleDelete — untouched ────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setError("Unable to complete deletion. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Dot grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── Back ── */}
        <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
        </button>

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-2.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
              <Bell className="h-3 w-3 text-blue-600" />
              <span className="text-[8px] font-bold text-blue-700 tracking-widest uppercase font-manrope">
                Activity feed
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-poppins">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-manrope leading-relaxed">
              Alerts, data changes, and workspace activity — all in one place.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="h-8 w-8 flex items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-40"
              title="Refresh"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              disabled={notifications.length === 0}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all font-manrope disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-sm border border-red-100 bg-red-50">
            <div className="flex items-center gap-2.5">
              {error.includes("Connection")
                ? <WifiOff className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                : <CloudOff className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              }
              <p className="text-[11px] font-semibold text-red-700 font-manrope">{error}</p>
            </div>
            <button
              onClick={fetchNotifications}
              className="text-[10px] font-bold text-red-700 hover:text-red-900 font-manrope underline flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Notification list ── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">

          {/* List header */}
          {!loading && notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope">
                {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </p>
              {unreadCount === 0 && (
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 font-manrope">
                  <CheckCheck className="h-3 w-3" />
                  All caught up
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="divide-y divide-slate-100">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )}

          {/* Empty */}
          {!loading && notifications.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              {/* SVG illustration */}
              <svg
                width="80" height="80" viewBox="0 0 80 80" fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mb-5 opacity-40"
              >
                <rect x="16" y="24" width="48" height="40" rx="6" fill="#E2E8F0" />
                <rect x="24" y="32" width="32" height="4" rx="2" fill="#CBD5E1" />
                <rect x="24" y="40" width="24" height="4" rx="2" fill="#CBD5E1" />
                <rect x="24" y="48" width="16" height="4" rx="2" fill="#CBD5E1" />
                <circle cx="56" cy="22" r="10" fill="#DBEAFE" />
                <path d="M52 22l3 3 5-5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-bold text-slate-700 font-poppins">You're all caught up</p>
              <p className="text-xs text-slate-400 font-manrope mt-1.5 max-w-xs">
                DataPulse will notify you here when something changes in your workspaces.
              </p>
            </div>
          )}

          {/* Notification cards */}
          {!loading && notifications.length > 0 && (
            <div>
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  n={n}
                  processingId={processingId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom note */}
        {!loading && notifications.length > 0 && (
          <p className="text-center text-[10px] text-slate-400 font-manrope mt-4">
            Notifications are sorted newest first · All times shown in local time
          </p>
        )}
      </div>

      {/* ── Clear all modal ── */}
      {showClearModal && (
        <ModalShell>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] p-4">
            <div className="w-full max-w-[360px] bg-white rounded-sm border border-slate-200 shadow-2xl shadow-slate-900/10 p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-10 h-10 rounded-sm border border-red-100 bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-poppins mb-1">
                  Clear all notifications?
                </h3>
                <p className="text-xs text-slate-500 font-manrope leading-relaxed max-w-[260px]">
                  This will permanently remove your entire activity history. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 h-9 rounded-sm border border-slate-200 text-[11px] font-bold text-slate-500 font-manrope tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setClearingAll(true);
                    await api.delete("/notifications");
                    setNotifications([]);
                    setShowClearModal(false);
                    setClearingAll(false);
                  }}
                  disabled={clearingAll}
                  className="flex-1 h-9 rounded-sm bg-red-600 hover:bg-red-700 text-[11px] font-bold text-white font-manrope tracking-widest transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {clearingAll
                    ? <><Loader2 className="h-3 w-3 animate-spin" />Clearing…</>
                    : "Clear all"
                  }
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};