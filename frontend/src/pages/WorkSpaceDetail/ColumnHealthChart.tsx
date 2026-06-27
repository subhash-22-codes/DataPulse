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
  TrendingUp,
  TrendingDown,
  X,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type ColumnPoint = {
  date: string;
  missing_percent: number;
  unique_percent: number;
  health_score: number | null;   // ← added
};

type ApiError = null | {
  type: "network" | "server" | "db" | "timeout" | "unknown";
  message: string;
};

type RawMetricPoint = {
  date: string;
  missing_percent: number;
  unique_percent: number;
  health_score: number | null;   // ← added
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  workspaceId?: string;
  columnName?: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ColumnHealthChart({ workspaceId, columnName }: Props) {
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
        health_score: d.health_score != null ? Number(d.health_score) : null, // ← added
      }));
      pts.sort(
        (a, b) =>
          new Date(a.date.replace(" ", "T")).getTime() -
          new Date(b.date.replace(" ", "T")).getTime()
      );
      setData(pts);
    } catch (e: unknown) {
      if (!navigator.onLine) {
        setError({ type: "network", message: "You're offline. Connect and retry." });
        return;
      }
      const err = e as { response?: { status?: number } };
      const status = err?.response?.status;
      if (status === 404) {
        setError({ type: "db", message: "No history recorded for this column yet." });
        return;
      }
      if (status && status >= 500) {
        setError({ type: "server", message: "Backend error. Try again in a moment." });
        return;
      }
      setError({ type: "unknown", message: "Something went wrong. Please retry." });
    } finally {
      setLoading(false);
    }
  }, [id, column]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const labels = data.map((d) => toISTLabel(d.date));

  const trend =
    data.length >= 2
      ? data[data.length - 1].missing_percent - data[0].missing_percent
      : null;

  // Only show health score dataset if at least one point has it
  const hasHealthScore = data.some((d) => d.health_score != null);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Missing %",
        data: data.map((d) => d.missing_percent),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.07)",
        borderWidth: 1.5,
        tension: 0.3,
        fill: true,
        pointRadius: data.length > 20 ? 2 : 3,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
      },
      {
        label: "Unique %",
        data: data.map((d) => d.unique_percent),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.05)",
        borderWidth: 1.5,
        tension: 0.3,
        fill: true,
        pointRadius: data.length > 20 ? 2 : 3,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
      },
      // ── Health score dataset — only if data exists ────────────────────────
      ...(hasHealthScore
        ? [
            {
              label: "Health score",
              data: data.map((d) => d.health_score),
              borderColor: "#10b981",
              backgroundColor: "rgba(16,185,129,0.06)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: data.length > 20 ? 2 : 3,
              pointBackgroundColor: "#10b981",
              pointBorderColor: "#fff",
              pointBorderWidth: 1.5,
              pointHoverRadius: 5,
              borderDash: [4, 3],  // dashed line — visually distinct from missing/unique
            },
          ]
        : []),
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 6,
          boxHeight: 6,
          font: { family: "Manrope, sans-serif", size: 11 },
          color: "#64748b",
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { family: "Manrope, sans-serif", size: 11 },
        bodyFont: { family: "Manrope, sans-serif", size: 11 },
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: (ctx: { dataset: { label: string }; parsed: { y: number } }) =>
            ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : "—"}${
              ctx.dataset.label === "Health score" ? "/100" : "%"
            }`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 8,
          maxRotation: 45,
          minRotation: 30,
          font: { family: "Manrope, sans-serif", size: 10 },
          color: "#94a3b8",
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: "#f1f5f9", drawBorder: false },
        border: { display: false },
        ticks: {
          font: { family: "Manrope, sans-serif", size: 10 },
          color: "#94a3b8",
          callback: (v: number) => `${v}`,
        },
      },
    },
  };

  const errorIconMap = {
    network: <WifiOff className="h-4 w-4 text-slate-400" />,
    db:      <Database className="h-4 w-4 text-slate-400" />,
    timeout: <Clock className="h-4 w-4 text-slate-400" />,
    server:  <Info className="h-4 w-4 text-slate-400" />,
    unknown: <Info className="h-4 w-4 text-slate-400" />,
  };

  return (
    <div className="space-y-4 font-manrope">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 font-poppins">
              {column}
            </h2>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
              column
            </span>
            {trend !== null && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                trend > 0
                  ? "bg-red-50 text-red-600 border-red-200"
                  : trend < 0
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}>
                {trend > 0 && <TrendingUp className="h-3 w-3" />}
                {trend < 0 && <TrendingDown className="h-3 w-3" />}
                {trend === 0
                  ? "Stable"
                  : `${trend > 0 ? "+" : ""}${trend.toFixed(1)}% missing`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Missing values, uniqueness and health score across uploads
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0">
          <div className="flex items-center rounded-sm border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setMode("bar")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-[11px] font-semibold transition-all ${
                mode === "bar"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <BarChart2 className="h-3 w-3" />
              <span className="hidden sm:inline">Bar</span>
            </button>
            <button
              onClick={() => setMode("line")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-[11px] font-semibold transition-all ${
                mode === "line"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LineIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Line</span>
            </button>
          </div>

          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-slate-200 bg-white text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] font-semibold transition-all ${
              showInfo
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            {showInfo ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
            <span className="hidden sm:inline">{showInfo ? "Close" : "Guide"}</span>
          </button>
        </div>
      </div>

      {/* ── Info panel ── */}
      {showInfo && (
        <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Reading this chart
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-slate-600 leading-relaxed">
            <div>
              <p className="font-semibold text-slate-800 mb-1 text-[12px]">What each point means</p>
              <p>Each bar or dot is one upload. The chart shows how this column's quality has changed over time.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1 text-[12px]">Colours</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm bg-blue-500 flex-shrink-0" />
                  <span><span className="font-medium text-slate-700">Blue</span> — unique values %.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm bg-red-500 flex-shrink-0" />
                  <span><span className="font-medium text-slate-700">Red</span> — missing values %.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500 flex-shrink-0" />
                  <span><span className="font-medium text-slate-700">Green</span> — health score /100.</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1 text-[12px]">Health score</p>
              <p>A 0–100 score combining missing values, uniqueness, outliers, and duplicates. Higher is better.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1 text-[12px]">Bar vs line</p>
              <p>Bar compares uploads side by side. Line shows the trend over time more clearly.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="h-[260px] sm:h-[300px] flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
          <p className="text-xs text-slate-400">Loading trend data…</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="border border-slate-200 bg-white rounded-sm p-8 text-center">
          <div className="h-9 w-9 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto mb-3">
            {errorIconMap[error.type]}
          </div>
          <p className="text-sm text-slate-700 font-medium mb-1">{error.message}</p>
          <button
            onClick={fetchMetrics}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* ── Chart ── */}
      {!loading && !error && data.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-3 px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-sm bg-red-500" />
              Avg missing: <span className="font-bold text-slate-700 tabular-nums">
                {(data.reduce((s, d) => s + d.missing_percent, 0) / data.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-sm bg-blue-500" />
              Avg unique: <span className="font-bold text-slate-700 tabular-nums">
                {(data.reduce((s, d) => s + d.unique_percent, 0) / data.length).toFixed(1)}%
              </span>
            </div>
            {hasHealthScore && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2 h-2 rounded-sm bg-emerald-500" />
                Avg health: <span className="font-bold text-slate-700 tabular-nums">
                  {(
                    data
                      .filter((d) => d.health_score != null)
                      .reduce((s, d) => s + (d.health_score ?? 0), 0) /
                    data.filter((d) => d.health_score != null).length
                  ).toFixed(1)}/100
                </span>
              </div>
            )}
            <div className="ml-auto text-[10px] text-slate-400 tabular-nums">
              {data.length} upload{data.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="h-[260px] sm:h-[300px] lg:h-[340px]">
            {mode === "bar"
              ? <Bar data={chartData} options={options} />
              : <Line data={chartData} options={options} />
            }
          </div>

          {data.length >= 2 && (
            <div className="flex items-center justify-between mt-3 px-1 text-[10px] text-slate-400">
              <span>From: {toISTLabel(data[0].date)}</span>
              <span>To: {toISTLabel(data[data.length - 1].date)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── No data ── */}
      {!loading && !error && data.length === 0 && (
        <div className="border border-slate-200 bg-white rounded-sm text-center py-12">
          <div className="h-9 w-9 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Database className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-700 font-medium">No history yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Upload data to start tracking{" "}
            <span className="font-mono text-slate-600">{column}</span>.
          </p>
        </div>
      )}
    </div>
  );
}