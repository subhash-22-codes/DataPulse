import React, { useEffect, useState, Fragment, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Settings, AlertCircle, Bell } from "lucide-react";
import { DescriptionCard } from "./DescriptionCard";
import { TeamMembersCard } from "./TeamMembersCard";
import { DataSourceCard } from "./DataSourceCard";
import { DataHistoryCard } from "./DataHistoryCard";
import { SettingsCard } from "./SettingsCard";
import { Link} from "react-router-dom";
import { AlertsCard } from './AlertsCard'
import { Workspace, DataUpload } from "../../types";
import { Tab } from "@headlessui/react";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import NotificationsCard from "./NotificationsCard";
// Helper function for styling (from original code)
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

type IncidentSummaryItem = {
  status: string;
  severity: string;
  issue_type: string;
};

const WorkspaceDetail: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- State Declarations (Unchanged) ---
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);
  const [lastUpload, setLastUpload] = useState<DataUpload | null>(null); 
  const [incidentSummary, setIncidentSummary] = useState<{
    activeCount: number;
    highCount: number;
    schemaStable: boolean;
  } | null>(null);
  // ----------------------------------------

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError(""); 
    try {
      const res = await api.get<Workspace>(`/workspaces/${id}`);
      setWorkspace(res.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 404) {
        setError("This workspace could not be found. It may have been deleted by the owner.");
      } else {
        setError("An unexpected error occurred. Failed to load workspace.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]); 
  

  const fetchIncidentSummary = useCallback(async () => {
  if (!id) return;
  try {
    const res = await api.get<IncidentSummaryItem[]>(`/workspaces/${id}/incidents`);
    const incidents = Array.isArray(res.data) ? res.data : [];
    const active = incidents.filter((i) => i.status === "open");
    const high = active.filter((i) => i.severity === "high");
    const schemaStable = !active.some((i) => i.issue_type === "schema_breaking_change");
    setIncidentSummary({ activeCount: active.length, highCount: high.length, schemaStable });
  } catch (err) {
    console.error("fetchIncidentSummary failed", err);
  }
}, [id]);
  // Initial Fetch Effect
  useEffect(() => {
    if (id) fetchWorkspace();
  }, [id, fetchWorkspace]); 


 const socketRef = useRef<WebSocket | null>(null);

useEffect(() => {
  if (!id || !user) return;

  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  const RECONNECT_DELAY = 3000;

  const startPing = (ws: WebSocket) => {
    if (pingInterval) clearInterval(pingInterval);

    pingInterval = setInterval(() => {
      if (document.hidden) return; // don't ping in background
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 30000);
  };

  const connect = async () => {
    // ✅ Guard inside connect too
    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // Fetch a short-lived ticket first — this call goes through the
    // Vercel proxy (same-origin), so our normal auth cookies work fine
    // here. The ticket is what proves identity to Render, since cookies
    // themselves can't travel from vercel.app to onrender.com.
    let ticket: string;
    try {
      const ticketRes = await api.get<{ ticket: string }>("/auth/ws-ticket");
      ticket = ticketRes.data.ticket;
    } catch (err) {
      console.error("🔌 Failed to fetch WS ticket, will retry", err);
      retryTimeout = setTimeout(connect, RECONNECT_DELAY);
      return;
    }

    const isSecure = window.location.protocol === "https:";
    const wsProtocol = isSecure ? "wss" : "ws";
    const envWsUrl = import.meta.env.VITE_WS_URL;

    let wsUrl: string;
    if (envWsUrl) {
      const sanitizedEnvUrl = envWsUrl.replace(/^(ws|wss):\/\//, "");
      wsUrl = `${wsProtocol}://${sanitizedEnvUrl}/api/workspaces/${id}/ws/${Date.now()}?ticket=${ticket}`;
    } else {
      wsUrl = `${wsProtocol}://${window.location.host}/api/workspaces/${id}/ws/${Date.now()}?ticket=${ticket}`;
    }

    console.log(`🔌 Attempting WS Connection`);

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WS Connected Successfully");
      startPing(ws);
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") return;

      try {
        const data = JSON.parse(event.data);

        if (data.type === "job_complete") {
          setIsProcessing(false);
          setRefreshHistoryKey((prev) => prev + 1);
          fetchIncidentSummary(); 

          if (data.status === "failed") {
            setWorkspace((prev) =>
              prev
                ? {
                    ...prev,
                    is_polling_active: false,
                    last_failure_reason: data.error,
                  }
                : null
            );
            toast.error(data.error || "Sync failed.");
          } else {
            setWorkspace((prev) =>
              prev
                ? {
                    ...prev,
                    is_polling_active: true,
                    failure_count: 0,
                  }
                : null
            );
          }
        }

        if (data.type === "job_error") {
          // non-terminal error, keep polling
          toast.error(data.error || "Temporary error.");
        }

      } catch (err) {
        console.error(err);
      }
    };

    ws.onclose = (e) => {
      console.log(`🔌 WS Closed (${e.code})`);
      if (pingInterval) clearInterval(pingInterval);

      socketRef.current = null;

      // ✅ reconnect only if visible and not a clean/manual close
      if (!document.hidden && e.code !== 1000) {
        retryTimeout = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = (e) => {
      console.error("🔌 WS Socket Error:", e);
    };
  };

  connect();

  const handleVisibilityChange = () => {
    // ✅ only reconnect if we lost socket
    if (!document.hidden) {
      if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (pingInterval) clearInterval(pingInterval);

    socketRef.current?.close(1000, "Component unmount");
    socketRef.current = null;

    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [id, user, fetchIncidentSummary]);


  const handleHistoryLoaded = useCallback((manualUploads: DataUpload[], scheduledFetches: DataUpload[]) => {
      const allUploads = [...manualUploads, ...scheduledFetches];
      if (allUploads.length === 0) {
          setLastUpload(null);
          return;
      }
      allUploads.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      setLastUpload(allUploads[0]);
  }, []);

  const updateWorkspaceData = (updatedData: Partial<Workspace>) => {
    if (!workspace) return;
    setWorkspace({ ...workspace, ...updatedData });
  };

  const handleUploadStart = () => {
      setIsProcessing(true);
  };

if (loading) {
  return (
    <div className="min-h-screen workspace-background bg-slate-50/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        
        {/* Clear, Thick Data Bars (no fade, no childish pulse feel) */}
        <div className="flex items-end gap-2 h-10">
          <div className="w-2 h-4 bg-slate-400 rounded-sm animate-[pulse_1.2s_ease-in-out_infinite]" />
          <div className="w-2 h-7 bg-blue-600 rounded-sm animate-[pulse_1.2s_ease-in-out_0.1s_infinite]" />
          <div className="w-2 h-9 bg-emerald-600 rounded-sm animate-[pulse_1.2s_ease-in-out_0.2s_infinite]" />
          <div className="w-2 h-6 bg-amber-500 rounded-sm animate-[pulse_1.2s_ease-in-out_0.3s_infinite]" />
          <div className="w-2 h-8 bg-blue-600 rounded-sm animate-[pulse_1.2s_ease-in-out_0.4s_infinite]" />
          <div className="w-2 h-5 bg-slate-500 rounded-sm animate-[pulse_1.2s_ease-in-out_0.5s_infinite]" />
        </div>

        {/* Simple, professional wording */}
        <span className="text-sm font-semibold font-manrope text-slate-500 tracking-tight">
          Loading workspace
        </span>
      </div>
    </div>
  );
}


if (error) {
  return (
    <div className="min-h-screen workspace-background bg-slate-50/50 flex items-center justify-center px-4">
      <div className="flex w-full max-w-[320px] flex-col items-center rounded-sm border border-slate-200 bg-white p-8 shadow-sm">
        
        {/* Soft, simple icon */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-sm bg-slate-50 text-slate-400">
          <AlertCircle className="h-5 w-5 stroke-[1.5]" />
        </div>

        {/* Header */}
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
          Unable to load workspace
        </h2>

        {/* Description */}
        <p className="mt-2 text-[12px] font-medium text-slate-500 leading-relaxed text-center">
          {error || "Temporary issue while loading this workspace."}
        </p>

        {/* Actions */}
        <div className="mt-8 w-full flex flex-col sm:flex-row gap-3">
          <button
            onClick={fetchWorkspace}
            className="
              w-full
              h-10
              flex items-center justify-center
              rounded-sm bg-blue-600 
              text-[10px] font-bold text-white font-manrope tracking-[0.15em]
              transition-all hover:bg-blue-700 active:scale-[0.98]
            "
          >
            Retry
          </button>

          <button
            onClick={() => navigate("/home")}
            className="
              w-full
              h-10
              flex items-center justify-center
              rounded-sm border border-slate-200 bg-white
              text-[10px] font-bold text-slate-700 font-manrope tracking-[0.15em]
              transition-all hover:bg-slate-50 active:scale-[0.98]
            "
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}


if (!workspace) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-500 text-center">
        Workspace not found.
      </p>
    </div>
  );
}


  const isOwner = String(workspace.owner_id) === String(user?.id);
  const healthScore = lastUpload?.analysis_results?.quality_report?.dataset_health_score;

  return (
    <div className="workspace-background min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Header */}
        <header className="mb-10">
          <button 
            onClick={() => navigate("/home")} 
            className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-200 shadow-sm mr-3 group-hover:border-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Home
          </button>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {workspace.name}
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl">
            Manage your workspace details, collaborate with your team, and monitor data sources.
          </p>
        </header>

        {/* Tabs & Content */}
        <Tab.Group>
          <div className="mb-8 border-b border-slate-200/60">
            <Tab.List className="flex gap-8">
              <Tab as={Fragment}>
                {({ selected }) => (
                  <button
                    className={classNames(
                      "group relative pb-4 text-sm font-medium transition-colors focus:outline-none",
                      selected ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className={classNames("h-4 w-4", selected ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                      Dashboard
                    </div>
                    <span 
                      className={classNames(
                        "absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 transition-transform duration-300 ease-out",
                        selected ? "scale-x-100" : "scale-x-0"
                      )} 
                    />
                  </button>
                )}
              </Tab>

              <Tab as={Fragment}>
                {({ selected }) => (
                  <button
                    className={classNames(
                      "group relative pb-4 text-sm font-medium transition-colors focus:outline-none",
                      selected ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Bell
                        className={classNames(
                          "h-4 w-4",
                          selected
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      Notifications
                    </div>
                    <span
                      className={classNames(
                        "absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 transition-transform duration-300 ease-out",
                        selected ? "scale-x-100" : "scale-x-0"
                      )}
                    />
                  </button>
                )}
              </Tab>


              {isOwner && (
                <Tab as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={classNames(
                        "group relative pb-4 text-sm font-medium transition-colors focus:outline-none",
                        selected ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Settings className={classNames("h-4 w-4", selected ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                        Settings
                      </div>
                      <span 
                        className={classNames(
                          "absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 transition-transform duration-300 ease-out",
                          selected ? "scale-x-100" : "scale-x-0"
                        )} 
                      />
                    </button>
                  )}
                </Tab>
              )}
            </Tab.List>
          </div>

          <Tab.Panels className="mt-2">
            
            {/* Dashboard Panel */}
            <Tab.Panel className="focus:outline-none space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                  <DescriptionCard 
                    workspace={workspace} 
                    isOwner={isOwner} 
                    onUpdate={updateWorkspaceData} 
                  />
                  <TeamMembersCard 
                    workspace={workspace} 
                    isOwner={isOwner} 
                    onUpdate={updateWorkspaceData} 
                  />
                  <DataSourceCard 
                    workspace={workspace} 
                    isOwner={isOwner} 
                    onUpdate={updateWorkspaceData} 
                    onUploadStart={handleUploadStart} 
                    lastUpload={lastUpload} 
                  />
              </div>

              <div className="w-full space-y-4">
                {/* Module cards */}
                {/* Module cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* Trends */}
                  <Link
                    to={`/workspace/${id}/trends`}
                    className="group relative flex flex-col overflow-hidden rounded-sm border border-slate-200 bg-white transition-all hover:border-blue-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                  >
                    <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-poppins">Trends</p>
                        <p className="text-xs text-slate-500 mt-1 font-manrope leading-relaxed">
                          Historical volume and schema stability
                        </p>
                      </div>
                      <img src="/images/trends.svg" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
                    </div>
                    <div className="px-5 pb-4 mt-auto flex items-center gap-4 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-manrope">Latest rows</p>
                        <p className="text-base font-bold text-slate-900 font-poppins tabular-nums">
                          {lastUpload ? lastUpload?.analysis_results?.row_count?.toLocaleString() ?? "—" : "—"}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-slate-100" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-manrope">Schema</p>
                        <p
                          className={classNames(
                            "text-base font-bold font-poppins",
                            incidentSummary === null
                              ? "text-slate-900"
                              : incidentSummary.schemaStable
                              ? "text-emerald-600"
                              : "text-red-600"
                          )}
                        >
                          {incidentSummary === null ? "—" : incidentSummary.schemaStable ? "Stable" : "Changed"}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Incidents */}
                  <Link
                    to={`/workspace/${id}/incidents`}
                    className={classNames(
                      "group relative flex flex-col overflow-hidden rounded-sm border bg-white transition-all hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]",
                      incidentSummary && incidentSummary.highCount > 0
                        ? "border-red-300 hover:border-red-400"
                        : incidentSummary && incidentSummary.activeCount > 0
                        ? "border-amber-300 hover:border-amber-400"
                        : "border-slate-200 hover:border-amber-300"
                    )}
                  >
                    <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-poppins">Incidents</p>
                        <p className="text-xs text-slate-500 mt-1 font-manrope leading-relaxed">
                          Active alerts and ingestion failures
                        </p>
                      </div>
                      <img src="/images/incident.svg" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
                    </div>
                    <div className="px-5 pb-4 mt-auto flex items-center gap-4 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-manrope">Active</p>
                        <p
                          className={classNames(
                            "text-base font-bold font-poppins tabular-nums",
                            incidentSummary && incidentSummary.activeCount > 0 ? "text-amber-600" : "text-slate-900"
                          )}
                        >
                          {incidentSummary?.activeCount ?? "—"}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-slate-100" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-manrope">High severity</p>
                        <p
                          className={classNames(
                            "text-base font-bold font-poppins tabular-nums",
                            incidentSummary && incidentSummary.highCount > 0 ? "text-red-600" : "text-slate-900"
                          )}
                        >
                          {incidentSummary?.highCount ?? "—"}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Column Health */}
                  <Link
                    to={`/workspace/${id}/columns-health`}
                    className="group relative flex flex-col overflow-hidden rounded-sm border border-slate-200 bg-white transition-all hover:border-emerald-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                  >
                    <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-poppins">Column health</p>
                        <p className="text-xs text-slate-500 mt-1 font-manrope leading-relaxed">
                          Per-column missing and uniqueness trends
                        </p>
                      </div>
                      <img src="/images/column.svg" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
                    </div>
                    <div className="px-5 pb-4 mt-auto flex items-center gap-4 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-manrope">Columns</p>
                        <p className="text-base font-bold text-slate-900 font-poppins tabular-nums">
                          {lastUpload ? lastUpload?.analysis_results?.column_count?.toLocaleString() ?? "—" : "—"}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-slate-100" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-manrope">Health score</p>
                        <p
                          className={classNames(
                            "text-base font-bold font-poppins tabular-nums",
                            healthScore == null
                              ? "text-slate-900"
                              : healthScore >= 75
                              ? "text-emerald-600"
                              : healthScore >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {healthScore != null ? Math.round(healthScore) : "—"}
                        </p>
                      </div>
                    </div>
                  </Link>

                </div>
                <DataHistoryCard 
                  workspace={workspace} 
                  isProcessing={isProcessing} 
                  key={refreshHistoryKey} 
                  isOwner={isOwner} 
                  onUploadsUpdate={handleHistoryLoaded}  
                />
              </div>
            </Tab.Panel>

           <Tab.Panel className="focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full">
                {user && (
                  <NotificationsCard
                    workspaceId={workspace.id}
                    currentUserId={user.id}
                  />
                )}
              </div>
            </Tab.Panel>

            {/* Settings Panel */}
            {isOwner && (
              <Tab.Panel className="focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 gap-8 w-full">
                  <div className="w-full">
                    <AlertsCard workspace={workspace} isOwner={isOwner} />
                  </div>
                  <div className="w-full">
                    <SettingsCard workspace={workspace} isOwner={isOwner} />
                  </div>
                </div>
              </Tab.Panel>
            )}

          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default WorkspaceDetail;