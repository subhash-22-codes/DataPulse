import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Info,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { dataMetricsService } from "../../services/api";

type Incident = {
  id: string;
  issue_type: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved" | "ignored";
  trigger_file_name: string;
  upload_type: string;
  first_seen: string | null;
  last_seen: string | null;
  resolved_at: string | null;
  row_drop_percent: number | null;
  schema_change_size: number | null;
  missing_percent: number | null;
  affected_columns: string[] | null;
  failure_reason: string | null;
};

const fmt = (iso: string | null) =>
  !iso ? "—" : new Date(iso).toLocaleString("en-IN");

export default function Incidents() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "resolved">("active");

  const fetchIncidents = useCallback(async () => {
    if (!id) {
      setError("Workspace id missing from URL");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const res = await dataMetricsService.getIncidents(id);
      setIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      console.error("getIncidents failed", e);

      if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        setError("Could not load incidents from the server.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

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

  const severityColor = {
    low: "bg-slate-50 text-slate-700 border-slate-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const statusColor = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ignored: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const renderReason = (i: Incident) => {
    if (i.issue_type === "ingestion_failure" && i.failure_reason) {
      return i.failure_reason;
    }

    if (i.issue_type === "row_drop" && i.row_drop_percent !== null) {
      return `Rows dropped by ${i.row_drop_percent}% vs last upload`;
    }

    if (i.issue_type === "schema_breaking_change" && i.schema_change_size) {
      return `Schema changed in ${i.schema_change_size} columns`;
    }

    if (i.issue_type === "high_missing_column" && i.missing_percent !== null) {
      return `High missing values (${i.missing_percent}%)`;
    }

    if (i.affected_columns && i.affected_columns.length > 0) {
      return `Affected: ${i.affected_columns.join(", ")}`;
    }

    return "Unusual data change detected";
  };

  const activeIncidents = incidents.filter((i) => i.status === "open");
  const resolvedIncidents = incidents.filter((i) => i.status !== "open");

  const listToRender =
    tab === "active" ? activeIncidents : resolvedIncidents;

  return (
    <div className="min-h-screen bg-slate-50 px-3 sm:px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2">
           <div>
            <button
              onClick={() => navigate(`/workspace/${id}`)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workspace
            </button>
          </div>

          <button
            onClick={fetchIncidents}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h1 className="text-base font-semibold text-slate-900">
                Data Incidents
              </h1>

              <div className="flex items-start sm:items-center gap-2 text-[11px] text-slate-600">
                <Info className="h-3.5 w-3.5 mt-0.5 sm:mt-0" />
                <span>
                  Open incidents mean your latest data still looks risky.
                </span>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-100">
              <button
                onClick={() => setTab("active")}
                className={`px-4 py-2 text-sm font-medium ${
                  tab === "active"
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-slate-600"
                }`}
              >
                Active ({activeIncidents.length})
              </button>

              <button
                onClick={() => setTab("resolved")}
                className={`px-4 py-2 text-sm font-medium ${
                  tab === "resolved"
                    ? "border-b-2 border-emerald-600 text-emerald-700"
                    : "text-slate-600"
                }`}
              >
                Resolved / Reviewed ({resolvedIncidents.length})
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-100 rounded-md animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && isOffline && (
            <div className="p-8 text-center text-sm text-slate-600">
              You appear to be offline. Check your connection and retry.
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && listToRender.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              {tab === "active"
                ? "No active incidents. Your latest data looks stable."
                : "No resolved or reviewed incidents yet."}
            </div>
          )}

          {!loading && listToRender.length > 0 && (
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Issue</th>
                  <th className="px-4 py-3 text-left font-semibold">File</th>
                  <th className="px-4 py-3 text-left font-semibold">Source</th>
                  <th className="px-4 py-3 text-left font-semibold">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">First seen</th>
                  <th className="px-4 py-3 text-left font-semibold">Last seen</th>
                  <th className="px-4 py-3 text-left font-semibold">Resolved at</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {listToRender.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <div>
                          <div className="font-semibold">
                            {i.issue_type.replace(/_/g, " ").toUpperCase()}
                          </div>
                          <div className="text-slate-600">
                            {renderReason(i)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span className="break-all">
                          {i.trigger_file_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">{i.upload_type}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full border ${severityColor[i.severity]}`}
                      >
                        {i.severity}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full border ${statusColor[i.status]}`}
                      >
                        {i.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">{fmt(i.first_seen)}</td>
                    <td className="px-4 py-3">{fmt(i.last_seen)}</td>
                    <td className="px-4 py-3">{fmt(i.resolved_at)}</td>

                    <td className="px-4 py-3 text-right">
                      {i.status === "open" && (
                        <button
                          disabled={resolvingId === i.id}
                          onClick={() => resolveIncident(i.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 font-bold rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {resolvingId === i.id
                            ? "Resolving..."
                            : "Mark as reviewed"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* --- PROFESSIONAL CONSOLE DOCUMENTATION FOOTER --- */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 text-[11px] text-slate-500 leading-relaxed shadow-sm">
            {/* Header: Simple and humble */}
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold border-b border-slate-50 pb-2">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              Understanding these updates
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="font-bold text-slate-800 mb-1">Active issues</p>
                <p>These are current risks in your data that might need a quick look to ensure everything is accurate.</p>
              </div>
              
              <div>
                <p className="font-bold text-slate-800 mb-1">Automatically resolved</p>
                <p>The system noticed that a newer file you uploaded fixed the previous issue on its own.</p>
              </div>
              
              <div>
                <p className="font-bold text-slate-800 mb-1">Manually reviewed</p>
                <p>These are updates that you or a team member have already checked and marked as okay.</p>
              </div>
              
              <div>
                <p className="font-bold text-slate-800 mb-1">Data snapshots</p>
                <p>Each record here belongs to a specific version of the file you uploaded, making it easy to track changes.</p>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
