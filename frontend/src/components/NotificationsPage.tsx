import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { api } from "../services/api";
import {
  Trash2, Inbox, Loader2, ArrowLeft, Database,
  ArrowUp, ArrowDown, Table, Columns, ExternalLink, Clock, RotateCw, AlertTriangle,
  WifiOff, CloudOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModalShell } from "./ModelShell";
import { Link } from "react-router-dom";


type Priority = "low" | "info" | "warning" | "critical";

interface Payload {
  workspace_name?: string | null;
  event?: string | null;
  violations_count?: number | null;
  rows_from?: number | null;
  rows_to?: number | null;
  cols_from?: number | null;
  cols_to?: number | null;
  schema_added?: number | null;
  schema_removed?: number | null;
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

const formatPreciseTime = (date: string) => {
  const d = new Date(date);
  return d.toLocaleString('en-GB', { 
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });
};

const getStatusLabel = (n: Notification) => {
  const p = n.payload;

  // NEW: Dedicated polling error label (most important)
  if (n.notification_type === "polling_error") {
    if (n.priority === "critical") {
      return { text: "Polling Stopped", color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold" };
    }
    return { text: "Polling Issue", color: "text-amber-700 bg-amber-50 border-amber-100 font-manrope font-bold" };
  }

  if (p?.event === "data_violation" || n.priority === "critical") 
    return { text: "Action Needed", color: "text-red-700 bg-red-50 border-red-100 font-manrope font-bold" };

  if (p?.event === "pipeline_failure" || n.priority === "warning") 
    return { text: "Issue Found", color: "text-amber-700 bg-amber-50 border-amber-100 font-manrope font-bold" };
  
  // Handle non-data events (like deletions or generic alerts)
  if (!p && (n.notification_type === "alert" || n.priority === "info"))
    return { text: "Update", color: "text-slate-700 bg-slate-50 border-slate-100 font-manrope font-bold" };
    
  return { text: "Healthy", color: "text-emerald-700 bg-emerald-50 border-emerald-100 font-manrope font-bold" };
};


const getVerbalFeedback = (n: Notification) => {
  const p = n.payload;

  if (n.notification_type === "polling_error") {
    return n.message;
  }

  let feedback = !p ? n.message : "";

  if (p) {
    if (p.event === "data_violation") {
      feedback = `Quality check failed: ${p.violations_count || 1} violations detected in your dataset.`;
    } else {
      const rowsChanged = p.rows_from !== undefined && p.rows_to !== undefined && p.rows_from !== p.rows_to;
      const colsChanged = p.cols_from !== undefined && p.cols_to !== undefined && p.cols_from !== p.cols_to;

      if (rowsChanged && colsChanged) {
        feedback = `Data structure and volume updated: Row count shifted from ${p.rows_from} to ${p.rows_to}, and columns changed from ${p.cols_from} to ${p.cols_to}.`;
      } else if (rowsChanged) {
        const direction = (p.rows_to ?? 0) > (p.rows_from ?? 0) ? "increased" : "decreased";
        feedback = `Data volume ${direction}: Your previous upload had ${p.rows_from} rows, and it has now ${direction} to ${p.rows_to} rows.`;
      } else if (colsChanged) {
        feedback = `Schema modification: Row count remains stable at ${p.rows_from}, but columns have been updated from ${p.cols_from} to ${p.cols_to}.`;
      } else {
        feedback =
          p.rows_to !== undefined && p.cols_to !== undefined
            ? `Dataset processed successfully. ${p.rows_to} rows and ${p.cols_to} columns verified.`
            : "Dataset processed successfully. No structural changes detected.";
      }
    }
  }

  return n.ai_insight ? `${feedback} Tip: ${n.ai_insight}` : feedback;
};

const CardSkeleton = () => (
  <div className="flex bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-5 animate-pulse">
    <div className="flex-1 space-y-4">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
      <div className="h-3 bg-gray-50 rounded w-3/4" />
      <div className="flex gap-3 mt-4">
        <div className="h-8 bg-gray-50 rounded w-24" />
        <div className="h-8 bg-gray-50 rounded w-24" />
      </div>
    </div>
  </div>
);

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    try {
      const res = await api.get<Notification[]>("/notifications", { signal: abortRef.current.signal });
      const sorted = res.data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(sorted);

      if (sorted.some(n => !n.is_read)) {
        api.post("/notifications/read-all").catch(() => {});
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
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

  const handleDelete = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      setError("Unable to complete deletion. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderCard = (n: Notification) => {
    const p = n.payload;
    const status = getStatusLabel(n);
    const feedback = getVerbalFeedback(n);

    return (
      <div className="group flex bg-white hover:bg-[#F9FAFB] border-b border-gray-200 last:border-0 transition-colors">
        <div className="flex-1 min-w-0 p-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-gray-900 truncate">
                {p?.workspace_name || (n.notification_type === "alert" ? "Console Update" : "System Update")}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status.color}`}>
                {status.text}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-gray-400 font-medium">
              <div className="hidden sm:flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatPreciseTime(n.created_at)}</div>
              <button onClick={() => handleDelete(n.id)} className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                {processingId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-4">
            {n.priority === 'critical' ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5" /> : <Database className="h-3.5 w-3.5 text-blue-400 mt-0.5" />}
            <p className="text-[12px] text-gray-600 font-medium leading-relaxed max-w-[700px]">
              {feedback}
            </p>
          </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* ROWS */}
              {p?.rows_to !== undefined && (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded text-[11px] font-medium">
                  <Table className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">Rows:</span>

                  {p.rows_from !== undefined ? (
                    <>
                      <span className="text-gray-900">{p.rows_from}</span>

                      {p.rows_to !== p.rows_from ? (
                        (p.rows_to ?? 0) > (p.rows_from ?? 0) ? (
                          <ArrowUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-600" />
                        )
                      ) : (
                        <span className="text-gray-400 text-[10px] font-semibold">
                          (no change)
                        </span>
                      )}

                      <span className="text-gray-900 font-bold">{p.rows_to}</span>
                    </>
                  ) : (
                    <span className="text-gray-900 font-bold">{p.rows_to}</span>
                  )}
                </div>
              )}

              {/* COLUMNS (make it consistent with rows) */}
              {p?.cols_to !== undefined && (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded text-[11px] font-medium">
                  <Columns className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">Columns:</span>

                  {p.cols_from !== undefined ? (
                    <>
                      <span className="text-gray-900">{p.cols_from}</span>

                      {p.cols_to !== p.cols_from ? (
                        (p.cols_to ?? 0) > (p.cols_from ?? 0) ? (
                          <ArrowUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-600" />
                        )
                      ) : (
                        <span className="text-gray-400 text-[10px] font-semibold">
                          (no change)
                        </span>
                      )}

                      <span className="text-gray-900 font-bold">{p.cols_to}</span>
                    </>
                  ) : (
                    <span className="text-gray-900 font-bold">{p.cols_to}</span>
                  )}
                </div>
              )}

              {n.action_url && (
                <Link
                  to={n.action_url}
                  className="
                    inline-flex items-center gap-1
                    text-[11px] font-semibold
                    text-slate-500
                    hover:text-slate-900
                    transition-colors
                    mt-1
                    sm:mt-0
                    sm:ml-auto
                    whitespace-nowrap
                  "
                >
                  View details
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              <div className="text-[10px] text-gray-400 font-medium ml-auto sm:hidden whitespace-nowrap">
                {formatPreciseTime(n.created_at)}
              </div>

            </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-gray-900 font-sans antialiased">
      <div className="max-w-[1200px] mx-auto px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between border-b border-gray-200 pb-5 gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-900 mb-3 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
              Notifications
            </h1>

            <p className="text-[12px] text-gray-500 mt-1 font-medium">
              Important updates, alerts, and data activity for your workspace.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 pt-4 sm:pt-0">
            <button
              onClick={fetchNotifications}
              className="p-2 text-gray-500 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center"
              title="Refresh notifications"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              disabled={notifications.length === 0}
              className="flex-1 sm:flex-none text-[12px] font-semibold px-5 py-2.5 bg-white border border-gray-300 rounded text-gray-600 hover:text-red-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear notifications
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-white border border-red-100 rounded shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              {error.includes("Connection") ? <WifiOff className="h-4 w-4 text-red-500" /> : <CloudOff className="h-4 w-4 text-red-500" />}
              <span className="text-[12px] font-bold text-red-800">{error}</span>
            </div>
            <button onClick={fetchNotifications} className="text-[11px] font-black uppercase tracking-tighter text-red-900 underline">Refresh</button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-24 text-center">
              <Inbox className="h-10 w-10 text-gray-200 mx-auto mb-4" />
              <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">No New Activity</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">{notifications.map(renderCard)}</div>
          )}
        </div>
      </div>

      {showClearModal && (
        <ModalShell>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/10 backdrop-blur-sm p-4">
            <div className="w-full max-w-[360px] bg-white rounded-lg p-6 shadow-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Delete all notifications?</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed">This will permanently remove your activity history. This cannot be undone.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setShowClearModal(false)} 
                  className="px-4 py-2 text-[12px] font-bold font-manrope text-gray-400 hover:text-gray-900 rounded-none"
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
                  className="px-5 py-2 bg-gray-900 text-white text-[12px] font-bold font-manrope rounded-none hover:bg-black transition-all flex items-center justify-center min-w-[100px]"
                >
                  {clearingAll ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "Confirm delete"}
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};