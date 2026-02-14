import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Users, Plus, WifiOff, FileText, Globe, Calendar, Server, ArrowRight, Clock, Lock, Check, Database, Activity, Loader2, Folder } from "lucide-react";
import { AxiosError } from "axios";
import { Workspace } from "../types";
import { CreateWorkspaceModal } from "../components/CreateWorkspaceModal";

const WorkspaceCard: React.FC<{
  ws: Workspace; 
  onClick: (id: string) => void;
  isOwner: boolean;
  workspaceIndex?: number;
}> = ({ ws, onClick, isOwner }) => {

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  const getOwnerImage = () => {
    if (ws.data_source === "CSV") {
      return "/images/Workspace1.png";
    }

    if (ws.data_source === "API") {
      return "/images/Workspace2.png";
    }

    if (ws.data_source === "DB") {
      return "/images/Workspace3.png";
    }

    return "/images/Workspace.png"; // fallback (no source)
  };


  const getTeamImage = () => {
  if (ws.data_source === "CSV") {
    return "/images/Workspace1.png";
  }

  if (ws.data_source === "API") {
    return "/images/Workspace2.png";
  }

  if (ws.data_source === "DB") {
    return "/images/Workspace3.png";
  }

  return "/images/Teamspace.png";
};


  const getWorkspaceInfo = () => {
    const image = isOwner ? getOwnerImage() : getTeamImage();

    if (!isOwner) {
      if (!ws.data_source) {
        return {
          text: "This workspace has no connected data source yet. Please ask the owner to connect a source to start tracking data.",
          image,
        };
      }

      if (ws.data_source === "CSV") {
        return {
          text: "This workspace uses CSV uploads as its data source. Data updates will reflect when new files are uploaded by the team.",
          image,
        };
      }

      if (ws.data_source === "API") {
        return {
          text: ws.is_polling_active
            ? "Live API monitoring is active. Data changes are being tracked automatically in the background."
            : "API is connected but polling is currently paused. Live data changes are not being tracked right now.",
          image,
        };
      }

      if (ws.data_source === "DB") {
        return {
          text: ws.is_polling_active
            ? "Database monitoring is active. Changes in the data are continuously detected for the team."
            : "Database is connected but polling is paused. No real-time database tracking is happening currently.",
          image,
        };
      }
    }

    if (!ws.data_source) {
      return {
        text: "No data source connected. Connect a CSV file, API, or Database to start tracking data changes, incidents, and trends.",
        image,
      };
    }

    if (ws.data_source === "CSV") {
      return {
        text: "This workspace is powered by CSV uploads. Upload new datasets anytime to refresh analytics and change detection.",
        image,
      };
    }

    if (ws.data_source === "API") {
      return {
        text: ws.is_polling_active
          ? "API polling is active. Your workspace is automatically monitoring live data changes and updates."
          : "API is connected but polling is paused. Resume polling to enable automatic change tracking.",
        image,
      };
    }

    if (ws.data_source === "DB") {
      return {
        text: ws.is_polling_active
          ? "Database polling is active. Real-time changes are being monitored continuously in this workspace."
          : "Database is connected but polling is paused. Real-time monitoring is currently disabled.",
        image,
      };
    }

    return { text: "", image };
  };

  const info = getWorkspaceInfo();

  return (
    <div
      onClick={() => onClick(ws.id)}
      className="
        flex h-full cursor-pointer flex-col
        rounded-sm border border-gray-200 bg-white
        p-4 shadow-sm
        transition-all duration-200 ease-out
        hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5
      "
    >
      {/* Top: Title + Info */}
      <div className="group flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {ws.name}
          </h3>

          {!isOwner && (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              Owned by {ws.owner.name || ws.owner.email}
            </p>
          )}
        </div>

       {/* Round Info Icon + Top Tooltip (with pointer) */}
        <div
          className="relative flex items-center shrink-0 group/tooltip"
          onClick={(e) => e.stopPropagation()}
        >
         <button
          type="button"
          className="
            /* 1. The Guard: Force a perfect square no matter what */
            inline-flex items-center justify-center
            w-6 h-6 min-w-[24px] min-h-[24px]
            sm:w-7 sm:h-7 sm:min-w-[28px] sm:min-h-[28px]
            flex-shrink-0 
            
            /* 2. The Shape */
            rounded-full border border-gray-200 bg-white
            
            /* 3. The Content: Centering the 'i' */
            text-[11px] font-bold text-gray-500
            overflow-hidden
            
            /* 4. Interactions */
            transition-all duration-200
            hover:border-gray-400 hover:text-gray-900 hover:shadow-sm
            cursor-help focus:outline-none
          "
          aria-label="Workspace info"
        >
          {/* Wrap the 'i' to ensure its line-height doesn't push the button height */}
          <span className="flex items-center justify-center h-full w-full italic font-serif leading-[0]">
            i
          </span>
        </button>
          {/* Tooltip Card: Solid & High Contrast */}
          <div
            className="
              pointer-events-none absolute right-0 bottom-full mb-2.5 z-50 
              w-64 sm:w-80 /* Increased desktop width slightly for breathing room */
              rounded-md border border-gray-200 bg-white
              p-3.5 /* Slightly more padding for the bigger content */
              shadow-md
              
              /* Animation */
              opacity-0 translate-y-1
              transition-all duration-150 ease-out
              group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0
            "
          >
            {/* Pointer */}
            <div className="absolute -bottom-[5px] right-3 h-0 w-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white" />
            <div className="absolute -bottom-[6px] right-3 -z-10 h-0 w-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-200" />

            <div className="flex items-start gap-3.5"> {/* Slightly bigger gap */}
              
              {/* 1. The Image: Bigger size for clarity */}
              {/* w-16 (64px) on mobile, w-20 (80px) on desktop. Makes 16:9 pop. */}
              <div className="w-16 sm:w-20 flex-shrink-0 pt-0.5"> 
                <img
                  src={info.image}
                  alt=""
                  /* Added explicit height limit just in case, but w-full/h-auto does the work */
                  className="w-full h-auto max-h-[50px] object-contain drop-shadow-sm"
                />
              </div>

              {/* 2. The Text */}
              <div className="flex-1">
                <p className="text-[11px] leading-relaxed text-gray-600 font-medium">
                  {info.text}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Middle: Metadata */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          Created {formatDate(ws.created_at)}
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          {ws.team_members?.length || 0} collaborators
        </div>
      </div>

      {/* Bottom: State */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        {ws.data_source ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] font-medium ${
              ws.data_source === "API"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : ws.data_source === "DB"
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {ws.data_source === "API" && <Globe className="h-3 w-3" />}
            {ws.data_source === "DB" && <Server className="h-3 w-3" />}
            {ws.data_source === "CSV" && <FileText className="h-3 w-3" />}
            <span>
              {ws.data_source === "API"
                ? "Live API"
                : ws.data_source === "DB"
                ? "Database"
                : "CSV Upload"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">
            No data source connected
          </span>
        )}

        {(ws.data_source === "API" || ws.data_source === "DB") && (
          ws.is_polling_active ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Active
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Paused
            </div>
          )
        )}
      </div>
    </div>
  );
};


// --- SUB-COMPONENT 2: The Skeleton Loader (No changes needed) ---
const HomeSkeleton: React.FC = () => {
  const SkeletonCard = () => (
    <div className="flex h-full flex-col rounded-sm border border-gray-100 bg-white p-4 shadow-sm animate-pulse">
      {/* 1. Header: Title + Info Button shape */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          {/* Workspace Name */}
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          {/* Owner (if not owner) */}
          <div className="h-3 w-1/2 rounded bg-gray-100" />
        </div>
        
        {/* The (i) icon circle shape */}
        <div className="h-6 w-6 shrink-0 rounded-full bg-gray-100" />
      </div>

      {/* 2. Middle: Metadata (Date & Collaborators) */}
      <div className="mt-4 flex items-center gap-4">
        <div className="h-3 w-24 rounded bg-gray-100" />
        <div className="h-3 w-20 rounded bg-gray-100" />
      </div>

      {/* 3. Footer: Status Badge & State */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-3">
        {/* Data Source Badge Shape */}
        <div className="h-5 w-16 rounded-sm bg-gray-100" />
        {/* Active/Paused Indicator Shape */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-200" />
          <div className="h-3 w-10 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );

  const SectionSkeleton = ({ count = 3 }: { count?: number }) => (
    <section>
      {/* Section Header */}
      <div className="mb-6 space-y-3">
        <div className="h-5 w-48 rounded bg-gray-200" />
        <div className="h-3 w-64 rounded bg-gray-100" />
      </div>

      {/* Grid: Matches your responsive logic */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
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
    const [ownedWorkspaces, setOwnedWorkspaces] = useState<Workspace[]>([]);
    const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    
    const dataReady = hasLoadedOnce && !loading && !isNetworkError && !error;

    const navigate = useNavigate();

   const fetchData = useCallback(async () => {
        if (!user) return;
        
        setLoading(true);
        setError("");

        try {
            const [ownedRes, teamRes] = await Promise.all([
                api.get<Workspace[]>("/workspaces/"),
                api.get<Workspace[]>("/workspaces/team/")
            ]);

            // 🔒 Runtime contract validation
            // If Vercel sends HTML (string) or API fails, this catches it immediately.
            if (!Array.isArray(ownedRes.data) || !Array.isArray(teamRes.data)) {
                console.error("Received invalid data:", ownedRes.data, teamRes.data); // Log for debugging
                throw new Error("Invalid workspace response format");
            }

            setOwnedWorkspaces(ownedRes.data);
            setTeamWorkspaces(teamRes.data);
            
            setIsNetworkError(false);
            setHasLoadedOnce(true);

        } catch (err) {
            console.error("Fetch Error:", err); // <--- Add this so you see the error in F12 console

            if (err instanceof AxiosError && err.code === "ERR_NETWORK") {
                setError("Could not connect to the DataPulse server. It may be offline.");
                setIsNetworkError(true);
            } else {
                // This will catch your "Invalid workspace response format" error
                setError("Failed to load workspace data.");
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [fetchData, user]); 
    
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
        <div className="workspace-background bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                {/* --- 🎨 UPGRADED HEADER: PROFILE HERO --- */}
               <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8 sm:mb-12 border-b border-gray-200 pb-6 sm:pb-8">
                    <div className="flex items-start gap-4">
                        {/* Avatar: Switched to Clean Monochrome (No more Blue Gradient) */}     
                        <div className="flex flex-col">
                            {/* Title: Responsive Font Size (Starts small, grows on desktop) */}
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                                {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}
                            </h1>
                            
                            {/* Tagline: Responsive Width & Text Size */}
                            <p className="text-sm text-gray-500 mt-1 max-w-xs sm:max-w-md md:max-w-lg leading-relaxed">
                                Your mission control dashboard for workspace management. Monitor data, track trends, and collaborate with your team.
                            </p>

                            {/* Context Badges: Flex wrap for small screens */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    {currentDate}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                                    (isNetworkError || error) ? 'text-red-600' : 'text-emerald-700'
                                }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                        (isNetworkError || error) ? 'bg-red-500' : 'bg-emerald-500'
                                    }`} />
                                    {(isNetworkError || error) ? 'Offline' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ACTION AREA */}
                    <div className="mt-2 flex w-full flex-row items-center justify-between gap-3 md:mt-0 md:w-auto md:flex-col md:items-end md:justify-start">
  
                        {canCreateWorkspace ? (
                           <button
                              onClick={() => setIsCreateModalOpen(true)}
                              className="
                                order-2 md:order-1
                                w-full md:w-auto
                                inline-flex items-center justify-center gap-2
                                rounded-sm 
                                bg-blue-600 
                                px-4 py-2 
                                text-[11px] font-bold text-white tracking-widest
                                shadow-sm hover:bg-blue-700 font-manrope hover:shadow-md
                                transition-all active:scale-[0.98]
                              "
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>New workspace</span>
                            </button>
                        ) : (
                            <div className="order-2 inline-flex items-center gap-1.5 text-sm text-gray-500 md:order-1">
                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                        Workspace limit reached
                        </div>

                        )}

                        {/* Usage */}
                        <div className="order-1 flex flex-col items-start gap-1 md:order-2 md:items-end">
                            <span className="text-[11px] font-medium text-gray-500">
                            Plan usage
                            </span>

                            <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => {
                                const isUsed = i < ownedWorkspaces.length;

                                return (
                                <div
                                    key={i}
                                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                                    isUsed
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-gray-300 text-transparent'
                                    }`}
                                >
                                    {isUsed && <Check className="h-2.5 w-2.5" />}
                                </div>
                                );
                            })}
                            </div>
                        </div>

                    </div>


                </header>

                {loading ? (
                    <HomeSkeleton />
                    ) : isNetworkError || error ?  (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        {/* Icon */}
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <WifiOff className="h-5 w-5" />
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-gray-900">
                            Unable to load workspaces
                        </h3>

                        {/* Description */}
                        <p className="mt-1 max-w-md text-sm text-gray-500">
                            {error || "We couldn’t reach the server. Please check your connection or try again."}
                        </p>

                        {/* Action */}
                        <button
                          onClick={fetchData}
                          disabled={loading}
                          className="
                            mt-6 
                            inline-flex items-center justify-center gap-2
                            h-9 sm:h-10 px-6
                            rounded-sm border border-slate-200 bg-white
                            text-[10px] sm:text-[11px] font-bold text-slate-600 font-manrope tracking-[0.15em]
                            transition-all 
                            hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300
                            active:scale-[0.98]
                            disabled:opacity-20 disabled:cursor-not-allowed
                          "
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                              <span>Retrying...</span>
                            </>
                          ) : (
                            "Retry"
                          )}
                        </button>
                        </div>

                    ) : (

                    <div className="space-y-12">
                        {/* Owned Workspaces Section */}
                        <section>
                            <div className="mb-6 flex items-start">
                              <div className="mt-1 mr-3">
                                <Folder className="h-4 w-4 text-gray-400" />
                              </div>

                              {/* Title + subtitle */}
                              <div>
                                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                                  Personal workspaces
                                </h2>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  Workspaces you own and manage
                                </p>
                              </div>

                              {/* Meta */}
                              <div className="ml-auto pt-1 text-xs font-medium text-gray-500">
                                {ownedWorkspaces.length} of 3 used
                              </div>
                            </div>


                            {/* Workspace Grid */}
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {ownedWorkspaces.length > 0 ? (
                                ownedWorkspaces.map((ws, index) => (
                                    <WorkspaceCard
                                    key={ws.id}
                                    ws={ws}
                                    onClick={handleWorkspaceClick}
                                    isOwner={true}
                                    workspaceIndex={index}
                                    />
                                ))
                                ) : dataReady ? (
              
                             <div className="col-span-full">
                              <div
                                className="
                                  relative overflow-hidden
                                  rounded-sm
                                  border border-gray-200
                                  bg-white
                                  shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                                "
                              >
                                  <div className="relative grid gap-10 p-6 sm:p-8 md:grid-cols-2 items-center">
                                    
                                    {/* LEFT: Action + Promise */}
                                    <div className="space-y-6 text-center md:text-left">
                                      
                                      {/* Eyebrow */}
                                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        Workspace
                                      </p>

                                      {/* Headline */}
                                      <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                                        Track your data changes
                                        <br className="hidden sm:block" />
                                        in one shared workspace
                                      </h3>

                                      {/* Explanation */}
                                      <p className="max-w-md mx-auto md:mx-0 text-sm text-gray-600 leading-relaxed">
                                        A workspace connects your data sources, watches for changes,
                                        and keeps updates organized in one place without manual tracking.
                                      </p>

                                      {/* Primary action */}
                                      <div>
                                        <button
                                          onClick={() => setIsCreateModalOpen(true)}
                                          className="
                                            inline-flex items-center justify-center gap-2
                                            rounded-sm
                                            bg-blue-600
                                            hover:bg-blue-700
                                            px-5 py-2.5
                                            text-[11px] font-bold text-white tracking-widest
                                            shadow-sm hover:shadow-md
                                            transition-all duration-150
                                            active:scale-[0.98]
                                            font-manrope
                                            group
                                          "

                                        >
                                          <span>Create workspace</span>
                                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                                        </button>

                                      </div>

                                      {/* Micro-clarity */}
                                      <p className="text-xs text-gray-400">
                                        Takes less than a minute. You can create up to{" "}
                                        <span className="font-medium text-gray-500">
                                          3 personal workspaces
                                        </span>.
                                      </p>
                                    </div>

                                    {/* RIGHT: Illustration + capabilities */}
                                    <div className="order-first md:order-last space-y-6">
                                      
                                      {/* Illustration */}
                                      <div className="flex justify-center md:justify-end">
                                        <img
                                          src="/images/Workspace.png"
                                          alt="Workspace overview"
                                          className="w-48 sm:w-56 md:w-64 object-contain opacity-95"
                                        />
                                      </div>

                                      {/* Capabilities */}
                                      <div className="grid gap-3 max-w-md mx-auto md:ml-auto">
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-gray-700">
                                            <Database className="h-4 w-4" />
                                          </div>
                                          Connect CSV files, APIs, or databases
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-gray-700">
                                            <Activity className="h-4 w-4" />
                                          </div>
                                          Monitor trends and data changes over time
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-gray-700">
                                            <Users className="h-4 w-4" />
                                          </div>
                                          Invite teammates to collaborate
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                              </div>
                            </div>

                             ) : null}
                               
                            </div>
                        </section>

                        <section>
                            {/* Section Header */}
                            <div className="mb-6 flex items-start">
                              {/* Icon */}
                              <div className="mt-1 mr-3">
                                <Users className="h-4 w-4 text-gray-400" />
                              </div>

                              {/* Title + subtitle */}
                              <div>
                                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                                  Team collaborations
                                </h2>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  Workspaces shared with you
                                </p>
                              </div>
                            </div>


                            {/* Content */}
                            {teamWorkspaces.length > 0 ? (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {teamWorkspaces.map((ws, index) => (
                                    <WorkspaceCard
                                    key={ws.id}
                                    ws={ws}
                                    onClick={handleWorkspaceClick}
                                    isOwner={false}
                                    workspaceIndex={index}
                                    />
                                ))}
                                </div>
                            ) : dataReady ? (
                              <div className="col-span-full">
                                <div
                                  className="
                                    relative overflow-hidden
                                    rounded-sm border border-gray-200
                                    bg-gradient-to-br from-white via-white to-blue-50/30
                                    shadow-sm
                                  "
                                >
                                  <div className="flex flex-col items-center justify-center px-6 py-8 sm:py-9 text-center">
                                    
                                    {/* Illustration */}
                                    <div className="relative mb-4">
                                      <div className="absolute inset-0 bg-blue-200/30 blur-2xl rounded-full" />
                                      <img
                                        src="/images/Teamspace.png"
                                        alt="Shared workspaces"
                                        className="relative z-10 w-36 object-contain opacity-90"
                                      />
                                    </div>

                                    {/* Copy */}
                                    <h3 className="text-sm font-semibold text-gray-900">
                                      No shared workspaces yet
                                    </h3>

                                    <p className="mt-1 max-w-sm text-sm text-gray-600">
                                      Workspaces shared with you by teammates will appear here automatically.
                                    </p>

                                    <p className="mt-2 text-xs text-gray-400">
                                      Ask a teammate to invite you to their workspace.
                                    </p>
                                  </div>
                                </div>
                              </div>

                            ) : null}
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