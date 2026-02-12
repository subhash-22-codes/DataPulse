import { useEffect, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  Loader2,
  Info,
  WifiOff,
  Database,
  Clock,
  RefreshCw,
  BarChart2,
  LineChart as LineIcon,
} from "lucide-react";
import { dataMetricsService } from "../../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type ColumnPoint = {
  date: string;
  missing_percent: number;
  unique_percent: number;
};

type ApiError =
  | null
  | {
      type: "network" | "server" | "db" | "timeout" | "unknown";
      message: string;
    };

type RawMetricPoint = {
  date: string;
  missing_percent: number;
  unique_percent: number;
};

const toISTLabel = (ts: string): string => {
  const safe = ts.replace(" ", "T");
  return new Date(safe).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

type Props = {
  workspaceId?: string;
  columnName?: string;
};

export default function ColumnHealthChart({
  workspaceId,
  columnName,
}: Props) {
  const id = workspaceId;
  const column = columnName ?? "";

  const [data, setData] = useState<ColumnPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [mode, setMode] = useState<"bar" | "line">("bar");

  const fetchMetrics = useCallback(async () => {
    if (!id || !column) return;

    setLoading(true);
    setError(null);

    try {
      const res = await dataMetricsService.getColumnMetrics(id, column);

      const pts: ColumnPoint[] = (res.data as RawMetricPoint[]).map((d) => ({
        date: String(d.date),
        missing_percent: Number(d.missing_percent),
        unique_percent: Number(d.unique_percent),
      }));

      pts.sort(
        (a, b) =>
          new Date(a.date.replace(" ", "T")).getTime() -
          new Date(b.date.replace(" ", "T")).getTime()
      );

      setData(pts);
    } catch (e: unknown) {
      if (!navigator.onLine) {
        setError({
          type: "network",
          message: "You are offline. Connect and retry.",
        });
        return;
      }

      const err = e as {
        response?: { status?: number };
      };

      const status = err?.response?.status;

      if (status === 404) {
        setError({
          type: "db",
          message: "No history exists for this column yet.",
        });
        return;
      }

      if (status && status >= 500) {
        setError({
          type: "server",
          message: "Backend failed. Try again later.",
        });
        return;
      }

      setError({
        type: "unknown",
        message: "Something went wrong. Please retry.",
      });
    } finally {
      setLoading(false);
    }
  }, [id, column]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const labels = data.map((d) => toISTLabel(d.date));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Missing values",
        data: data.map((d) => d.missing_percent),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.08)",
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointRadius: 3,
      },
      {
        label: "Unique values",
        data: data.map((d) => d.unique_percent),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.06)",
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const options = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      ticks: {
        autoSkip: true,
        maxTicksLimit: 10,
        maxRotation: 60,
        minRotation: 45,
      },
    },
    y: {
      beginAtZero: true,
      max: 100,
    },
  },
};


  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Column health:
            <span className="ml-2 text-blue-600 font-mono">
              {column}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Historical reliability and completeness trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === "bar" ? "line" : "bar")}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border rounded-md hover:bg-slate-50"
          >
            {mode === "bar" ? (
              <>
                <LineIcon className="h-3.5 w-3.5" />
                Line view
              </>
            ) : (
              <>
                <BarChart2 className="h-3.5 w-3.5" />
                Bar view
              </>
            )}
          </button>

          <button
            onClick={fetchMetrics}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border rounded-md hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border rounded-md hover:bg-slate-50"
          >
            <Info className="h-3.5 w-3.5" />
            Guide
          </button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-all">

          {/* Header */}
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Info className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold text-slate-800">
              Guide to your data quality
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-[12px] text-slate-600 leading-relaxed">

            {/* Composition */}
            <div>
              <p className="font-semibold text-slate-800 mb-1">
                Chart composition
              </p>
              <p>
                Each point represents a snapshot in time. Together, the
                red and blue areas reflect the quality balance of this
                column across uploads.
              </p>
            </div>

            {/* Legend */}
            <div>
              <p className="font-semibold text-slate-800 mb-1">
                Color meanings
              </p>

              <div className="space-y-2 mt-2">
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 mt-1 bg-blue-500 rounded-sm shrink-0" />
                  <span>
                    <span className="font-medium text-slate-800">
                      Blue:
                    </span>{" "}
                    Valid and unique values. A larger blue area indicates
                    cleaner, more stable data.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 mt-1 bg-red-500 rounded-sm shrink-0" />
                  <span>
                    <span className="font-medium text-slate-800">
                      Red:
                    </span>{" "}
                    Missing or incomplete values. Growth here may signal
                    ingestion issues or upstream failures.
                  </span>
                </div>
              </div>
            </div>

            {/* View Modes */}
            <div>
              <p className="font-semibold text-slate-800 mb-1">
                View modes
              </p>
              <p>
                <span className="font-medium text-slate-800">
                  Bar view
                </span>{" "}
                compares uploads side-by-side.{" "}
                <span className="font-medium text-slate-800">
                  Line view
                </span>{" "}
                highlights how the column health evolves over time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="h-[340px] flex items-center justify-center">
          <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-white border rounded-lg p-6 text-center text-sm text-slate-700">
          {error.type === "network" && <WifiOff className="mx-auto mb-2 h-5 w-5" />}
          {error.type === "db" && <Database className="mx-auto mb-2 h-5 w-5" />}
          {error.type === "timeout" && <Clock className="mx-auto mb-2 h-5 w-5" />}
          <p>{error.message}</p>
          <button
            onClick={fetchMetrics}
            className="mt-3 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && data.length > 0 && (
        <div className="h-[340px] lg:h-[380px]">
          {mode === "bar" ? (
            <Bar data={chartData} options={options} />
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="text-center text-sm text-slate-500 py-8">
          No history recorded yet for "{column}".
        </div>
      )}
    </div>
  );
}
