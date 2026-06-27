import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dataMetricsService } from "../../services/api";
import ColumnTrends from "./ColumnHealthChart";
import {
  ArrowLeft,
  WifiOff,
  ServerCrash,
  Database,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type ErrorType = null | "network" | "server" | "unknown";

interface ColumnMetric {
  date: string;
  missing_percent: number;
  unique_percent: number;
  health_score: number | null;  // ← added
}

const ColumnsHealth = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ColumnMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchColumns = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dataMetricsService.getColumns(id);
        setColumns(res.data);
      } catch (e: unknown) {
        if (!navigator.onLine) {
          setError("network");
        } else {
          const err = e as { response?: { status?: number } };
          if (err?.response?.status && err.response.status >= 500) {
            setError("server");
          } else {
            setError("unknown");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchColumns();
  }, [id]);

  useEffect(() => {
    if (!id || !selectedColumn) return;
    const fetchMetrics = async () => {
      try {
        const res = await dataMetricsService.getColumnMetrics(id, selectedColumn);
        setMetrics(res.data);
      } catch {
        setMetrics([]);
      }
    };
    fetchMetrics();
  }, [id, selectedColumn]);

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const filteredColumns = columns.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const healthLabel =
  latest == null
    ? null
    : (latest.health_score ?? 0) >= 90
    ? { text: "Healthy", tone: "good" as const }
    : (latest.health_score ?? 0) >= 70
    ? { text: "Needs attention", tone: "warn" as const }
    : { text: "At risk", tone: "bad" as const };

  const toneStyles = {
    good: "text-emerald-600 bg-emerald-50 border-emerald-200",
    warn: "text-amber-600 bg-amber-50 border-amber-200",
    bad:  "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Subtle dot grid ── */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── Back ── */}
        <button
          onClick={() => navigate(`/workspace/${id}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Workspace</span>
        </button>

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-poppins">
              Column health
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-lg leading-relaxed font-manrope">
              Track missing values and uniqueness across uploads. Catch data quality issues before they reach your team.
            </p>
          </div>

          {/* Stat chip */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="w-7 h-7 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Database className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="font-manrope">
              <p className="text-[10px] text-slate-400 leading-none">Columns tracked</p>
              <p className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                {loading ? "—" : columns.length}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">

            {/* Sidebar header */}
            <div className="px-3.5 py-3 border-b border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-manrope">
                  Columns
                </p>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded-sm px-2 py-0.5 font-manrope">
                  {filteredColumns.length}
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter columns..."
                  className="w-full text-xs pl-7 pr-3 py-1.5 rounded-sm border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-100 outline-none transition-all font-manrope placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Column list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: "65vh" }}>

              {/* Loading skeleton */}
              {loading && (
                <div className="p-3 space-y-1.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 rounded-sm bg-slate-100 animate-pulse"
                      style={{ animationDelay: `${i * 50}ms`, opacity: 1 - i * 0.1 }}
                    />
                  ))}
                </div>
              )}

              {/* Error states */}
              {!loading && error === "network" && (
                <div className="p-8 text-center">
                  <div className="h-8 w-8 rounded-sm border border-slate-200 bg-white flex items-center justify-center mx-auto mb-2.5">
                    <WifiOff className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 font-manrope">You're offline</p>
                </div>
              )}

              {!loading && error === "server" && (
                <div className="p-8 text-center">
                  <div className="h-8 w-8 rounded-sm border border-red-100 bg-red-50 flex items-center justify-center mx-auto mb-2.5">
                    <ServerCrash className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <p className="text-xs text-slate-500 font-manrope">Server error — try again</p>
                </div>
              )}

              {!loading && error === "unknown" && (
                <div className="p-8 text-center">
                  <p className="text-xs text-slate-500 font-manrope">Something went wrong.</p>
                </div>
              )}

              {/* Column items */}
              {!loading && !error && columns.length > 0 && (
                <div className="p-1.5 space-y-0.5">
                  {filteredColumns.map((col, index) => {
                    const active = selectedColumn === col;
                    return (
                      <button
                        key={col}
                        onClick={() => setSelectedColumn(col)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-left transition-all duration-150 group ${
                          active
                            ? "bg-blue-50 border border-blue-100"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`h-1.5 w-1.5 rounded-sm shrink-0 transition-colors ${
                            active ? "bg-blue-600" : "bg-slate-300 group-hover:bg-slate-400"
                          }`} />
                          <span className={`text-[12px] font-mono truncate ${
                            active ? "text-blue-700 font-semibold" : "text-slate-600"
                          }`}>
                            {col}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-manrope tabular-nums">
                          #{index + 1}
                        </span>
                      </button>
                    );
                  })}

                  {filteredColumns.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8 font-manrope">
                      No columns match "{search}"
                    </p>
                  )}
                </div>
              )}

              {/* Empty columns */}
              {!loading && !error && columns.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-xs text-slate-400 font-manrope">No columns found.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Main panel ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Empty state — no column selected */}
            {!selectedColumn && (
              <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center">
                <div className="w-10 h-10 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center mb-4">
                  <Database className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-800 font-poppins">
                  Select a column
                </p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs font-manrope leading-relaxed">
                  Pick any column from the left to view its missing value and uniqueness trends across uploads.
                </p>
              </div>
            )}

            {selectedColumn && (
              <>
                {/* ── KPI cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {/* Missing */}
                  <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-manrope mb-1.5">
                      Missing
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-red-600 font-poppins tabular-nums">
                      {latest ? `${latest.missing_percent}%` : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-manrope mt-0.5">latest snapshot</p>
                  </div>

                  {/* Unique */}
                  <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-manrope mb-1.5">
                      Unique
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-blue-600 font-poppins tabular-nums">
                      {latest ? `${latest.unique_percent}%` : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-manrope mt-0.5">latest snapshot</p>
                  </div>

                  {/* Snapshots */}
                  <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-manrope mb-1.5">
                      Snapshots
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 font-poppins tabular-nums">
                      {metrics.length}
                    </p>
                    <p className="text-[10px] text-slate-400 font-manrope mt-0.5">uploads tracked</p>
                  </div>

                  {/* Status */}
                  <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-manrope mb-1.5">
                      Status
                    </p>
                    {healthLabel && latest ? (
                      <div>
                        <p className="text-lg sm:text-xl font-bold font-poppins tabular-nums" style={{
                          color: healthLabel.tone === "good" ? "#059669"
                              : healthLabel.tone === "warn" ? "#d97706"
                              : "#dc2626"
                        }}>
                          {latest.health_score != null ? `${latest.health_score}/100` : "—"}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[10px] font-bold font-manrope mt-1 ${toneStyles[healthLabel.tone]}`}>
                          {healthLabel.tone === "good" && <TrendingDown className="h-3 w-3" />}
                          {healthLabel.tone === "warn" && <Minus className="h-3 w-3" />}
                          {healthLabel.tone === "bad"  && <TrendingUp className="h-3 w-3" />}
                          {healthLabel.text}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">—</p>
                    )}
                  </div>
                </div>

                {/* ── Chart panel ── */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-4 sm:p-5">
                  <ColumnTrends workspaceId={id} columnName={selectedColumn} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnsHealth;