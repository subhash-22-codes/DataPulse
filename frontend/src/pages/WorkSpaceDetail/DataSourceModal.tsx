import React, { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../services/api";
import { Dialog, Transition, RadioGroup, Switch } from '@headlessui/react';
import {
  CheckCircle2, Loader2, UploadCloud, X, Database, Globe, FileText,
  User, Key, BookOpen, Lock, Activity, FileSpreadsheet, AlertTriangle,
  Clock, Cloud, Cpu, Zap, Check, Shield, RefreshCw
} from "lucide-react";
import { Workspace } from "../../types";
import axios from "axios";
import toast from 'react-hot-toast';

interface DataSourceModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspace: Workspace;
  onUpdate: (data: Partial<Workspace>) => void;
  onUploadStart: () => void;
}

interface UpdatePayload {
  data_source: string;
  is_polling_active?: boolean;
  polling_interval?: string;
  api_url?: string;
  api_header_name?: string;
  api_header_value?: string;
  db_type?: string;
  db_host?: string;
  db_port?: number;
  db_user?: string;
  db_password?: string;
  db_name?: string;
  db_query?: string;
}

type StageStatus = 'idle' | 'active' | 'done' | 'error';

interface UploadStage {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  status: StageStatus;
  duration?: number; // ms taken for this stage
}

// Minimum time each stage stays visible in the "active" state, even if the
// underlying request finished faster. Without this, fast stages (often
// under 300ms) flash idle → active → done before a human can read them.
// This only paces the visual feedback — the real elapsed time shown on the
// success screen is measured independently and is not affected by this.
const MIN_STAGE_VISIBLE_MS = 650;

const waitForMinDuration = async (stageStartedAt: number, minMs: number) => {
  const elapsed = Date.now() - stageStartedAt;
  if (elapsed < minMs) {
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
  }
};

// ─── ROTATING MESSAGES per stage ─────────────────────────────────────────────
const STAGE_MESSAGES: Record<string, string[]> = {
  init: [
    'Generating signed URL for your file',
    'Authenticating upload channel',
    'Reserving secure storage slot',
    'Preparing encrypted transfer path',
  ],
  transfer: [
    'Uploading directly to Supabase storage',
    'Streaming your CSV to the cloud',
    'Large file? Hang tight — transfer in progress',
    'Almost there — finalising bytes',
    'Still uploading — network speed varies',
    'Transfer taking longer than usual — nearly done',
    'Patience! Your file is on its way',
  ],
  process: [
    'Parsing rows and inferring column types',
    'Running statistical analysis per column',
    'Detecting missing values and duplicates',
    'Computing IQR outliers across numeric columns',
    'Scoring column health — 0 to 100',
    'Comparing schema against previous upload',
    'Staging results to database',
    'Almost done — committing metrics',
  ],
  complete: [
    'Activating alert rule engine',
    'Running incident detection logic',
    'Scanning for threshold violations',
    'Pushing real-time notifications via WebSocket',
    'Finalising workspace configuration',
  ],
};

// ─── ELAPSED TIMER ────────────────────────────────────────────────────────────
const ElapsedTimer: React.FC<{ startTime: number; active: boolean }> = ({ startTime, active }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active, startTime]);

  const fmt = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <span className="tabular-nums text-slate-400">{fmt(elapsed)}</span>
  );
};

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ stages: UploadStage[] }> = ({ stages }) => {
  const done = stages.filter(s => s.status === 'done').length;
  const total = stages.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-manrope">
          {done} of {total} stages complete
        </span>
        <span className="text-[10px] font-bold text-blue-600 font-manrope tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── STAGE ROW ────────────────────────────────────────────────────────────────
const StageRow: React.FC<{
  stage: UploadStage;
  isLast: boolean;
  messageIdx: number;
}> = ({ stage, isLast, messageIdx }) => {
  const messages = STAGE_MESSAGES[stage.id] ?? [stage.sublabel];
  const msg = messages[messageIdx % messages.length];

  return (
    <div className="relative">
      {!isLast && (
        <div className={`absolute left-[17px] top-[36px] w-px h-3 transition-colors duration-500 ${
          stage.status === 'done' ? 'bg-emerald-200' : 'bg-slate-100'
        }`} />
      )}

      <div className={`flex items-start gap-3 p-2.5 rounded-sm border transition-all duration-400 ${
        stage.status === 'active'
          ? 'bg-blue-50/60 border-blue-100 shadow-[0_1px_4px_rgba(37,99,235,0.08)]'
          : stage.status === 'done'
          ? 'bg-white border-slate-100'
          : stage.status === 'error'
          ? 'bg-red-50/50 border-red-100'
          : 'bg-white border-transparent opacity-35'
      }`}>

        {/* Icon box */}
        <div className={`w-7 h-7 rounded-sm flex-shrink-0 flex items-center justify-center transition-all duration-400 ${
          stage.status === 'done'
            ? 'bg-emerald-50 border border-emerald-200'
            : stage.status === 'active'
            ? 'bg-blue-600'
            : stage.status === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-slate-50 border border-slate-200'
        }`}>
          {stage.status === 'done' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
          ) : stage.status === 'error' ? (
            <X className="w-3.5 h-3.5 text-red-500" strokeWidth={2.5} />
          ) : stage.status === 'active' ? (
            <div className="w-3.5 h-3.5 text-white">{stage.icon}</div>
          ) : (
            <div className="w-3.5 h-3.5 text-slate-300">{stage.icon}</div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-[11.5px] font-bold font-manrope leading-tight ${
            stage.status === 'active' ? 'text-blue-900'
            : stage.status === 'done'  ? 'text-slate-700'
            : stage.status === 'error' ? 'text-red-700'
            : 'text-slate-400'
          }`}>
            {stage.label}
          </p>

          <div className={`text-[10px] mt-0.5 font-manrope flex items-center gap-1.5 ${
            stage.status === 'active' ? 'text-blue-500'
            : stage.status === 'done'  ? 'text-slate-400'
            : stage.status === 'error' ? 'text-red-500'
            : 'text-slate-300'
          }`}>
            {stage.status === 'active' && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="inline-block w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '240ms' }} />
              </>
            )}
            <span className="truncate">{stage.status === 'active' ? msg : stage.sublabel}</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {stage.status === 'done' && stage.duration !== undefined && (
            <span className="text-[9px] font-semibold text-slate-400 tabular-nums font-manrope">
              {stage.duration < 1000
                ? `${stage.duration}ms`
                : `${(stage.duration / 1000).toFixed(1)}s`}
            </span>
          )}
          {stage.status === 'done' && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-manrope uppercase tracking-wider">
              Done
            </span>
          )}
          {stage.status === 'active' && (
            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
          )}
          {stage.status === 'error' && (
            <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full font-manrope uppercase tracking-wider">
              Failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── UPLOAD PROGRESS PANEL ────────────────────────────────────────────────────
const UploadProgressPanel: React.FC<{
  stages: UploadStage[];
  isSuccess: boolean;
  isError: boolean;
  isFinalizing: boolean;
  elapsedSeconds: number | null;
  filename: string;
  startTime: number;
  onRetry?: () => void;
}> = ({ stages, isSuccess, isError, isFinalizing, elapsedSeconds, filename, startTime, onRetry }) => {

  // Rotating message index — ticks every 2.5s per active stage
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => i + 1), 2500);
    return () => clearInterval(t);
  }, []);

  const activeStage = stages.find(s => s.status === 'active');

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-12 min-h-[340px] gap-5">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Check className="w-7 h-7 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-full bg-emerald-400/15 animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>

        <div className="text-center space-y-1">
          <p className="text-[14px] font-bold text-slate-900 font-poppins">Upload complete</p>
          <p className="text-[12px] text-slate-500 font-manrope">
            <span className="font-semibold text-slate-700 truncate">{filename}</span>
            {' '}processed in{' '}
            <span className="font-bold text-blue-600">{elapsedSeconds?.toFixed(1)}s</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10.5px] font-bold text-emerald-700 font-manrope uppercase tracking-wider">
              DataPulse is now watching
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-manrope">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Schema indexed
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Alerts armed
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Incidents live
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-manrope">Closing automatically…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-12 min-h-[340px] gap-5">
        <div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
          <X className="w-6 h-6 text-red-500" strokeWidth={2} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[13px] font-bold text-slate-900 font-poppins">Upload failed</p>
          <p className="text-[11.5px] text-slate-500 font-manrope max-w-xs text-center">
            Something went wrong during the transfer. Your file was not processed.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col px-6 py-6 min-h-[340px] gap-5">

      {/* File + timer header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 max-w-[240px]">
          <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="text-[10.5px] font-semibold text-slate-600 font-manrope truncate">
            {filename}
          </span>
        </div>
        <div className="text-[10.5px] font-medium font-manrope flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <ElapsedTimer startTime={startTime} active={!isSuccess && !isError} />
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar stages={stages} />

      {/* Stage list */}
      <div className="space-y-1 flex-1">
        {stages.map((stage, idx) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isLast={idx === stages.length - 1}
            messageIdx={msgIdx}
          />
        ))}
      </div>

      {/* Active / finalizing hint — this slot is never left blank, so the
          panel never reads as "stuck" between the last stage finishing and
          the success screen appearing. */}
      {activeStage ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-blue-50/50 border border-blue-100">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <p className="text-[10px] text-blue-600 font-manrope leading-relaxed">
            {activeStage.id === 'transfer'
              ? 'Large files can take 10–20s to transfer. Do not close this window.'
              : activeStage.id === 'process'
              ? 'Processing up to 500K rows. Time varies with file size.'
              : 'Almost there — finishing up.'}
          </p>
        </div>
      ) : isFinalizing ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-emerald-50/60 border border-emerald-100">
          <Loader2 className="w-3 h-3 text-emerald-600 animate-spin flex-shrink-0" />
          <p className="text-[10px] text-emerald-700 font-manrope leading-relaxed">
            All steps complete — wrapping up your workspace.
          </p>
        </div>
      ) : null}
    </div>
  );
};

// ─── POLLING SECTION ──────────────────────────────────────────────────────────
const PollingSection: React.FC<{
  pollingInterval: string;
  setPollingInterval: (val: string) => void;
  isPollingActive: boolean;
  setIsPollingActive: (val: boolean) => void;
}> = ({ pollingInterval, setPollingInterval, isPollingActive, setIsPollingActive }) => (
  <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest font-manrope flex items-center gap-2">
      <Activity className="w-3.5 h-3.5 text-slate-400" />
      Auto-Sync Settings
    </h4>
    <div className="flex items-start gap-5">
      <div className="flex-1 space-y-1">
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-manrope">Frequency</label>
        <div className="relative">
          <select
            value={pollingInterval}
            onChange={e => setPollingInterval(e.target.value)}
            disabled={!isPollingActive}
            className="appearance-none w-full rounded-sm border border-slate-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 py-2 pl-3 pr-8 text-[13px] font-manrope text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 transition-all font-medium"
          >
            <option value="30min">Every 30 Minutes</option>
            <option value="hourly">Hourly</option>
            <option value="3hours">Every 3 Hours</option>
            <option value="12hours">Every 12 Hours</option>
            <option value="daily">Daily</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-between bg-slate-50/50 p-2 rounded-sm border border-slate-100">
        <div className="flex flex-col pl-1">
          <span className="text-[11.5px] font-semibold text-slate-900 font-manrope">Enable Sync</span>
          <span className="text-[10px] text-slate-500 font-manrope">Fetch data automatically</span>
        </div>
        <Switch
          checked={isPollingActive}
          onChange={setIsPollingActive}
          className={`${isPollingActive ? 'bg-blue-600' : 'bg-slate-200'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
        >
          <span
            aria-hidden="true"
            className={`${isPollingActive ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out`}
          />
        </Switch>
      </div>
    </div>
  </div>
);


  const STAGE_DEFS: Omit<UploadStage, 'status'>[] = [
    {
      id: 'init',
      label: 'Securing upload channel',
      sublabel: 'Generating signed URL for your file',
      icon: <Cloud className="w-3.5 h-3.5" />,
    },
    {
      id: 'transfer',
      label: 'Transferring to cloud storage',
      sublabel: 'Uploading directly to Supabase',
      icon: <UploadCloud className="w-3.5 h-3.5" />,
    },
    {
      id: 'process',
      label: 'Reading and analysing your data',
      sublabel: 'Parsing rows, running quality checks',
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
    {
      id: 'complete',
      label: 'Activating monitoring',
      sublabel: 'Alert engine, incident detection, WebSocket',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
  ];

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────
export const DataSourceModal: React.FC<DataSourceModalProps> = ({
  isOpen, setIsOpen, workspace, onUpdate, onUploadStart
}) => {
  const [dataSource, setDataSource]     = useState(workspace.data_source || "CSV");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [apiUrl, setApiUrl]                 = useState('');
  const [pollingInterval, setPollingInterval] = useState('hourly');
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [apiHeaderName, setApiHeaderName]   = useState('');
  const [apiHeaderValue, setApiHeaderValue] = useState('');

  const [dbHost, setDbHost]     = useState('');
  const [dbPort, setDbPort]     = useState(5432);
  const [dbUser, setDbUser]     = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName]     = useState('');
  const [dbQuery, setDbQuery]   = useState('SELECT * FROM your_table LIMIT 100;');

  const [isSaving, setIsSaving] = useState(false);
  const isAutoDisabled = !workspace.is_polling_active && workspace.last_failure_reason;

  // Upload progress
  const [uploadStages, setUploadStages]     = useState<UploadStage[]>([]);
  const [isUploading, setIsUploading]       = useState(false);
  const [uploadSuccess, setUploadSuccess]   = useState(false);
  const [uploadError, setUploadError]       = useState(false);
  const [isFinalizing, setIsFinalizing]     = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const stageDurationsRef = useRef<Record<string, number>>({});


  const initStages = useCallback(
      (): UploadStage[] =>
        STAGE_DEFS.map((s) => ({
          ...s,
          status: "idle",
        })),
      []
    );

  const update = useCallback((id: string, status: StageStatus, stageStart?: number) => {
    if (status === 'done' && stageStart !== undefined) {
      stageDurationsRef.current[id] = Date.now() - stageStart;
    }
    setUploadStages(prev => prev.map(s =>
      s.id === id
        ? { ...s, status, duration: status === 'done' ? stageDurationsRef.current[id] : s.duration }
        : s
    ));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDataSource(workspace.data_source || 'CSV');
      setApiUrl(workspace.api_url || '');
      setPollingInterval(workspace.polling_interval || 'hourly');
      setIsPollingActive(workspace.is_polling_active || false);
      setApiHeaderName(workspace.api_header_name || '');
      setApiHeaderValue('');
      setDbHost(workspace.db_host || '');
      setDbPort(workspace.db_port || 5432);
      setDbUser(workspace.db_user || '');
      setDbPassword('');
      setDbName(workspace.db_name || '');
      setDbQuery(workspace.db_query || 'SELECT * FROM your_table LIMIT 100;');
      setSelectedFile(null);
      setIsUploading(false);
      setUploadSuccess(false);
      setUploadError(false);
      setIsFinalizing(false);
      setUploadStages([]);
      setElapsedSeconds(null);
      stageDurationsRef.current = {};
    }
  }, [isOpen, workspace]);

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    const payload: UpdatePayload = {
      data_source: dataSource,
      is_polling_active: isPollingActive,
      polling_interval: pollingInterval,
    };
    if (dataSource === 'API') {
      if (!apiUrl.trim()) { setIsSaving(false); return toast.error("API URL cannot be empty."); }
      payload.api_url = apiUrl;
      if (apiHeaderName.trim()) payload.api_header_name = apiHeaderName;
      if (apiHeaderValue.trim()) payload.api_header_value = apiHeaderValue;
    } else if (dataSource === 'DB') {
      if (!dbHost.trim() || !dbUser.trim() || !dbName.trim() || !dbQuery.trim()) {
        setIsSaving(false);
        return toast.error("Please fill all required database fields.");
      }
      payload.db_type = 'postgresql';
      payload.db_host = dbHost;
      payload.db_port = dbPort;
      payload.db_user = dbUser;
      if (dbPassword) payload.db_password = dbPassword;
      payload.db_name = dbName;
      payload.db_query = dbQuery;
    }
    try {
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, payload);
      onUpdate(res.data);
      toast.success("Configuration saved successfully!", {
        style: { fontSize: '13px', background: '#334155', color: '#fff' }
      });
      setIsOpen(false);
    } catch {
      toast.error("Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!selectedFile) return toast.error("Please select a CSV file to upload.");
    if (selectedFile.size > 30 * 1024 * 1024) {
      return toast.error("File is too large! Maximum limit is 30MB.", {
        style: { fontSize: "13px", background: "#991b1b", color: "#fff" },
      });
    }
    if (!selectedFile.name.endsWith(".csv")) {
      return toast.error("Only CSV files are allowed.");
    }

    setIsUploading(true);
    setUploadError(false);
    setUploadSuccess(false);
    setIsFinalizing(false);
    setUploadStages(initStages());
    startTimeRef.current = Date.now();
    stageDurationsRef.current = {};

    try {
      // Stage 1 — init
      const s1 = Date.now();
      update('init', 'active');
      const initRes = await api.post(
        `/workspaces/${workspace.id}/upload-csv/init`,
        { filename: selectedFile.name, file_size: selectedFile.size }
      );
      const { upload_url, upload_id, storage_path } = initRes.data;
      await waitForMinDuration(s1, MIN_STAGE_VISIBLE_MS);
      update('init', 'done', s1);

      // Stage 2 — transfer
      const s2 = Date.now();
      update('transfer', 'active');
      await fetch(upload_url, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": "text/csv" },
      });
      await waitForMinDuration(s2, MIN_STAGE_VISIBLE_MS);
      update('transfer', 'done', s2);

      // Stage 3 — process
      const s3 = Date.now();
      update('process', 'active');
      await api.post(`/workspaces/${workspace.id}/upload-csv/complete`, {
        upload_id,
        storage_path,
      });
      await waitForMinDuration(s3, MIN_STAGE_VISIBLE_MS);
      update('process', 'done', s3);

      // Stage 4 — complete
      const s4 = Date.now();
      update('complete', 'active');
      onUploadStart();
      const res = await api.put(`/workspaces/${workspace.id}`, {
        data_source: "CSV",
        is_polling_active: false,
      });
      onUpdate(res.data);
      await waitForMinDuration(s4, MIN_STAGE_VISIBLE_MS);
      update('complete', 'done', s4);

      // Real elapsed time — measured independently of the visual pacing
      // above, so this number always reflects actual performance.
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(elapsed);

      // Explicit "finalizing" state instead of a blind, unexplained pause —
      // this is the gap that previously made the modal look stuck.
      setIsFinalizing(true);
      await new Promise(r => setTimeout(r, 600));
      setIsFinalizing(false);
      setUploadSuccess(true);

      // Auto-close after success
      await new Promise(r => setTimeout(r, 2200));
      setIsOpen(false);

    } catch (err) {
      console.error(err);
      setUploadError(true);
      setIsFinalizing(false);

      // Mark any active stage as error
      setUploadStages(prev => prev.map(s =>
        s.status === 'active' ? { ...s, status: 'error' } : s
      ));

      let msg = "File upload failed.";
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string") msg = detail;
        else if (Array.isArray(detail) && detail[0]?.msg) msg = detail[0].msg;
        else if (err.response?.status === 413) msg = "File too large. Max 30MB.";
      }
      toast.error(msg, {
        style: { fontSize: "13px", background: "#991b1b", color: "#fff" },
      });
    }
  };

  const handleRetry = () => {
    setIsUploading(false);
    setUploadError(false);
    setIsFinalizing(false);
    setUploadStages([]);
    stageDurationsRef.current = {};
  };

  const dataSourceOptions = [
    { value: "CSV", label: "CSV Upload",  description: "Static file ingestion", icon: FileSpreadsheet },
    { value: "API", label: "REST API",    description: "External JSON endpoint", icon: Globe },
    { value: "DB",  label: "PostgreSQL",  description: "Direct SQL connection",  icon: Database },
  ];

  const headerTitle = isUploading
    ? uploadSuccess ? 'All done!' : uploadError ? 'Upload failed' : 'Processing your file'
    : 'Configure Data Source';

  const headerSub = isUploading
    ? uploadSuccess
      ? 'Your data is ready — closing in a moment'
      : uploadError
      ? 'Something went wrong. You can try again.'
      : 'Do not close this window — transfer in progress'
    : 'Select and configure your primary ingestion method.';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50 font-sans"
        onClose={() => {
          if (isSaving || (isUploading && !uploadSuccess && !uploadError)) return;
          setIsOpen(false);
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[2px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-1" enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform rounded-sm bg-white shadow-2xl shadow-slate-900/10 transition-all overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/80">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-white">
                  <div className="space-y-0.5">
                    <Dialog.Title as="h3" className="text-[14px] font-bold text-slate-900 font-poppins">
                      {headerTitle}
                    </Dialog.Title>
                    {!isUploading && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-manrope ${
                          workspace.is_polling_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : isAutoDisabled
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            workspace.is_polling_active ? 'bg-emerald-500' : isAutoDisabled ? 'bg-red-500' : 'bg-slate-400'
                          }`} />
                          {workspace.is_polling_active ? 'Active' : isAutoDisabled ? 'Auto-disabled' : 'Paused'}
                        </span>
                      </div>
                    )}
                    <p className="text-[10.5px] text-slate-400 font-medium font-manrope">
                      {headerSub}
                    </p>
                  </div>

                  {(!isUploading || uploadSuccess || uploadError) && (
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none mt-0.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* ── Body ── */}
                {isUploading ? (
                  <UploadProgressPanel
                    stages={uploadStages}
                    isSuccess={uploadSuccess}
                    isError={uploadError}
                    isFinalizing={isFinalizing}
                    elapsedSeconds={elapsedSeconds}
                    filename={selectedFile?.name ?? ''}
                    startTime={startTimeRef.current}
                    onRetry={handleRetry}
                  />
                ) : (
                  <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    <div className="space-y-5">

                      {isAutoDisabled && (
                        <div className="p-4 rounded-sm bg-red-50 border border-red-100 flex gap-3">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-[12px] font-bold text-red-900 font-manrope">Polling was automatically stopped</p>
                            <p className="text-[11px] text-red-700 leading-relaxed font-manrope">
                              <span className="font-bold underline">Reason:</span> {workspace.last_failure_reason}
                            </p>
                            {workspace.auto_disabled_at && (
                              <p className="text-[10px] text-red-500 flex items-center gap-1 font-manrope">
                                <Clock className="h-3 w-3" />
                                Stopped at {new Date(workspace.auto_disabled_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Source selector */}
                      <RadioGroup value={dataSource} onChange={setDataSource}>
                        <div className="grid grid-cols-3 gap-2.5">
                          {dataSourceOptions.map((option) => (
                            <RadioGroup.Option
                              key={option.value}
                              value={option.value}
                              className={({ checked }) =>
                                `${checked
                                  ? 'ring-1 ring-blue-500 bg-blue-50/30 border-blue-400/50'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                } relative flex flex-col cursor-pointer rounded-sm border p-3 transition-all focus:outline-none select-none`
                              }
                            >
                              {({ checked }) => (
                                <>
                                  <div className={`w-7 h-7 rounded-sm flex items-center justify-center mb-2 transition-colors ${
                                    checked ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    <option.icon className="h-3.5 w-3.5" />
                                  </div>
                                  <RadioGroup.Label as="p" className={`font-bold text-[11.5px] font-manrope mb-0.5 ${checked ? 'text-blue-900' : 'text-slate-900'}`}>
                                    {option.label}
                                  </RadioGroup.Label>
                                  <p className={`text-[10px] font-manrope ${checked ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {option.description}
                                  </p>
                                  {checked && <CheckCircle2 className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-blue-600" />}
                                </>
                              )}
                            </RadioGroup.Option>
                          ))}
                        </div>
                      </RadioGroup>

                      {/* Dynamic forms */}
                      <div>
                        {dataSource === 'CSV' && (
                          <div>
                            {!selectedFile ? (
                              <div className="flex justify-center px-6 pt-8 pb-8 border border-dashed border-slate-300 rounded-sm hover:border-blue-400 hover:bg-slate-50/30 transition-all cursor-pointer group">
                                <div className="text-center space-y-2">
                                  <div className="mx-auto w-9 h-9 bg-slate-50 group-hover:bg-white rounded-sm flex items-center justify-center shadow-sm border border-slate-100">
                                    <UploadCloud className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                  </div>
                                  <div>
                                    <label htmlFor="file-upload-input" className="cursor-pointer text-[13px] font-semibold font-manrope text-blue-600 hover:text-blue-700">
                                      <span>Click to upload</span>
                                      <input
                                        id="file-upload-input"
                                        name="file-upload"
                                        type="file"
                                        className="sr-only"
                                        accept=".csv"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                                      />
                                    </label>
                                    <p className="text-[11px] text-slate-500 font-manrope mt-0.5">or drag and drop · CSV only · Max 30MB · up to ~500K rows</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-50 rounded-sm flex items-center justify-center border border-emerald-100">
                                    <FileText className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-semibold font-manrope text-slate-900 truncate max-w-[200px]">{selectedFile.name}</p>
                                    <p className="text-[10px] text-slate-500 font-manrope">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                </div>
                                <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-red-500 transition-colors">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {dataSource === 'API' && (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope">Endpoint URL</label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input type="url" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-sm border border-slate-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-[13px] font-mono text-slate-700 placeholder:text-slate-400 transition-all" placeholder="https://api.example.com/v1/data" />
                              </div>
                            </div>
                            <div className="bg-slate-50/50 rounded-sm p-4 border border-slate-100 space-y-3">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope flex items-center gap-1.5">
                                <Lock className="h-3 w-3" /> Auth Headers (Optional)
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-semibold text-slate-500 font-manrope">Key</label>
                                  <input type="text" value={apiHeaderName} onChange={e => setApiHeaderName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-sm border border-slate-200 bg-white text-[12px] font-manrope focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" placeholder="Authorization" />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-semibold text-slate-500 font-manrope">Value</label>
                                  <input type="password" value={apiHeaderValue} onChange={e => setApiHeaderValue(e.target.value)} className="w-full px-2.5 py-1.5 rounded-sm border border-slate-200 bg-white text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono" placeholder="Bearer token..." />
                                </div>
                              </div>
                            </div>
                            <PollingSection pollingInterval={pollingInterval} setPollingInterval={setPollingInterval} isPollingActive={isPollingActive} setIsPollingActive={setIsPollingActive} />
                          </div>
                        )}

                        {dataSource === 'DB' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-3">
                              <div className="col-span-8 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope">Host</label>
                                <input type="text" value={dbHost} onChange={e => setDbHost(e.target.value)} className="w-full px-3 py-2 rounded-sm border border-slate-200 bg-white shadow-sm text-[13px] font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="db.example.com" />
                              </div>
                              <div className="col-span-4 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope">Port</label>
                                <input type="number" value={dbPort} onChange={e => setDbPort(Number(e.target.value))} className="w-full px-3 py-2 rounded-sm border border-slate-200 bg-white shadow-sm text-[13px] font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="5432" />
                              </div>
                              <div className="col-span-6 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope">User</label>
                                <div className="relative">
                                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                  <input type="text" value={dbUser} onChange={e => setDbUser(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-sm border border-slate-200 bg-white shadow-sm text-[13px] font-manrope focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="postgres" />
                                </div>
                              </div>
                              <div className="col-span-6 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope">Password</label>
                                <div className="relative">
                                  <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                  <input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-sm border border-slate-200 bg-white shadow-sm text-[13px] font-manrope focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="••••••••" />
                                </div>
                              </div>
                              <div className="col-span-12 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope">Database Name</label>
                                <div className="relative">
                                  <Database className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                  <input type="text" value={dbName} onChange={e => setDbName(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-sm border border-slate-200 bg-white shadow-sm text-[13px] font-manrope focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="production_db" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-manrope flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> SQL Query
                              </label>
                              <textarea value={dbQuery} onChange={e => setDbQuery(e.target.value)} rows={4} className="w-full px-3 py-3 rounded-sm border border-slate-200 bg-slate-900 text-slate-200 shadow-sm font-mono text-[12px] leading-relaxed focus:ring-2 focus:ring-blue-500/50 resize-y" placeholder="SELECT * FROM my_table LIMIT 100;" />
                            </div>
                            <PollingSection pollingInterval={pollingInterval} setPollingInterval={setPollingInterval} isPollingActive={isPollingActive} setIsPollingActive={setIsPollingActive} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Footer ── */}
                {!isUploading && (
                  <div className="flex items-center justify-end gap-2 px-5 py-4 bg-white border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => !isSaving && setIsOpen(false)}
                      disabled={isSaving}
                      className="px-4 py-2 text-[11px] font-bold text-slate-400 font-manrope tracking-widest hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-all disabled:opacity-20"
                    >
                      Cancel
                    </button>

                    {dataSource === 'CSV' ? (
                      <button
                        type="button"
                        onClick={handleCsvUpload}
                        disabled={!selectedFile}
                        className="min-w-[148px] bg-blue-600 hover:bg-blue-700 px-5 py-2 text-[11px] font-bold text-white font-manrope tracking-widest rounded-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload & Process
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveConfiguration}
                        disabled={isSaving}
                        className="min-w-[148px] bg-blue-600 hover:bg-blue-700 px-5 py-2 text-[11px] font-bold text-white font-manrope tracking-widest rounded-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSaving
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                          : <><CheckCircle2 className="h-3.5 w-3.5" />Save Configuration</>
                        }
                      </button>
                    )}
                  </div>
                )}

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};