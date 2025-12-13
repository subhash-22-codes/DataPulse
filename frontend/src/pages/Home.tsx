import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Users, Plus, WifiOff, FileText, Globe, Calendar, Server, LayoutGrid, ArrowRight, Clock, Lock, Check, AlertTriangle, X, RefreshCw } from "lucide-react";
import { AxiosError } from "axios";
import { Workspace } from "../types";
import { CreateWorkspaceModal } from "../components/CreateWorkspaceModal";
import { Skeleton } from "../components/Skeleton";

// --- TOAST COMPONENT (Kept for background errors) ---
const ErrorToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-red-200 bg-white p-4 shadow-lg animate-in slide-in-from-bottom-5">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">
      <AlertTriangle className="h-4 w-4" />
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-900">Error</span>
      <span className="text-xs text-gray-500">{message}</span>
    </div>
    <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
      <X className="h-4 w-4" />
    </button>
  </div>
);

// --- WORKSPACE CARD (Unchanged) ---
const WorkspaceCard: React.FC<{
  ws: Workspace;
  onClick: (id: string) => void;
  isOwner: boolean;
  workspaceIndex?: number;
}> = ({ ws, onClick, isOwner, workspaceIndex }) => {
  const getWorkspaceImage = () => {
    const index = workspaceIndex !== undefined ? workspaceIndex : 0;
    const imageNumber = (index % 3) + 1;
    return isOwner ? `/images/Workspace${imageNumber}.png` : `/images/Teamspace${imageNumber}.png`;
  };

  const imageSrc = getWorkspaceImage();

  return (
    <div
      onClick={() => onClick(ws.id)}
      className="group flex h-full cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-50">
          <img src={imageSrc} alt={isOwner ? 'Workspace' : 'Team Workspace'} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">{ws.name}</h3>
          {!isOwner && <p className="mt-0.5 truncate text-xs text-gray-500">by {ws.owner.name || ws.owner.email}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Calendar className="h-3.5 w-3.5 text-gray-400" />
        <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="h-3.5 w-3.5" />
            <span>{ws.team_members?.length || 0} collaborators</span>
          </div>
          {ws.data_source && (
            <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
              ws.data_source === 'API' ? 'bg-indigo-50 text-indigo-700' : 
              ws.data_source === 'DB' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'
            }`}>
              {ws.data_source === 'API' && <Globe className="h-3 w-3" />}
              {ws.data_source === 'DB' && <Server className="h-3 w-3" />}
              {ws.data_source === 'CSV' && <FileText className="h-3 w-3" />}
              <span>{ws.data_source === 'API' ? 'Live API' : ws.data_source === 'DB' ? 'Database' : 'CSV import'}</span>
            </div>
          )}
        </div>
        {(ws.data_source === 'API' || ws.data_source === 'DB') && (
          ws.is_polling_active ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700" title="Data is being refreshed automatically">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500" title="Automatic data refresh is paused">
              <span className="h-2 w-2 rounded-full bg-gray-400" /> Paused
            </div>
          )
        )}
      </div>
    </div>
  );
};

// --- SKELETON COMPONENT (Unchanged) ---
const HomeSkeleton: React.FC = () => {
  const SkeletonCard = () => (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-3"><Skeleton className="h-3 w-28" /></div>
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );

  const SectionSkeleton = ({ count = 3 }) => (
    <section>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </section>
  );

  return (
    <div className="space-y-12">
      <SectionSkeleton count={3} />
      <SectionSkeleton count={3} />
    </div>
  );
};

// ===================================
// MAIN HOME COMPONENT
// ===================================
const Home: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data State
    const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
    const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
    
    // UI State
    const [loading, setLoading] = useState<boolean>(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Error Handling State
    const [blockingError, setBlockingError] = useState<{ type: 'NETWORK' | 'SERVER' | 'UNKNOWN'; message: string } | null>(null);
    const [toastError, setToastError] = useState<string | null>(null);
    
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;

        // FIX: The Flashing Skeleton Logic
        // We only set Loading=true if we have never loaded AND we don't currently have an error on screen.
        // If we have an error on screen, we want to stay on that screen and just spin the button.
        if (!hasLoadedOnce && !blockingError) {
            setLoading(true);
        } else {
            // We are retrying either in background OR from the error screen
            setIsRetrying(true);
        }

        // We do NOT clear blockingError here immediately, 
        // otherwise the UI will flash to empty content before data arrives.

        setToastError(null);

        try {
            const [ownedRes, teamRes] = await Promise.all([
                api.get<Workspace[]>("/workspaces/"),
                api.get<Workspace[]>("/workspaces/team/")
            ]);

            setOwnedWorkspaces(ownedRes.data);
            setTeamWorkspaces(teamRes.data);
            
            // Data success! Now we can clear the error and loading states
            setBlockingError(null);
            setHasLoadedOnce(true);

        } catch (err) {
            let errorMessage = "Something went wrong. Please try again.";
            let errorType: 'NETWORK' | 'SERVER' | 'UNKNOWN' = 'UNKNOWN';

            if (err instanceof AxiosError) {
                if (err.code === "ERR_NETWORK") {
                    errorMessage = "Unable to connect. Check your internet connection.";
                    errorType = 'NETWORK';
                } else if (err.response) {
                    if (err.response.status >= 500) {
                        errorMessage = "Our servers are currently experiencing issues.";
                        errorType = 'SERVER';
                    } else {
                        errorMessage = `Error: ${err.response.data?.detail || "Failed to fetch data"}`;
                    }
                }
            }

            if (hasLoadedOnce) {
                // Background error - show toast
                setToastError(errorMessage);
                setTimeout(() => setToastError(null), 5000);
            } else {
                // Critical error - show blocking screen
                setBlockingError({ type: errorType, message: errorMessage });
            }
        } finally {
            setLoading(false);
            setIsRetrying(false);
        }
    }, [user, hasLoadedOnce, blockingError]);

    useEffect(() => {
        if (user) {
            // Initial load only
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); 

    const handleWorkspaceClick = (id: string) => navigate(`/workspace/${id}`);
    
    const handleWorkspaceCreated = (newWorkspace: Workspace) => {
        setOwnedWorkspaces(prev => [...prev, newWorkspace]);
    };

    const canCreateWorkspace = ownedWorkspaces.length < 3;

    // --- Dynamic Greeting Logic ---
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };
    
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="workspace-background bg-gray-50 min-h-screen relative">
            
            {/* BACKGROUND ERROR TOAST */}
            {toastError && (
                <ErrorToast message={toastError} onClose={() => setToastError(null)} />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8 sm:mb-12 border-b border-gray-200 pb-6 sm:pb-8">
                    <div className="flex items-start gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                                {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 max-w-xs sm:max-w-md md:max-w-lg leading-relaxed">
                                 Your mission control dashboard for workspace management. Monitor data, track trends, and collaborate with your team.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    {currentDate}
                                </span>
                                
                                {blockingError || toastError ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-600 animate-pulse">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                        Connection Issues
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        System Online
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTION AREA */}
                    <div className="mt-2 flex w-full flex-row items-center justify-between gap-3 md:mt-0 md:w-auto md:flex-col md:items-end md:justify-start">
                        {canCreateWorkspace ? (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="order-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 md:order-1 md:w-auto"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                New workspace
                            </button>
                        ) : (
                            <div className="order-2 inline-flex items-center gap-1.5 text-sm text-gray-500 md:order-1">
                                <Lock className="h-3.5 w-3.5 text-gray-400" />
                                Workspace limit reached
                            </div>
                        )}

                        <div className="order-1 flex flex-col items-start gap-1 md:order-2 md:items-end">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-gray-500">Plan usage</span>
                                {/* Mini Retry Spinner for Background Sync */}
                                {isRetrying && !blockingError && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
                            </div>

                            <div className="flex gap-1">
                                {[...Array(3)].map((_, i) => {
                                    const isUsed = i < ownedWorkspaces.length;
                                    return (
                                        <div key={i} className={`flex h-4 w-4 items-center justify-center rounded border ${isUsed ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-transparent'}`}>
                                            {isUsed && <Check className="h-2.5 w-2.5" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </header>

                {/* --- CONTENT AREA --- */}
                {/* LOGIC EXPLAINED:
                   1. If Loading AND No Error -> Show Skeleton (First Load)
                   2. If Error Exists -> Show Error Screen (Retry happens inside here)
                   3. Otherwise -> Show Data
                */}
                
                {loading && !blockingError ? (
                    <HomeSkeleton />
                ) : blockingError ? (
                    // --- FULL SCREEN ERROR STATE ---
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center animate-in fade-in duration-200">
                        {/* Icon */}
                        <div
                            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                            blockingError.type === "NETWORK"
                                ? "bg-orange-50 text-orange-500"
                                : "bg-red-50 text-red-500"
                            }`}
                        >
                            {blockingError.type === "NETWORK" ? (
                            <WifiOff className="h-6 w-6" />
                            ) : (
                            <Server className="h-6 w-6" />
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                            {blockingError.type === "NETWORK"
                            ? "Connection lost"
                            : "Server unavailable"}
                        </h3>

                        {/* Message */}
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-gray-500">
                            {blockingError.message}
                        </p>

                        {/* Action */}
                        <button
                            onClick={fetchData}
                            disabled={isRetrying}
                            className="mt-5 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRetrying ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
                                Retrying…
                            </>
                            ) : (
                            <>
                                <RefreshCw className="h-4 w-4 text-gray-500" />
                                Retry
                            </>
                            )}
                        </button>
                        </div>

                ) : (
                    // --- SUCCESS STATE (Shows Workspaces) ---
                    <div className="space-y-12 animate-in fade-in duration-500">
                        {/* Owned Workspaces Section */}
                        <section>
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                    <LayoutGrid className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Personal workspaces</h2>
                                    <p className="text-sm text-gray-500">Workspaces you own and manage</p>
                                </div>
                                <div className="ml-auto text-xs font-medium text-gray-500">{ownedWorkspaces.length} of 3 used</div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {ownedWorkspaces.length > 0 ? (
                                    ownedWorkspaces.map((ws, index) => (
                                        <WorkspaceCard key={ws.id} ws={ws} onClick={handleWorkspaceClick} isOwner={true} workspaceIndex={index} />
                                    ))
                                ) : (
                                    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center">
                                        <div className="relative mb-5 cursor-pointer hover:opacity-100 transition-opacity opacity-90" onClick={() => setIsCreateModalOpen(true)}>
                                            <img src="/images/Workspace1.png" alt="Create workspace" className="w-28 sm:w-32 md:w-36 object-contain" />
                                            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-semibold text-gray-900">No personal workspaces yet</h3>
                                        <p className="mt-1 max-w-sm text-sm text-gray-500">Create a workspace to start connecting data sources, tracking trends, and collaborating.</p>
                                        <button onClick={() => setIsCreateModalOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                                            Create workspace <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Team Workspaces Section */}
                        <section>
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Team collaborations</h2>
                                    <p className="text-sm text-gray-500">Workspaces shared with you</p>
                                </div>
                            </div>
                            {teamWorkspaces.length > 0 ? (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {teamWorkspaces.map((ws, index) => (
                                        <WorkspaceCard key={ws.id} ws={ws} onClick={handleWorkspaceClick} isOwner={false} workspaceIndex={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center">
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900">No team workspaces yet</h3>
                                    <p className="mt-1 max-w-sm text-sm text-gray-500">When someone shares a workspace with you, it will appear here.</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
            <CreateWorkspaceModal isOpen={isCreateModalOpen} setIsOpen={setIsCreateModalOpen} onWorkspaceCreated={handleWorkspaceCreated} />
        </div>
    );
};

export default Home;