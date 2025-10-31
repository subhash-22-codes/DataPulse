import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Building, Users, Plus, WifiOff, FileText, Globe, Calendar, Server } from "lucide-react";
import { AxiosError } from "axios";
import { Workspace } from "../types";
import { CreateWorkspaceModal } from "../components/CreateWorkspaceModal";
import { Skeleton } from "../components/Skeleton";

// --- FINAL, POLISHED WORKSPACE CARD ---
const WorkspaceCard: React.FC<{ ws: Workspace; onClick: (id: string) => void; isOwner: boolean; }> = ({ ws, onClick, isOwner }) => {
    return (
        <div
            onClick={() => onClick(ws.id)}
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
        >
            <div className="flex-grow">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm ${isOwner ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                            {isOwner ? <Building className="w-6 h-6 text-white" /> : <Users className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors duration-200">{ws.name}</h3>
                            {!isOwner && <p className="text-sm text-gray-600 font-medium">by {ws.owner.name || ws.owner.email}</p>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            
            {/* --- THIS IS THE UPDATED FOOTER --- */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                {/* Left Side: Team & Data Source */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{ws.team_members?.length || 0} Members</span>
                    </div>
                    {ws.data_source && (
                        <div
                            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                                ws.data_source === 'API' ? 'bg-indigo-50 text-indigo-700' :
                                ws.data_source === 'DB' ? 'bg-purple-50 text-purple-700' :
                                'bg-green-50 text-green-700'
                            }`}
                        >
                            {ws.data_source === 'API' && <Globe className="w-3.5 h-3.5" />}
                            {ws.data_source === 'DB' && <Server className="w-3.5 h-3.5" />}
                            {ws.data_source === 'CSV' && <FileText className="w-3.5 h-3.5" />}
                            <span>{ws.data_source}</span>
                        </div>
                    )}
                </div>

                {/* --- NEW: Polling Status Indicator (Right Side) --- */}
                {/* This block only appears for API or DB sources */}
                {(ws.data_source === 'API' || ws.data_source === 'DB') && (
                    ws.is_polling_active ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium" title="Polling is Active">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium" title="Polling is Paused">
                             <span className="flex h-2 w-2">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                            </span>
                            Paused
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT 2: The Skeleton Loader ---
const HomeSkeleton: React.FC = () => {
    const SkeletonCard = () => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
            <Skeleton className="h-4 w-28 mb-4"/>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-16" />
            </div>
        </div>
    );

    return (
        <div className="space-y-12">
            <section>
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </section>
            <section>
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SkeletonCard />
                </div>
            </section>
        </div>
    );
};

// ===================================
//  MAIN HOME COMPONENT
// ===================================
const Home: React.FC = () => {
  const { user, token } = useAuth();
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const navigate = useNavigate();
const fetchData = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  setError("");
  setIsNetworkError(false);
  try {
    const [ownedRes, teamRes] = await Promise.all([
      api.get<Workspace[]>("/workspaces/", { headers: { Authorization: `Bearer ${token}` } }),
      api.get<Workspace[]>("/workspaces/team/", { headers: { Authorization: `Bearer ${token}` } })
    ]);
    setOwnedWorkspaces(ownedRes.data);
    setTeamWorkspaces(teamRes.data);
  } catch (err) {
    if (err instanceof AxiosError && err.code === "ERR_NETWORK") {
      setError("Could not connect to the DataPulse server. It may be offline.");
      setIsNetworkError(true);
    } else {
      setError("Failed to fetch workspaces.");
    }
  } finally {
    setLoading(false);
  }
}, [token]); // 👈 dependencies used inside the function

useEffect(() => {
  fetchData();
}, [fetchData]); // 👈 stable now, no warning

  
  const handleWorkspaceClick = (id: string) => navigate(`/workspace/${id}`);
  
  const handleWorkspaceCreated = (newWorkspace: Workspace) => {
    setOwnedWorkspaces(prev => [...prev, newWorkspace]);
  };

  const canCreateWorkspace = ownedWorkspaces.length < 3;

  return (
    <div className="workspace-background bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-12 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || user?.email}!</h1>
            <p className="text-base text-gray-500 mt-1"> Your Mission Control Dashboard for workspace management.</p>
          </div>
          <button 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!canCreateWorkspace}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                         self-end sm:self-auto  // <-- THIS IS THE FIX: Align right on mobile, reset for desktop
                         p-2.5 sm:px-4 sm:py-2 sm:gap-2" // Responsive padding
              title={canCreateWorkspace ? "Create a new workspace" : "You have reached the maximum of 3 workspaces"}
          >
              <Plus className="w-5 h-5"/>
              <span className="">New Workspace</span>
          </button>
        </header>

        {loading ? (
          <HomeSkeleton />
        ) : isNetworkError ? (
          <div className="text-center py-16 bg-white rounded-lg border border-red-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><WifiOff className="h-8 w-8 text-red-500" /></div>
            <h3 className="text-xl font-semibold text-gray-800">Connection Error</h3>
            <p className="text-red-600 mt-2">{error}</p>
            <button onClick={fetchData} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Retry</button>
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Workspaces</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedWorkspaces.length > 0 ? (
                  ownedWorkspaces.map(ws => <WorkspaceCard key={ws.id} ws={ws} onClick={handleWorkspaceClick} isOwner={true} />)
                ) : (
                  // --- THIS IS THE POLISHED, SMALLER CARD ---
                  <div 
                    className="bg-white p-6 rounded-xl shadow-sm border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors h-full flex flex-col justify-center"
                    onClick={() => canCreateWorkspace && setIsCreateModalOpen(true)}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Create a Workspace</h3>
                    <p className="text-sm text-gray-500">
                      Click here to start your first project.
                    </p>
                  </div>
                )}
              </div>
            </section>

           <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Workspaces</h2>
              {teamWorkspaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teamWorkspaces.map(ws => <WorkspaceCard key={ws.id} ws={ws} onClick={handleWorkspaceClick} isOwner={false} />)}
                </div>
              ) : (
                // --- THIS IS THE FINAL, POLISHED EMPTY STATE ---
                // It now uses the same grid structure and styling to match the "Create" card
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-300 text-center h-full flex flex-col justify-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Workspaces</h3>
                    <p className="text-sm text-gray-500">
                      When you're invited to collaborate, they'll appear here.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <CreateWorkspaceModal 
        isOpen={isCreateModalOpen}
        setIsOpen={setIsCreateModalOpen}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </div>
  );
};

export default Home;