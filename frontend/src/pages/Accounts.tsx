import React, { useState, useEffect } from 'react';
import { 
  Github, Link as LinkIcon, 
  Link2Off, AlertTriangle, 
  Loader2, Mail, Fingerprint,
  ShieldCheck, ShieldAlert,
  History,
  LogOut, 
  Monitor,
  ChevronDown,
  Check,
  X,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import  { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ModalShell } from '../components/ModelShell';

/** * DIAMOND TYPES & INTERFACES
 */
interface LoginHistory {
  id: string;
  provider: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_pic?: string;
  google_id?: string;
  github_id?: string;
  created_at?: string;
  login_history?: LoginHistory[]; // Linked from Step 3
}

interface ResultModalState {
  type: 'success' | 'error';
  message: string;
  provider: 'google' | 'github' | null;
}

interface WorkspaceExportSummary {
  workspace_id: string;
  name: string;
  data_source: string;
  total_size_bytes: number;
  file_count: number;
}

/**
 * HELPERS
 */
const FormattedDate: React.FC<{ dateString: string; showTime?: boolean }> = ({ dateString, showTime }) => {
  if (!dateString) return <span>Recently</span>;
  
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return <span>Invalid date</span>;
  }
  
  return (
    <span>
      {date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: showTime ? '2-digit' : undefined,
        minute: showTime ? '2-digit' : undefined,
        hour12: true
      })}
    </span>
  );
};
// Pure Logic: Simplifies the messy User-Agent string into "Browser • OS"
// Account.tsx
 const parseUA = (ua?: string) => {
  if (!ua || ua === "unknown") return "Unknown Device";

  // ---------- Browser detection ----------
  // Order matters (Chromium family first)
  const browsers = [
    { name: "Edge", reg: /Edg\/|EdgA\/|EdgiOS\// },
    { name: "Brave", reg: /Brave\// },
    { name: "Opera", reg: /OPR\/|Opera\// },
    { name: "Arc", reg: /Arc\// },
    { name: "Vivaldi", reg: /Vivaldi\// },
    { name: "Samsung Internet", reg: /SamsungBrowser\// },
    { name: "DuckDuckGo", reg: /DuckDuckGo\// },
    { name: "UC Browser", reg: /UCBrowser\// },
    { name: "Firefox", reg: /Firefox\/|FxiOS\// },
    { name: "Chrome", reg: /Chrome\/|CriOS\// },
    { name: "Safari", reg: /Safari\/(?!.*Chrome)/ },
    { name: "Internet Explorer", reg: /MSIE |Trident\// },
  ];

  // ---------- OS detection ----------
  const systems = [
    { name: "Windows", reg: /Windows NT/ },
    { name: "macOS", reg: /Macintosh/ },
    { name: "ChromeOS", reg: /CrOS/ },
    { name: "Linux", reg: /Linux/ },
    { name: "Android", reg: /Android/ },
    { name: "iOS", reg: /iPhone|iPad|iPod/ },
  ];

  const browser = browsers.find(b => b.reg.test(ua))?.name ?? "Browser";
  const os = systems.find(s => s.reg.test(ua))?.name ?? "Other OS";

  return `${browser} on ${os}`;
};


const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 48 48" className={`shrink-0 ${className}`}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export const Account: React.FC = () => {
  const { user, logout, checkSession } = useAuth() as unknown as { 
    user: UserProfile | null, 
    logout: () => void, 
    checkSession: () => Promise<void> 
  };
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [isDeleted, setIsDeleted] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState<boolean>(false); // New modal state
  const [unlinkProvider, setUnlinkProvider] = useState<'google' | 'github' | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string>('');
  const [pendingLink, setPendingLink] = useState<'google' | 'github' | null>(null);
  const [resultModal, setResultModal] = useState<ResultModalState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [showSecurityLogs, setShowSecurityLogs] = useState<boolean>(
  window.innerWidth >= 1024 // lg breakpoint
);
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [workspaces, setWorkspaces] = useState<WorkspaceExportSummary[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isFetchingList, setIsFetchingList] = useState(false);

 useEffect(() => {
  if (isSyncing) return; // ⬅️ IMPORTANT

  const resolveAccountState = async () => {
    try {
      if (user) {
        setPageState('ready');
        return;
      }

      await checkSession();
      setPageState('ready');
    } catch {
      setPageState('error');
    }
  };

  resolveAccountState();
}, [user, checkSession, isSyncing]);


  useEffect(() => {
    const status = searchParams.get('status');
    const errorParam = searchParams.get('error'); // FIXED: Capture error param
    const providerParam = searchParams.get('provider');

    // Handle Success
    if (status === 'success') {
      const syncOAuthSession = async () => {
        setIsSyncing(true);
        try {
          await checkSession(); 
          setResultModal({
            type: 'success',
            message: 'Account identity successfully synchronized.',
            provider: (providerParam as 'google' | 'github' | null) || null
          });
          toast.success("Security logs updated");
        } catch (err) {
          console.error("OAuth Sync Error:", err);
        } finally {
          setIsSyncing(false);
          setSearchParams({}, { replace: true });
        }
      };
      syncOAuthSession();
    }

    // FIXED: Handle Errors from URL (like the one you experienced)
    if (errorParam) {
      setResultModal({
        type: 'error',
        message: errorParam.replace(/_/g, ' '), // Cleans the "already_linked" string
        provider: (providerParam as 'google' | 'github' | null) || null
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, checkSession, setSearchParams]);

  // Find the last login time for a specific service
  const getLastUsed = (provider: string) => {
    return user?.login_history?.find(log => log.provider === provider)?.created_at;
  };

  const handleLink = () => {
    if (!pendingLink) return;
    setLoadingAction(`link-${pendingLink}`);
    window.location.href = `${API_BASE}/auth/${pendingLink}/link?return_to=/account?status=success%26provider=${pendingLink}`;
  };

  const processUnlink = async () => {
  if (!unlinkProvider) return;

  setLoadingAction(`unlink-${unlinkProvider}`);

  try {
    await api.post(`/auth/unlink/${unlinkProvider}`);
    toast.success(`${unlinkProvider} identity disconnected`);
    await checkSession();
    setUnlinkProvider(null);
  } catch (err) {
    const error = err as AxiosError<{ detail: string }>;
    toast.error(error.response?.data?.detail || 'Unlink process failed');
  } finally {
    setLoadingAction(null);
  }
};

  // NEW: Robust Global Logout Logic
  const processGlobalLogout = async () => {
  setLoadingAction('logout-all');

  try {
    await api.post('/auth/logout-all');
    toast.success('All sessions terminated successfully');
    logout();
    navigate('/login');
  } catch (err) {
    const error = err as AxiosError<{ detail: string }>;
    toast.error(error.response?.data?.detail || 'Session revocation failed');
    console.error(err);
  } finally {
    setLoadingAction(null);
    setShowLogoutAllModal(false);
  }
};

const processDelete = async () => {
  if (confirmEmail !== user?.email) {
    toast.error('Identity verification mismatch');
    return;
  }

  setLoadingAction('deleting');

  try {
    // 1. Call the backend
    await api.delete('/auth/me');
    
    // 2. Instead of immediate redirect, show success state
    setIsDeleted(true);
    
    // 3. Wait 3 seconds so they can read the farewell before we wipe the state
    setTimeout(() => {
       logout();
       navigate('/login');
       toast.success('Your data has been scrubbed.');
    }, 3000);

  } catch (err) {
    console.error(err);
    toast.error('Critical failure deleting account');
    setLoadingAction(null);
  }
};

// Step 1: Open Modal and fetch the list of workspace sizes
const handleOpenExportModal = async () => {
  setShowExportModal(true);
  setIsFetchingList(true);
  try {
    const response = await api.get<WorkspaceExportSummary[]>('/user/export-list');
    setWorkspaces(response.data);
  } catch (error) {
    console.error(error);
    toast.error('Could not load workspace list');
  } finally {
    setIsFetchingList(false);
  }
};

// Step 2: Download a SPECIFIC workspace
const downloadWorkspace = async (workspaceId: string, wsName: string) => {
  setExportingId(workspaceId);
  try {
    const response = await api.get(`/user/export-workspace/${workspaceId}`, { 
      responseType: 'blob' 
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DataPulse_${wsName.replace(/\s+/g, '_')}_Export.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`${wsName} export successful`);
  } catch (error) {
    console.error(error);
    toast.error('Export failed. The workspace might be too large.');
  } finally {
   setExportingId(null);
  }
};

if (pageState === 'loading') {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-sm text-slate-500">Loading account…</div>
    </div>
  );
}

if (pageState === 'error') {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-slate-600">
        We couldn’t load your account details.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800"
      >
        Retry
      </button>
    </div>
  );
}

  return (
    <div className="min-h-full text-slate-900 antialiased">
        
        <header className="mb-10">
          {/* Trust / Status Row */}
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/10">
            <ShieldCheck className="h-4 w-4" />
            Verified account
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Account settings
          </h1>

          {/* Description */}
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Manage your identity, authentication methods, and active sessions.
          </p>

          {/* Divider */}
          <div className="mt-6 h-px w-full bg-slate-200/70" />
        </header>


        <div className="space-y-10">
          {/* PROFILE SECTION */}
         <section className="rounded-xl border border-slate-200 bg-white px-6 py-5 sm:px-8 sm:py-6">
            
            {/* Profile Row */}
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500">
                {user?.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.name?.[0] || 'U'
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  {user?.name}
                </h3>

                <div className="mt-0.5 flex items-center gap-2 text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm truncate">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
              
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Member since
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  <FormattedDate dateString={user?.created_at || ''} />
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Security ID
                </p>

                <div className="mt-1 flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600">
                  <Fingerprint className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{user?.id}</span>
                </div>
              </div>

            </div>
          </section>


           {/* CONNECTED SERVICES */}
            <section className="space-y-4">

              {/* Section Header */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <LinkIcon className="h-4 w-4 text-slate-400" />
                Connected services
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

                {([
                  { id: 'google' as const, name: 'Google', subtitle: 'Google Identity', icon: <GoogleIcon />, active: !!user?.google_id },
                  { id: 'github' as const, name: 'GitHub', subtitle: 'Developer account', icon: <Github className="h-4 w-4" />, active: !!user?.github_id }
                ]).map((service, idx) => {
                  const lastUsed = getLastUsed(service.id);

                  return (
                    <div
                      key={service.id}
                      className={`
                        flex items-center justify-between gap-4
                        px-4 py-3 sm:px-6 sm:py-4
                        transition-colors
                        ${idx !== 0 ? 'border-t border-slate-100' : ''}
                        hover:bg-slate-50
                      `}
                    >
                      {/* Left */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                          {service.icon}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {service.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500 truncate">
                            {service.active ? 'Connected' : 'Not connected'}
                            {service.active && lastUsed && (
                              <> · Last used <FormattedDate dateString={lastUsed} /></>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="shrink-0">
                        {service.active ? (
                          <button
                            onClick={() => setUnlinkProvider(service.id)}
                            className="
                              rounded-md
                              px-2.5 py-1.5
                              text-xs font-medium
                              text-slate-500
                              hover:text-red-600 hover:bg-red-50
                              transition
                            "
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => setPendingLink(service.id)}
                            className="
                              rounded-md
                              px-3 py-1.5
                              text-xs font-semibold
                              bg-slate-900 text-white
                              hover:bg-slate-800
                              transition
                            "
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

           {/* SECURITY ACTIVITY */}
              <section className="space-y-4">

                {/* Summary Header */}
                <button
                  type="button"
                  onClick={() => setShowSecurityLogs(v => !v)}
                  className="
                    w-full flex items-center justify-between
                    rounded-xl border border-slate-200 bg-white
                    px-4 py-3 sm:px-5
                    transition
                    hover:bg-slate-50
                  "
                >
                  {/* Left */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center">
                      <History className="h-4 w-4 text-slate-600" />
                    </div>

                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-slate-900">
                        Security activity
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user?.login_history?.length
                          ? `${user.login_history.length} recent events`
                          : 'No recent events'}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {!showSecurityLogs && user?.login_history?.length ? (
                      <span className="hidden sm:inline">
                        Last activity{' '}
                        <FormattedDate
                          dateString={user.login_history[0].created_at}
                          showTime
                        />
                      </span>
                    ) : null}

                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        showSecurityLogs ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Collapsible Content */}
                {showSecurityLogs && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

                    <div className="divide-y divide-slate-100">

                      {/* Syncing state */}
                      {isSyncing ? (
                        <div className="px-4 py-8 flex items-center justify-center gap-2 text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-medium">
                            Syncing security activity…
                          </span>
                        </div>
                      ) : user?.login_history && user.login_history.length > 0 ? (

                        user.login_history.map((log) => (
                          <div
                            key={log.id}
                            className="
                              flex items-start justify-between gap-4
                              px-4 py-3 sm:px-5 sm:py-4
                              transition-colors
                              hover:bg-slate-50
                            "
                          >
                            {/* LEFT */}
                            <div className="flex gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-md border border-slate-200 bg-white flex items-center justify-center shrink-0">
                                {log.provider === 'google' ? <GoogleIcon className="h-4 w-4" /> :
                                log.provider === 'github' ? <Github className="h-4 w-4" /> :
                                log.provider === 'security_reset' ? <ShieldAlert className="h-4 w-4 text-slate-600" /> :
                                <Mail className="h-4 w-4 text-slate-400" />}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {log.provider === 'security_reset'
                                    ? 'Global security reset'
                                    : parseUA(log.user_agent)}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Monitor className="h-3 w-3 text-slate-400" />
                                    {log.ip_address === 'system'
                                      ? 'Account-wide'
                                      : log.ip_address}
                                  </span>

                                  <span>•</span>

                                  <span>
                                    via {log.provider.replace('_', ' ')}
                                  </span>

                                  <span>•</span>

                                  <span>
                                    <FormattedDate
                                      dateString={log.created_at}
                                      showTime
                                    />
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* RIGHT (desktop only) */}
                            <div className="hidden sm:flex shrink-0 items-center">
                              {log.provider === 'security_reset' ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  System
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>
                        ))

                      ) : (
                        <div className="px-4 py-8 text-center text-xs text-slate-400">
                          No recent security activity.
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </section>

              {/* DATA & PRIVACY SECTION - The bridge to the Danger Zone */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      Data portability
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="max-w-md text-left">
                          <p className="text-sm font-medium text-slate-900">
                            Request data export
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Generate a portable .zip archive containing all your workspace configurations, 
                            alert rules, and raw CSV data uploads. 
                          </p>
                        </div>

                        <button
                          onClick={handleOpenExportModal}
                          disabled={isFetchingList || exportingId !== null}
                          className="
                            shrink-0
                            inline-flex items-center justify-center gap-2
                            rounded-md border border-slate-300
                            px-3.5 py-2
                            text-xs font-medium text-slate-700
                            hover:bg-slate-50
                            transition
                            disabled:opacity-50
                          "
                        >
                          {isFetchingList ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <History className="h-3.5 w-3.5" />
                          )}
                          {isFetchingList ? 'Preparing ZIP...' : 'Export my data'}
                        </button>
                      </div>
                    </div>
                  </section>

            {/* SECURITY & DANGER CONTROLS */}
            <section className="pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* SECURITY CONTROLS */}
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <ShieldAlert className="h-4 w-4 text-slate-400" />
                    Security controls
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="max-w-md">
                      <p className="text-sm font-medium text-slate-900">
                        Sign out from all devices
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Immediately revoke all active sessions across web and mobile devices.
                        Use this if you suspect unauthorized access.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowLogoutAllModal(true)}
                      className="
                        shrink-0
                        inline-flex items-center gap-2
                        rounded-md border border-slate-300
                        px-3.5 py-2
                        text-xs font-medium text-slate-700
                        hover:bg-slate-900 hover:text-white hover:border-slate-900
                        transition
                      "
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out everywhere
                    </button>
                  </div>
                </div>

                {/* DANGER ZONE */}
                <div className="rounded-xl border border-red-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="max-w-md">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        Danger zone
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Permanently delete your account, credentials, and all associated
                        security data. This action cannot be undone.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="
                        shrink-0
                        rounded-md border border-red-300
                        px-3.5 py-2
                        text-xs font-semibold text-red-600
                        hover:bg-red-600 hover:text-white hover:border-red-600
                        transition
                      "
                    >
                      Delete account
                    </button>
                  </div>
                </div>

              </div>
            </section>
        </div>

      {/* --- MODALS --- */}

      {showExportModal && (
        <ModalShell>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Choose Workspace</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Select a workspace to generate a portable .zip archive.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {isFetchingList ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-indigo-500" /></div>
              ) : workspaces.length === 0 ? (
                <p className="text-center py-4 text-xs text-slate-400 italic">No workspaces found</p>
              ) : workspaces.map((ws) => (
                <div key={ws.workspace_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{ws.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                      {ws.total_size_bytes < 1024 * 1024 
                        ? `${(ws.total_size_bytes / 1024).toFixed(1)} KB` 
                        : `${(ws.total_size_bytes / (1024 * 1024)).toFixed(1)} MB`} • {ws.file_count} files
                    </p>
                  </div>
                  <button 
                    onClick={() => downloadWorkspace(ws.workspace_id, ws.name)}
                    disabled={exportingId !== null || ws.total_size_bytes === 0}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition disabled:opacity-30"
                  >
                    {exportingId === ws.workspace_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
       </ModalShell>
      )}

      {/* GLOBAL LOGOUT MODAL */}
        {showLogoutAllModal && (
          <ModalShell>
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-slate-900/60">
            <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-xl">

              {/* Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4 text-slate-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Sign out from all devices
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm text-slate-600 leading-relaxed">
                  This will immediately revoke all active sessions across web and mobile
                  devices. You will need to sign in again on every device.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
                <button
                  onClick={() => setShowLogoutAllModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition"
                >
                  Cancel
                </button>

                <button
                  onClick={processGlobalLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition flex items-center justify-center min-w-[140px]"
                >
                  {loadingAction === 'logout-all' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sign out everywhere'
                  )}
                </button>
              </div>

            </div>
          </div>
          </ModalShell>
        )}

      
      {resultModal && (
      <ModalShell>
      <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-slate-900/25 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-xl">

          {/* Header / Brand */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <img
              src="/DPLogo.png"
              alt="DataPulse"
              className="h-7 w-auto object-contain"
            />

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium tracking-wide">DataPulse</span>
              <span>•</span>
              {resultModal.provider === 'google' ? (
                <GoogleIcon />
              ) : (
                <Github className="h-4 w-4" />
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              {resultModal.type === 'success' ? (
                <ShieldCheck className="h-7 w-7 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-7 w-7 text-red-500" />
              )}
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              {resultModal.type === 'success'
                ? 'Operation completed'
                : 'Operation failed'}
            </h2>

            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
              {resultModal.message}
            </p>
          </div>

          {/* Action */}
          <div className="px-6 py-4 border-t border-slate-100">
            <button
              onClick={() => setResultModal(null)}
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              Continue
            </button>
          </div>

        </div>
      </div>
      </ModalShell>
    )}


    {unlinkProvider && (
  <ModalShell>
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden transition-all">
        
        {/* Header - Consistent with Connect Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Security & Identity
          </h2>
          <button 
            onClick={() => setUnlinkProvider(null)}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body - Balanced White Space */}
        <div className="p-8 text-center">
          
          {/* Visual Hub - The "Disconnect" Look */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm opacity-60">
              <img
                src="/DPLogo.png"
                alt="DataPulse"
                className="h-7 w-auto object-contain"
              />
            </div>

            <div className="relative flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm z-10">
                <Link2Off className="h-4 w-4 text-rose-500" />
              </div>
            </div>

            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              {unlinkProvider === 'google' ? (
                <GoogleIcon className="h-6 w-6" />
              ) : (
                <Github className="h-6 w-6 text-slate-900" />
              )}
            </div>
          </div>

          {/* Copy - Direct & Professional */}
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            Disconnect {unlinkProvider.charAt(0).toUpperCase() + unlinkProvider.slice(1)}?
          </h3>

          <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-[300px] mx-auto">
            This will revoke DataPulse's access to your account. You'll need to use another method to sign in.
          </p>
        </div>

        {/* Footer - Consistent High-Quality Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={() => setUnlinkProvider(null)}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Stay connected
          </button>

          <button
            onClick={processUnlink}
            className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center justify-center min-w-[140px]"
          >
            {loadingAction?.startsWith('unlink') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Disconnect'
            )}
          </button>
        </div>

      </div>
    </div>
  </ModalShell>
)}


     {showDeleteModal && (
  <ModalShell>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden transition-all">
        
        {!isDeleted ? (
          <>
            {/* HEADER */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-rose-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Delete Account</h2>
                  <p className="text-xs text-slate-500 font-medium">This action is permanent</p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                This will permanently scrub your <span className="font-semibold text-slate-900">DataPulse</span> identity. All workspaces, encrypted keys, and history will be erased.
              </p>

              {/* CONFIRM INPUT */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  Confirm email to proceed
                </label>
                <input
                  type="text"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user?.email}
                  disabled={loadingAction === 'deleting'}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500/50 outline-none transition-all placeholder:opacity-50"
                />
              </div>
            </div>

            {/* FOOTER - Responsive Alignment */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-5 py-4 bg-slate-50/50 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition"
              >
                Cancel
              </button>

              <button
                onClick={processDelete}
                disabled={confirmEmail !== user?.email || loadingAction === 'deleting'}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 rounded-md transition flex items-center justify-center min-w-[140px]"
              >
                {loadingAction === 'deleting' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </>
        ) : (
          /* SUCCESS VIEW - Modern & Minimal */
          <div className="p-10 text-center">
            <div className="mx-auto h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Identity Scrubbed</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Your data has been removed. Redirecting to portal...
            </p>
            <div className="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 animate-[progress_3s_linear]" />
            </div>
          </div>
        )}
      </div>
    </div>
  </ModalShell>
)}

     {pendingLink && (
  <ModalShell>
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden transition-all">
        
        {/* Header - Simple & Clean */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Security & Identity
          </h2>
          <button 
            onClick={() => setPendingLink(null)}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body - Amazon/Google Minimalist Style */}
        <div className="p-8 text-center">
          
          {/* Visual Connection Hub */}
          <div className="flex items-center justify-center gap-5 mb-8">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
              <img
                src="/DPLogo.png"
                alt="DataPulse"
                className="h-7 w-auto object-contain"
              />
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 border-t border-dashed border-slate-300"></div>
              <div className="relative z-10 h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <LinkIcon className="h-3 w-3 text-slate-400" />
              </div>
            </div>

            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              {pendingLink === 'google' ? (
                <GoogleIcon className="h-6 w-6" />
              ) : (
                <Github className="h-6 w-6 text-slate-900" />
              )}
            </div>
          </div>

          {/* Copy - High Readability */}
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            Connect {pendingLink.charAt(0).toUpperCase() + pendingLink.slice(1)} to DataPulse?
          </h3>

          <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
            This links your identity and enables single sign-on. No data will be shared without your permission.
          </p>
        </div>

        {/* Footer - Consistent Action Area */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={() => setPendingLink(null)}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            onClick={handleLink}
            className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center justify-center min-w-[140px]"
          >
            {loadingAction?.startsWith('link') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Connect account'
            )}
          </button>
        </div>

      </div>
    </div>
  </ModalShell>
)}

    </div>
  );
};