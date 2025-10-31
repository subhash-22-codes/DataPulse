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

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const WorkspaceDetail: React.FC = () => {
  const { token, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);
  const [lastUpload, setLastUpload] = useState<DataUpload | null>(null); 

 const fetchWorkspace = useCallback(async () => {
  setLoading(true);
  setError(""); // Reset error on new fetch
  try {
    const res = await api.get<Workspace>(`/workspaces/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
}, [token, id]); // 👈 dependencies inside the function

useEffect(() => {
  if (token && id) fetchWorkspace();
}, [token, id, fetchWorkspace]); // 👈 add it here

  useEffect(() => {
    if (!id) return;
    let socket: WebSocket;
    let connectInterval: ReturnType<typeof setTimeout>;
    const connect = () => {
      const clientId = Date.now().toString();
      const wsUrl = `ws://localhost:8000/api/workspaces/${id}/ws/${clientId}`;
      socket = new WebSocket(wsUrl);
      socket.onopen = () => console.log("WebSocket Connected");
      socket.onclose = () => (connectInterval = setTimeout(connect, 2000));
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        if (event.data === "job_complete" || event.data === "job_error") {
          setIsProcessing(false);
          setRefreshHistoryKey((prevKey) => prevKey + 1);
        }
      };
    };
    connect();
    return () => {
      clearTimeout(connectInterval);
      if (socket) socket.close();
    };
  }, [id]);

   const handleHistoryLoaded = useCallback((manualUploads: DataUpload[], scheduledFetches: DataUpload[]) => {
      // Combine ALL uploads from both lists into a single array
      const allUploads = [...manualUploads, ...scheduledFetches];
      
      if (allUploads.length === 0) {
          setLastUpload(null);
          return;
      }
      
      // Sort the combined list to find the true most recent upload
      allUploads.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      
      // The newest upload is now the first item in the sorted list
      setLastUpload(allUploads[0]);
  }, []);

  const updateWorkspaceData = (updatedData: Partial<Workspace>) => {
    if (!workspace) return;
    setWorkspace({ ...workspace, ...updatedData });
  };

  const handleUploadStart = () => setIsProcessing(true);

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><Loader2 className="animate-spin h-10 w-10 text-blue-500" /></div>;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center px-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Oops! Something went wrong.</h2>
        <p className="text-gray-600 mt-2 max-w-md">{error}</p>
        <button
          onClick={() => navigate("/home")}
          className="mt-6 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!workspace) {
    return <div className="flex justify-center items-center h-screen bg-gray-50"><p>No workspace found.</p></div>;
  }
  const isOwner = String(workspace.owner_id) === String(user?.id);

  return (
    <div className="workspace-background bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-8 border-b border-gray-200 pb-5">
          <button onClick={() => navigate("/home")} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </button>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{workspace.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your workspace details, team, data sources, and history.</p>
        </header>

        <Tab.Group>
          <Tab.List className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 rounded-xl p-2 mb-6 w-full">
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={classNames(
                    "flex-1 sm:flex-none px-3 sm:px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-all duration-200",
                    selected
                      ? "bg-white text-blue-700 shadow-md"
                      : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5 shrink-0" />
                  <span className="sm:hidden">Dash</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              )}
            </Tab>

            {isOwner && (
              <Tab as={Fragment}>
                {({ selected }) => (
                  <button
                    className={classNames(
                      "flex-1 sm:flex-none px-3 sm:px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-all duration-200",
                      selected
                        ? "bg-white text-blue-700 shadow-md"
                        : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                    )}
                  >
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className="sm:hidden">Settings</span>
                    <span className="hidden sm:inline">Settings</span>
                  </button>
                )}
              </Tab>
            )}
          </Tab.List>


          <Tab.Panels>
            <Tab.Panel>
              <main className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <DescriptionCard workspace={workspace} isOwner={isOwner} onUpdate={updateWorkspaceData} />
                  <TeamMembersCard workspace={workspace} isOwner={isOwner} onUpdate={updateWorkspaceData} />
                  <DataSourceCard workspace={workspace} isOwner={isOwner} onUpdate={updateWorkspaceData} onUploadStart={handleUploadStart} lastUpload={lastUpload} />
                </div>
                <DataHistoryCard workspace={workspace} isProcessing={isProcessing} key={refreshHistoryKey} isOwner={isOwner} onUploadsUpdate={handleHistoryLoaded}  />
              </main>
            </Tab.Panel>
            {isOwner && (
              <Tab.Panel>
                <div className="space-y-6">
                  <AlertsCard workspace={workspace} isOwner={isOwner} />
                  <SettingsCard workspace={workspace} isOwner={isOwner} />
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