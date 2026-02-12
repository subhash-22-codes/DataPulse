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
import { ArrowLeft, Loader2, RefreshCw, Database, WifiOff, AlertCircle, Info } from "lucide-react";
import { dataMetricsService } from "../../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TableMetric = {
  metric_date: string;
  row_count: number;
  column_count: number;
};

const parseIst = (ts: string) => {
  const clean = ts.replace(" ", "T");
  const d = new Date(clean);

  if (Number.isNaN(d.getTime())) {
    const fallback = new Date(`${clean}+05:30`);
    return fallback;
  }

  return d;
};

const formatLabel = (ts: string) => {
  const d = parseIst(ts);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const TableTrends = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<TableMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setOffline(false);

    try {
      const res = await dataMetricsService.getTableMetrics(id);

      if (!Array.isArray(res.data)) {
        throw new Error("Backend did not return an array");
      }

      const normalized: TableMetric[] = res.data.map((m: unknown) => {
        const r = m as Record<string, unknown>;

        return {
          metric_date: String(r.metric_date),
          row_count: Number(r.row_count),
          column_count: Number(r.column_count),
        };
      });

      const sorted = normalized.sort(
        (a, b) =>
          parseIst(a.metric_date).getTime() -
          parseIst(b.metric_date).getTime()
      );

      setMetrics(sorted);
    } catch (err) {
      if (!navigator.onLine) {
        setOffline(true);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Backend failed. Check console + Network tab.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const labels = metrics.map((m) => formatLabel(m.metric_date));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Rows",
        data: metrics.map((m) => m.row_count),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        fill: true,
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
      {
        label: "Columns",
        data: metrics.map((m) => m.column_count),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22, 163, 74, 0.05)",
        fill: true,
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          title: (items: { label: string }[]) => items[0].label,
        },
      },
      title: {
        display: true,
        text: "Table Evolution Over Time",
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Count",
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
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
            onClick={fetchMetrics}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <Database className="h-4 w-4 text-slate-600" />
            <h1 className="text-base font-semibold text-slate-900">
              Table Trends
            </h1>
          </div>

          {loading && (
            <div className="p-10 flex justify-center">
              <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
            </div>
          )}

          {offline && (
            <div className="p-10 text-center text-sm text-slate-600 flex flex-col items-center gap-2">
              <WifiOff className="h-6 w-6 text-slate-400" />
              You are offline. Connect and retry.
            </div>
          )}

          {error && (
            <div className="p-10 text-center text-sm text-rose-700 flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-rose-500" />
              {error}
            </div>
          )}

          {!loading && metrics.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No table metrics recorded yet.
            </div>
          )}

          {!loading && metrics.length > 0 && (
            <div className="h-[420px] p-6">
              <Line data={chartData} options={options} />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 text-[11px] text-slate-600 leading-relaxed shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold border-b border-slate-50 pb-2">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            Understanding your data trends
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Line Definitions */}
            <div>
              <p className="font-bold text-slate-800 mb-1">Graph Legend</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-0.5 bg-blue-600 rounded-full" />
                  <span>Blue line: Total rows in your table</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-0.5 bg-emerald-600 rounded-full" />
                  <span>Green line: Total columns in your table</span>
                </div>
              </div>
            </div>
            
            {/* Pattern Recognition */}
            <div>
              <p className="font-bold text-slate-800 mb-1">Interpreting Changes</p>
              <ul className="space-y-1 list-inside">
                <li>• <span className="font-medium">Upward spikes:</span> New data has been added.</li>
                <li>• <span className="font-medium">Downward spikes:</span> Possible data loss or pipeline issue.</li>
                <li>• <span className="font-medium">Flat lines:</span> Your table structure remained stable.</li>
              </ul>
            </div>
            
            {/* Interactions */}
            <div>
              <p className="font-bold text-slate-800 mb-1">Usage Tips</p>
              <p>Hover over any point on the graph to see the exact IST timestamp, row counts, and column count for that specific sync.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
