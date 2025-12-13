import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, LayoutDashboard, Settings, AlertCircle } from "lucide-react";
import { DescriptionCard } from "./DescriptionCard";
import { TeamMembersCard } from "./TeamMembersCard";
import { DataSourceCard } from "./DataSourceCard";
import { DataHistoryCard } from "./DataHistoryCard";
import { SettingsCard } from "./SettingsCard";
import { AlertsCard } from './AlertsCard'
import { Workspace, DataUpload } from "../../types";
import { Tab } from "@headlessui/react";
import { AxiosError } from "axios";

// Helper function for styling (from original code)
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

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

  // Initial Fetch Effect
  useEffect(() => {
    if (id) fetchWorkspace();
  }, [id, fetchWorkspace]); 

  // ---------------------------------------------------------
  // ✅ PRODUCTION-READY WEBSOCKET IMPLEMENTATION
  // ---------------------------------------------------------
 useEffect(() => {
    // 1. Guard Clause: Requires ID and authenticated user
    if (!id || !user) return;

    let socket: WebSocket | null = null;
    let retryTimeout: NodeJS.Timeout;
    const RECONNECT_DELAY = 3000;

    const connect = () => {
        // Optimization: Do not connect if the tab is hidden
        if (document.hidden) return;

        const isSecure = window.location.protocol === 'https:';
        const wsProtocol = isSecure ? 'wss' : 'ws';
        
        const envWsUrl = import.meta.env.VITE_WS_URL; 
        let wsUrl: string;

        // --- 🎯 The Production Fix & Path Correction ---
        if (envWsUrl) {
            // PRODUCTION (Vercel → Render): Connect directly to the external host
            const sanitizedEnvUrl = envWsUrl.replace(/^(ws|wss):\/\//, ''); 
            // NOTE: The /api/ prefix has been REMOVED from the path here:
            wsUrl = `${wsProtocol}://${sanitizedEnvUrl}/api/workspaces/${id}/ws/${Date.now()}`;
        } else {
            // DEVELOPMENT (local Vite server): Connect to the current host
            const host = window.location.host;
            // NOTE: The /api/ prefix has been REMOVED from the path here:
            wsUrl = `${wsProtocol}://${host}/api/workspaces/${id}/ws/${Date.now()}`;
        }
        // ---------------------------------------------

        console.log(`🔌 Connecting WS for Live Updates to: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            if (event.data === "job_complete" || event.data === "job_error") {
                setIsProcessing(false);
                setRefreshHistoryKey((prev) => prev + 1);
            }
        };

        socket.onclose = (e) => {
            if (!document.hidden && e.code !== 1000) {
                console.log(`🔌 WS closed unexpectedly (${e.code}). Retrying in ${RECONNECT_DELAY}ms...`);
                retryTimeout = setTimeout(connect, RECONNECT_DELAY);
            }
        };
        
        socket.onerror = (e) => {
            console.error("🔌 WS Error:", e);
        };
    };

    connect();

    const handleVisibilityChange = () => {
        if (document.hidden) {
            socket?.close(1000, "Tab hidden");
        } else {
            connect();
            setRefreshHistoryKey(k => k + 1); 
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
        socket?.close(1000, "Component unmount");
        clearTimeout(retryTimeout);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    
}, [id, user, setIsProcessing, setRefreshHistoryKey]);
  // --- Other Handlers (Unchanged) ---
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm font-medium text-gray-500">
          Loading workspace…
        </p>
      </div>
    </div>
  );
}


  if (error) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="flex max-w-md flex-col items-center rounded-lg border border-gray-200 bg-white px-6 py-10 text-center">
        
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h2 className="text-sm font-semibold text-gray-900">
          Unable to load workspace
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {error}
        </p>

        <button
          onClick={() => navigate("/home")}
          className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Return to dashboard
        </button>
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

              <div className="w-full">
                <DataHistoryCard 
                  workspace={workspace} 
                  isProcessing={isProcessing} 
                  key={refreshHistoryKey} 
                  isOwner={isOwner} 
                  onUploadsUpdate={handleHistoryLoaded}  
                />
              </div>
            </Tab.Panel>


            {/* Settings Panel */}
            {isOwner && (
              <Tab.Panel className="focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* REMOVED max-w-4xl to allow full width like the dashboard */}
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