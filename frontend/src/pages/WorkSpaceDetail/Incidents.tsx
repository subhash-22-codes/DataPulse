import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, AlertTriangle, Info,
  FileText, CheckCircle2, WifiOff, ShieldAlert,
  Clock, Activity, Loader2, CheckCheck,
} from "lucide-react";
import { dataMetricsService } from "../../services/api";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Incident = {
  id: string;
  issue_type: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved" | "ignored";
  trigger_file_name: string;
  upload_type: string;
  first_seen: string | null;
  last_seen: string | null;
  column_name: string | null;
  resolved_at: string | null;
  row_drop_percent: number | null;
  schema_change_size: number | null;
  missing_percent: number | null;
  affected_columns: string[] | null;
  failure_reason: string | null;
};

type IncidentEvent = {
  id: string;
  event_type: "created" | "updated" | "resolved" | "reopened";
  severity: "low" | "medium" | "high";
  metrics: Record<string, unknown> | null;
  created_at: string;
};

// ─── HELPERS — untouched ─────────────────────────────────────────────────────

const fmtShort = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// ─── ISSUE LABEL MAP ─────────────────────────────────────────────────────────
const ISSUE_LABELS: Record<string, string> = {
  row_drop:              "Row count dropped",
  schema_breaking_change:"Schema changed",
  high_missing_column:   "High missing values",
  all_zero_numeric:      "Column all zeros",
  ingestion_failure:     "Ingestion failed",
};

const issueLabel = (type: string) =>
  ISSUE_LABELS[type] ?? type.replace(/_/g, " ");

// ─── SEVERITY CONFIG ─────────────────────────────────────────────────────────
const SEV = {
  high:   { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",    label: "High"   },
  medium: { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium" },
  low:    { dot: "bg-slate-400",  badge: "bg-slate-50 text-slate-600 border-slate-200", label: "Low"    },
};

const EVENT_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  created:  { icon: AlertTriangle, color: "text-red-500",     label: "Created" },
  updated:  { icon: Activity,      color: "text-amber-500",   label: "Updated" },
  resolved: { icon: CheckCircle2,  color: "text-emerald-500", label: "Resolved" },
  reopened: { icon: Clock,         color: "text-blue-500",    label: "Reopened" },
  ignored:  { icon: CheckCheck,    color: "text-slate-500",   label: "Reviewed" }, // ADD THIS
};

// ─── RENDER REASON — untouched logic ─────────────────────────────────────────
const renderReason = (i: Incident): string => {
  if (i.issue_type === "ingestion_failure" && i.failure_reason)
    return i.failure_reason;
  if (i.issue_type === "row_drop" && i.row_drop_percent !== null)
    return `Rows dropped by ${i.row_drop_percent}% vs last upload`;
  if (i.issue_type === "schema_breaking_change" && i.schema_change_size)
    return `Schema changed across ${i.schema_change_size} column${i.schema_change_size !== 1 ? "s" : ""}`;
  if (i.issue_type === "high_missing_column" && i.missing_percent !== null)
    return i.column_name
      ? `"${i.column_name}" has ${i.missing_percent}% missing values`
      : `High missing values (${i.missing_percent}%)`;
  if (i.issue_type === "all_zero_numeric" && i.column_name)
    return `"${i.column_name}" is almost entirely zero`;
  if (i.affected_columns && i.affected_columns.length > 0)
    return `Affected: ${i.affected_columns.join(", ")}`;
  return "Unusual data change detected";
};

const Timeline: React.FC<{ events: IncidentEvent[]; loading: boolean }> = ({ events, loading }) => {
  if (loading) {
    return (
      <div className="pl-8 pb-1 space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-8 rounded-sm bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="pl-8 text-[11px] text-slate-400 font-manrope py-2">
        No history yet for this incident.
      </p>
    );
  }

  return (
    <div className="pl-8 pr-2 pb-1 space-y-3 border-l border-slate-100 ml-3 mt-1">
      {events.map((e) => {
        const cfg = EVENT_CONFIG[e.event_type] ?? EVENT_CONFIG.updated;
        const Icon = cfg.icon;
        return (
          <div key={e.id} className="flex items-start gap-2.5 -ml-[29px]">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center mt-0.5">
              <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-700 font-manrope">
                  {cfg.label}
                </span>
                <span className={`text-[10px] font-bold ${SEV[e.severity].badge} px-1.5 py-0.5 rounded-full border`}>
                  {SEV[e.severity].label}
                </span>
                <span className="text-[10px] text-slate-400 font-manrope">
                  {fmtShort(e.created_at)}
                </span>
              </div>
              {e.metrics && Object.keys(e.metrics).length > 0 && (
                <p className="text-[10px] text-slate-400 font-manrope mt-0.5 font-mono">
                  {Object.entries(e.metrics)
                    .filter(([, v]) => v !== null && v !== undefined)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(",") : v}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── INCIDENT CARD ───────────────────────────────────────────────────────────
const IncidentCard: React.FC<{
  incident: Incident;
  onResolve: (id: string) => void;
  resolving: boolean;
  workspaceId: string;
}> = ({ incident: i, onResolve, resolving, workspaceId }) => {
  const sev = SEV[i.severity];
  const isOpen = i.status === "open";

  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);

    if (next && !eventsLoaded) {
      setEventsLoading(true);
      try {
        const res = await dataMetricsService.getIncidentEvents(workspaceId, i.id);
        setEvents(Array.isArray(res.data) ? res.data : []);
        setEventsLoaded(true);
      } catch (err) {
        console.error("getIncidentEvents failed", err);
      } finally {
        setEventsLoading(false);
      }
    }
  };

  return (
    <div className={`bg-white border rounded-sm transition-all duration-200 ${
      isOpen
        ? "border-slate-200 hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
        : "border-slate-100 opacity-75"
    }`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">

          {/* Severity dot */}
          <div className="flex-shrink-0 mt-1">
            <div className={`w-2 h-2 rounded-full ${sev.dot} ${isOpen ? "animate-pulse" : ""}`} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Top row */}
            <div className="flex flex-wrap items-start gap-2 mb-1.5">
              <span className="text-[13px] font-bold text-slate-900 font-poppins leading-snug">
                {issueLabel(i.issue_type)}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold font-manrope ${sev.badge}`}>
                {sev.label}
              </span>
              {!isOpen && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700 font-manrope">
                  <CheckCheck className="h-2.5 w-2.5" />
                  {i.status === "resolved" ? "Resolved" : "Ignored"}
                </span>
              )}
            </div>

            {/* Reason */}
            <p className="text-xs text-slate-500 font-manrope leading-relaxed mb-3">
              {renderReason(i)}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* File */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-manrope">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[160px] sm:max-w-[240px]">
                  {i.trigger_file_name}
                </span>
              </div>

              {/* Upload type */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-manrope">
                <Activity className="h-3 w-3 flex-shrink-0" />
                <span className="capitalize">{i.upload_type}</span>
              </div>

              {/* First seen */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-manrope">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>First seen {fmtShort(i.first_seen)}</span>
              </div>

              {/* Resolved at */}
              {i.resolved_at && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-manrope">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  <span>Resolved {fmtShort(i.resolved_at)}</span>
                </div>
              )}

              {/* Affected columns */}
              {i.affected_columns && i.affected_columns.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {i.affected_columns.slice(0, 4).map((col) => (
                    <span
                      key={col}
                      className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm"
                    >
                      {col}
                    </span>
                  ))}
                  {i.affected_columns.length > 4 && (
                    <span className="text-[10px] text-slate-400 font-manrope px-1.5 py-0.5">
                      +{i.affected_columns.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline toggle + Resolve button */}
          <div className="flex-shrink-0 mt-0.5 flex items-center gap-2">
            <button
              onClick={toggleExpand}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-500 font-manrope hover:border-slate-300 hover:text-slate-900 transition-all active:scale-[0.98]"
            >
              <Clock className="h-3 w-3" />
              {expanded ? "Hide" : "History"}
            </button>

            {isOpen && (
              <button
                disabled={resolving}
                onClick={() => onResolve(i.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-600 font-manrope hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-40 whitespace-nowrap"
              >
                {resolving ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />Resolving…</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3" />Mark reviewed</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline panel */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 sm:px-5 py-3">
          <Timeline events={events} loading={eventsLoading} />
        </div>
      )}
    </div>
  );
};
// ─── STAT CHIP ────────────────────────────────────────────────────────────────
const StatChip: React.FC<{
  value: number;
  label: string;
  accent?: string;
}> = ({ value, label, accent = "text-slate-900" }) => (
  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-sm border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
    <span className={`text-base font-bold tabular-nums font-poppins ${accent}`}>
      {value}
    </span>
    <span className="text-xs text-slate-400 font-manrope">{label}</span>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Incidents() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Original state — untouched ────────────────────────────────────────────
  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [isOffline, setIsOffline]   = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [tab, setTab]               = useState<"active" | "resolved">("active");

  // ── Original fetch — untouched ────────────────────────────────────────────
  const fetchIncidents = useCallback(async () => {
    if (!id) { setError("Workspace id missing from URL"); setLoading(false); return; }
    setLoading(true);
    setError(null);
    setIsOffline(false);
    try {
      const res = await dataMetricsService.getIncidents(id);
      setIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      console.error("getIncidents failed", e);
      if (!navigator.onLine) setIsOffline(true);
      else setError("Could not load incidents from the server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  // ── Original resolve — untouched ──────────────────────────────────────────
  const resolveIncident = async (incidentId: string) => {
    if (!id) return;
    try {
      setResolvingId(incidentId);
      await dataMetricsService.resolveIncident(id, incidentId);
      await fetchIncidents();
    } catch (err) {
      console.error("resolveIncident failed", err);
      alert("Failed to resolve incident. Try again.");
    } finally {
      setResolvingId(null);
    }
  };

  // ── Derived — from existing state only ───────────────────────────────────
  const activeIncidents   = incidents.filter(i => i.status === "open");
  const resolvedIncidents = incidents.filter(i => i.status !== "open");
  const highCount         = activeIncidents.filter(i => i.severity === "high").length;
  const listToRender      = tab === "active" ? activeIncidents : resolvedIncidents;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Dot grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── Back + Refresh ── */}
        <div className="flex items-center justify-between mb-6">
          <button
          onClick={() => navigate(`/workspace/${id}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Workspace</span>
        </button>

          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all font-manrope disabled:opacity-40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Page header ── */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 mb-2.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100">
            <ShieldAlert className="h-3 w-3 text-red-600" />
            <span className="text-[8px] font-bold text-red-700 tracking-widest uppercase font-manrope">
              Incident tracking
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-poppins">
            Data incidents
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-lg leading-relaxed font-manrope">
            DataPulse automatically flags quality issues in your uploads — row
            drops, schema changes, and missing values. Review and resolve them
            here.
          </p>
        </div>

        {/* ── Stat chips ── */}
        {!loading && !error && !isOffline && incidents.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mb-6">
            <StatChip
              value={activeIncidents.length}
              label="active"
              accent={activeIncidents.length > 0 ? "text-red-600" : "text-slate-900"}
            />
            <StatChip
              value={highCount}
              label="high severity"
              accent={highCount > 0 ? "text-red-600" : "text-slate-900"}
            />
            <StatChip
              value={resolvedIncidents.length}
              label="resolved"
              accent="text-emerald-600"
            />
            <StatChip
              value={incidents.length}
              label="total"
            />
          </div>
        )}

        {/* ── Main panel ── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden mb-4">

          {/* Panel header + tabs */}
          <div className="px-4 sm:px-5 pt-4 pb-0 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <p className="text-[11px] text-slate-400 font-manrope flex items-center gap-1.5">
                <Info className="h-3 w-3 flex-shrink-0" />
                Open incidents mean your latest data may still have quality issues.
              </p>
            </div>

            {/* Tab strip */}
            <div className="flex gap-0">
              <button
                onClick={() => setTab("active")}
                className={`relative px-4 py-2.5 text-[12px] font-bold font-manrope transition-colors border-b-2 ${
                  tab === "active"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Active
                {activeIncidents.length > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                    tab === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {activeIncidents.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab("resolved")}
                className={`relative px-4 py-2.5 text-[12px] font-bold font-manrope transition-colors border-b-2 ${
                  tab === "resolved"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Resolved
                {resolvedIncidents.length > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                    tab === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {resolvedIncidents.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="p-6 space-y-2.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-20 rounded-sm bg-slate-100 animate-pulse"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 1 - i * 0.2 }}
                />
              ))}
            </div>
          )}

          {/* ── Offline ── */}
          {!loading && isOffline && (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-9 h-9 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center">
                <WifiOff className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 font-poppins">You're offline</p>
                <p className="text-xs text-slate-400 font-manrope mt-0.5">
                  Check your connection and refresh.
                </p>
              </div>
              <button
                onClick={fetchIncidents}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-9 h-9 rounded-sm border border-red-100 bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 font-poppins">Failed to load</p>
                <p className="text-xs text-slate-400 font-manrope mt-0.5 max-w-xs">{error}</p>
              </div>
              <button
                onClick={fetchIncidents}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && !isOffline && listToRender.length === 0 && (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-9 h-9 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center">
                {tab === "active"
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <FileText className="h-4 w-4 text-slate-400" />
                }
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 font-poppins">
                  {tab === "active" ? "No active incidents" : "Nothing resolved yet"}
                </p>
                <p className="text-xs text-slate-400 font-manrope mt-0.5 max-w-xs">
                  {tab === "active"
                    ? "Your latest data looks stable. DataPulse will flag anything unusual automatically."
                    : "Incidents you mark as reviewed will appear here."}
                </p>
              </div>
            </div>
          )}

          {/* ── Incident list ── */}
          {!loading && !error && !isOffline && listToRender.length > 0 && (
            <div className="p-3 sm:p-4 space-y-2">
              {listToRender.map(i => (
                <IncidentCard
                  key={i.id}
                  incident={i}
                  onResolve={resolveIncident}
                  resolving={resolvingId === i.id}
                  workspaceId={id!}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Guide ── */}
        {!loading && !error && !isOffline && incidents.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope mb-3.5">
              How incidents work
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-500 font-manrope leading-relaxed">
              <div>
                <p className="font-bold text-slate-800 text-[12px] mb-1">Active</p>
                <p>These are current issues in your data that DataPulse caught automatically. Review them to confirm whether action is needed.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-[12px] mb-1">Auto-resolved</p>
                <p>A newer upload fixed the issue on its own — for example, missing data that reappeared in the next file.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-[12px] mb-1">Mark reviewed</p>
                <p>You or a teammate checked this and it's fine. Marking it reviewed moves it out of the active list.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-[12px] mb-1">Severity</p>
                <p>
                  <span className="font-semibold text-red-600">High</span> — needs attention now.{" "}
                  <span className="font-semibold text-amber-600">Medium</span> — worth checking.{" "}
                  <span className="font-semibold text-slate-600">Low</span> — informational.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}