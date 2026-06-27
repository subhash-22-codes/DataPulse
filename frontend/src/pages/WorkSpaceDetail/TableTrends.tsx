import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  ArrowLeft, Loader2, RefreshCw, Database,
  WifiOff, AlertCircle, TrendingUp, TrendingDown,
  Minus, Activity,
} from "lucide-react";
import { dataMetricsService } from "../../services/api";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

// ─── TYPES ────────────────────────────────────────────────────────────────────
type TableMetric = {
  metric_date: string;
  row_count: number;
  column_count: number;
};

// ─── HELPERS — untouched ──────────────────────────────────────────────────────
const parseIst = (ts: string) => {
  const clean = ts.replace(" ", "T");
  const d = new Date(clean);
  if (Number.isNaN(d.getTime())) return new Date(`${clean}+05:30`);
  return d;
};

const formatLabel = (ts: string) =>
  parseIst(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const fmtNum = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

// ─── DELTA BADGE ──────────────────────────────────────────────────────────────
const DeltaBadge: React.FC<{ delta: number | null; suffix?: string }> = ({
  delta,
  suffix = "",
}) => {
  if (delta === null) return null;
  const isUp   = delta > 0;
  const isDown = delta < 0;
  const neutral = delta === 0;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm border font-manrope ${
      isUp    ? "bg-blue-50 text-blue-600 border-blue-200"
      : isDown ? "bg-red-50 text-red-600 border-red-200"
      : "bg-slate-50 text-slate-500 border-slate-200"
    }`}>
      {isUp    && <TrendingUp   className="h-2.5 w-2.5" />}
      {isDown  && <TrendingDown className="h-2.5 w-2.5" />}
      {neutral && <Minus        className="h-2.5 w-2.5" />}
      {neutral ? "No change" : `${isUp ? "+" : ""}${delta.toLocaleString()}${suffix}`}
    </span>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  suffix?: string;
  accent?: string;
}> = ({ label, value, sub, delta, suffix, accent = "text-slate-900" }) => (
  <div className="bg-white border border-slate-200 rounded-sm p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope mb-2">
      {label}
    </p>
    <p className={`text-xl sm:text-2xl font-bold tabular-nums font-poppins ${accent}`}>
      {value}
    </p>
    {sub && (
      <p className="text-[10px] text-slate-400 font-manrope mt-0.5">{sub}</p>
    )}
    {delta !== undefined && delta !== null && (
      <div className="mt-2">
        <DeltaBadge delta={delta} suffix={suffix} />
      </div>
    )}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const TableTrends = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── All original state ────────────────────────────────────────────────────
  const [metrics, setMetrics]   = useState<TableMetric[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [offline, setOffline]   = useState(false);

  // ── Original fetch — untouched ────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setOffline(false);
    try {
      const res = await dataMetricsService.getTableMetrics(id);
      if (!Array.isArray(res.data)) throw new Error("Backend did not return an array");
      const normalized: TableMetric[] = res.data.map((m: unknown) => {
        const r = m as Record<string, unknown>;
        return {
          metric_date:   String(r.metric_date),
          row_count:     Number(r.row_count),
          column_count:  Number(r.column_count),
        };
      });
      const sorted = normalized.sort(
        (a, b) => parseIst(a.metric_date).getTime() - parseIst(b.metric_date).getTime()
      );
      setMetrics(sorted);
    } catch (err) {
      if (!navigator.onLine) {
        setOffline(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // ── Derived stats — purely from existing state ────────────────────────────
  const first  = metrics[0]                  ?? null;
  const latest = metrics[metrics.length - 1] ?? null;

  const rowDelta    = first && latest ? latest.row_count    - first.row_count    : null;
  const colDelta    = first && latest ? latest.column_count - first.column_count : null;
  const peakRows    = metrics.length ? Math.max(...metrics.map(m => m.row_count))    : null;
  const dateRange   = first && latest && first.metric_date !== latest.metric_date
    ? `${formatLabel(first.metric_date)} → ${formatLabel(latest.metric_date)}`
    : null;

  // ── Chart data ────────────────────────────────────────────────────────────
  const labels = metrics.map(m => formatLabel(m.metric_date));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Rows",
        data: metrics.map(m => m.row_count),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.06)",
        fill: true,
        tension: 0.3,
        pointRadius: metrics.length > 30 ? 2 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        borderWidth: 1.5,
      },
      {
        label: "Columns",
        data: metrics.map(m => m.column_count),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.04)",
        fill: true,
        tension: 0.3,
        pointRadius: metrics.length > 30 ? 2 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#16a34a",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        borderWidth: 1.5,
      },
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
          title: (items: { label: string }[]) => items[0]?.label ?? "",
          label: (ctx: { dataset: { label: string }; parsed: { y: number } }) =>
            ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`,
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
          maxRotation: 40,
          minRotation: 20,
          font: { family: "Manrope, sans-serif", size: 10 },
          color: "#94a3b8",
        },
      },
      y: {
        beginAtZero: false,
        grid: { color: "#f1f5f9" },
        border: { display: false },
        ticks: {
          font: { family: "Manrope, sans-serif", size: 10 },
          color: "#94a3b8",
          callback: (v: number) => fmtNum(v),
        },
      },
    },
  };

  const hasData = !loading && !error && !offline && metrics.length > 0;

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
            onClick={fetchMetrics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all font-manrope disabled:opacity-40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Page header ── */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-poppins">
            Table evolution
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-lg leading-relaxed font-manrope">
            Row count and column count across every upload. Spot growth, drops, and schema changes at a glance.
          </p>
          {dateRange && (
            <p className="text-[10px] text-slate-400 font-manrope mt-1.5 font-medium">
              {dateRange}
            </p>
          )}
        </div>

        {/* ── Stat cards ── */}
        {hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              label="Current rows"
              value={latest ? fmtNum(latest.row_count) : "—"}
              sub="latest snapshot"
              delta={rowDelta}
              suffix=" rows"
              accent="text-blue-600"
            />
            <StatCard
              label="Columns"
              value={latest ? String(latest.column_count) : "—"}
              sub="latest snapshot"
              delta={colDelta}
              suffix=" cols"
              accent="text-emerald-600"
            />
            <StatCard
              label="Peak rows"
              value={peakRows !== null ? fmtNum(peakRows) : "—"}
              sub="across all uploads"
              accent="text-slate-900"
            />
            <StatCard
              label="Snapshots"
              value={String(metrics.length)}
              sub="uploads tracked"
              accent="text-slate-900"
            />
          </div>
        )}

        {/* ── Chart panel ── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden mb-4">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Database className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 font-poppins leading-tight">
                  Row & column count over time
                </p>
                {hasData && (
                  <p className="text-[10px] text-slate-400 font-manrope">
                    {metrics.length} data point{metrics.length !== 1 ? "s" : ""} · IST
                  </p>
                )}
              </div>
            </div>

            {/* Legend dots */}
            {hasData && (
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-semibold text-slate-500 font-manrope">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-blue-500" /> Rows
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Columns
                </span>
              </div>
            )}
          </div>

          {/* Chart body */}
          <div className="p-4 sm:p-5">

            {/* Loading */}
            {loading && (
              <div className="h-[280px] sm:h-[340px] flex flex-col items-center justify-center gap-2.5">
                <Loader2 className="animate-spin h-5 w-5 text-blue-600" />
                <p className="text-xs text-slate-400 font-manrope">Loading trends…</p>
              </div>
            )}

            {/* Offline */}
            {offline && !loading && (
              <div className="h-[280px] sm:h-[340px] flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-9 h-9 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <WifiOff className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 font-poppins">You're offline</p>
                  <p className="text-xs text-slate-400 font-manrope mt-0.5">Reconnect and refresh to load trends.</p>
                </div>
                <button
                  onClick={fetchMetrics}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="h-[280px] sm:h-[340px] flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-9 h-9 rounded-sm border border-red-100 bg-red-50 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 font-poppins">Something went wrong</p>
                  <p className="text-xs text-slate-400 font-manrope mt-0.5 max-w-xs">{error}</p>
                </div>
                <button
                  onClick={fetchMetrics}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold font-manrope tracking-widest transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && !offline && metrics.length === 0 && (
              <div className="h-[280px] sm:h-[340px] flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-9 h-9 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <Database className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 font-poppins">No data yet</p>
                  <p className="text-xs text-slate-400 font-manrope mt-0.5">Upload data to your workspace to see trends appear here.</p>
                </div>
              </div>
            )}

            {/* Chart */}
            {hasData && (
              <>
                {/* Mini summary strip */}
                <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
                  {rowDelta !== null && (
                    <div className="flex items-center gap-1.5 text-[10px] font-manrope text-slate-500">
                      <span className="w-2 h-2 rounded-sm bg-blue-500 flex-shrink-0" />
                      Row change:{" "}
                      <span className={`font-bold tabular-nums ml-0.5 ${rowDelta >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {rowDelta >= 0 ? "+" : ""}{rowDelta.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {colDelta !== null && (
                    <div className="flex items-center gap-1.5 text-[10px] font-manrope text-slate-500">
                      <span className="w-2 h-2 rounded-sm bg-emerald-500 flex-shrink-0" />
                      Schema change:{" "}
                      <span className={`font-bold tabular-nums ml-0.5 ${colDelta === 0 ? "text-slate-500" : colDelta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {colDelta === 0 ? "None" : `${colDelta > 0 ? "+" : ""}${colDelta} col${Math.abs(colDelta) !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-[260px] sm:h-[300px] lg:h-[340px]">
                  <Line data={chartData} options={options} />
                </div>

                {/* X-axis note */}
                <p className="text-[10px] text-slate-400 font-manrope mt-3 text-center">
                  Hover any point to see exact values · All times shown in IST
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Guide panel ── */}
        {hasData && (
          <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope mb-3.5">
              Reading this chart
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed font-manrope">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-0.5 bg-blue-500 rounded-sm flex-shrink-0" />
                  <p className="font-bold text-slate-800 text-[12px]">Blue line — rows</p>
                </div>
                <p className="text-slate-500">
                  Total rows in your table at each upload. A spike means data was added. A drop may mean records were removed or a pipeline failed.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 rounded-sm flex-shrink-0" />
                  <p className="font-bold text-slate-800 text-[12px]">Green line — columns</p>
                </div>
                <p className="text-slate-500">
                  Total columns detected at each upload. Sudden changes here mean your schema drifted — a column was added, removed, or renamed.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <p className="font-bold text-slate-800 text-[12px]">What to watch for</p>
                </div>
                <ul className="space-y-1 text-slate-500">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold flex-shrink-0 mt-px">↑</span>
                    Rows going up — data is being added normally.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-500 font-bold flex-shrink-0 mt-px">↓</span>
                    Rows dropping — check your pipeline immediately.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold flex-shrink-0 mt-px">—</span>
                    Columns flat — your schema is stable.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};