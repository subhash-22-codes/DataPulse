import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dataMetricsService } from "../../services/api";
import ColumnTrends from "./ColumnHealthChart";
import {
  ArrowLeft,
  WifiOff,
  ServerCrash,
} from "lucide-react";

type ErrorType = null | "network" | "server" | "unknown";

interface ColumnMetric {
  date: string;
  missing_percent: number;
  unique_percent: number;
}

const ColumnsHealth = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ColumnMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);

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
        const res = await dataMetricsService.getColumnMetrics(
          id,
          selectedColumn
        );
        setMetrics(res.data);
      } catch {
        setMetrics([]);
      }
    };

    fetchMetrics();
  }, [id, selectedColumn]);

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Back */}
        <div>
          <button
            onClick={() => navigate(`/workspace/${id}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </button>
        </div>

        {/* Page Header */}
        <div className="mt-4">
          <h1 className="text-xl font-semibold text-slate-900">
            Column Health
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Track how each column evolves over time. Monitor missing values
            and uniqueness patterns across uploads to identify quality degradation early.
          </p>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar — SQL Style Column Table */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm custom-scrollbar">

            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Table Columns
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {columns.length} total columns
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">

              {loading && (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 bg-slate-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!loading && error === "network" && (
                <div className="p-6 text-center text-xs text-slate-500">
                  <WifiOff className="h-4 w-4 mx-auto mb-2" />
                  Offline
                </div>
              )}

              {!loading && error === "server" && (
                <div className="p-6 text-center text-xs text-slate-500">
                  <ServerCrash className="h-4 w-4 mx-auto mb-2" />
                  Server error
                </div>
              )}

              {!loading && !error && columns.length > 0 && (
                <table className="w-full text-sm">
                  <tbody>
                    {columns.map((col, index) => {
                      const active = selectedColumn === col;

                      return (
                        <tr
                          key={col}
                          onClick={() => setSelectedColumn(col)}
                          className={`
                            cursor-pointer
                            border-b border-slate-100
                            transition
                            ${
                              active
                                ? "bg-blue-50"
                                : "hover:bg-slate-50"
                            }
                          `}
                        >
                          <td className="px-4 py-2 font-mono text-slate-700">
                            {col}
                          </td>

                          <td className="px-4 py-2 text-right text-[11px] text-slate-400">
                            #{index + 1}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

            </div>
          </div>


          {/* Main */}
          <div className="lg:col-span-3 space-y-4">

            {!selectedColumn && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center">
                <p className="text-sm font-medium text-slate-800">
                  Select a column to begin
                </p>
              </div>
            )}

            {selectedColumn && (
              <>
                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] text-slate-500">
                      Latest Missing
                    </p>
                    <p className="text-sm font-semibold text-red-600">
                      {latest ? `${latest.missing_percent}%` : "--"}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] text-slate-500">
                      Latest Unique
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      {latest ? `${latest.unique_percent}%` : "--"}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] text-slate-500">
                      Upload Observations
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {metrics.length}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <ColumnTrends
                    workspaceId={id}
                    columnName={selectedColumn}
                  />
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
