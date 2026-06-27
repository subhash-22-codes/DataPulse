import React, { useEffect, useState, Fragment, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  AlertTriangle, Loader2, Globe, FileText, TrendingUp,
  LineChart as LineChartIcon, Trash2, ShieldQuestion, Database,
  ArrowUpRight, ArrowDownRight, Server, Clock, LayoutList,
  Download, Search, X, ArrowUpDown, CheckCircle2, Minus,
} from "lucide-react";
import { Workspace, DataUpload, TrendDataPoint, SummaryStats } from "../../types";
import { Tab, Dialog, Transition } from "@headlessui/react";
import toast from "react-hot-toast";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { FormattedDate } from "../../components/FormattedDate";
import type { UploadInsight } from "../../types";
import { useNavigate } from "react-router-dom";

// ─── HELPERS — untouched ──────────────────────────────────────────────────────
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const formatChartData = (summaryStats: SummaryStats | null | undefined) => {
  if (!summaryStats) return [];
  return Object.keys(summaryStats)
    .map((col) => ({ name: col, mean: summaryStats[col]?.mean }))
    .filter((item) => item.mean !== undefined);
};

const safeTime = (dt: string | null | undefined) => {
  if (!dt) return -1;
  const t = new Date(dt).getTime();
  return Number.isFinite(t) ? t : -1;
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DataHistoryCardProps {
  workspace: Workspace;
  isProcessing: boolean;
  isOwner: boolean;
  onUploadsUpdate: (manual: DataUpload[], scheduled: DataUpload[]) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { name: string; value: number; color: string }[];
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 px-3 py-2 rounded-sm border border-slate-700 shadow-lg text-[11px]">
        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1.5">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: payload[0].color }} />
          <p className="font-semibold text-white tabular-nums">
            <span className="text-slate-400 mr-1 font-medium">{payload[0].name}:</span>
            {Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// ─── MASTER LIST ──────────────────────────────────────────────────────────────
const MasterList: React.FC<{
  uploads: DataUpload[];
  type: "manual" | "scheduled";
  selectedUpload: DataUpload | null;
  setSelectedUpload: (u: DataUpload) => void;
  setViewMode: (v: "snapshot" | "trend") => void;
  setUploadToDelete: (u: DataUpload) => void;
  isOwner: boolean;
  onDownloadUpload?: (u: DataUpload) => void;
}> = ({
  uploads, type, selectedUpload, setSelectedUpload,
  setViewMode, setUploadToDelete, isOwner, onDownloadUpload,
}) => {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = uploads;
    if (q) {
      list = list.filter((u) =>
        (u.file_path?.split(/[/\\]/).pop() || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const aTime = safeTime(a.uploaded_at);
      const bTime = safeTime(b.uploaded_at);
      if (aTime === -1 && bTime !== -1) return 1;
      if (aTime !== -1 && bTime === -1) return -1;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [uploads, query, sortOrder]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + sort */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-8 px-2.5 rounded-sm bg-slate-50 border border-slate-200 focus-within:border-blue-300 focus-within:bg-white transition-all">
            <Search className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="flex-1 bg-transparent outline-none text-[11px] text-slate-700 placeholder:text-slate-400 font-manrope"
            />
            {query.trim().length > 0 && (
              <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))}
            className="h-8 w-8 rounded-sm border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-[0.98]"
            title={sortOrder === "newest" ? "Newest first" : "Oldest first"}
          >
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 font-manrope px-0.5">
          <span>{uploads.length} / 50 uploads</span>
          <span>{sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
        {filtered.map((upload) => {
          const isSelected = selectedUpload?.id === upload.id;
          const fileName = upload.file_path?.split(/[/\\]/).pop() || "dataset.csv";

          return (
            <div key={upload.id} className="group relative">
              <button
                onClick={() => { setSelectedUpload(upload); setViewMode("snapshot"); }}
                className={classNames(
                  "w-full text-left px-3 py-2.5 rounded-sm border transition-all duration-150",
                  isSelected
                    ? "bg-white border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                    : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Icon */}
                  <div className={classNames(
                    "mt-0.5 h-7 w-7 rounded-sm border flex items-center justify-center flex-shrink-0",
                    isSelected
                      ? "bg-blue-50 border-blue-100 text-blue-600"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    {upload.upload_type === "manual"    && <FileText className="h-3.5 w-3.5" />}
                    {upload.upload_type === "api_poll"  && <Globe    className="h-3.5 w-3.5" />}
                    {upload.upload_type === "db_query"  && <Server   className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-900 truncate font-manrope leading-tight">
                      {fileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-slate-400 font-manrope tabular-nums">
                        <FormattedDate dateString={upload.uploaded_at} />
                      </p>
                      {upload.schema_changed_from_previous && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                          Schema change
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {onDownloadUpload && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDownloadUpload(upload); }}
                        className="h-6 w-6 rounded-sm flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadToDelete(upload); }}
                        className="h-6 w-6 rounded-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-8 h-8 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center mb-2">
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] font-semibold text-slate-700 font-manrope">
              {query.trim() ? "No results" : `No ${type} uploads`}
            </p>
            <p className="text-[10px] text-slate-400 font-manrope mt-0.5">
              {query.trim() ? "Try a different search." : "Upload something to see history."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const MiniStat: React.FC<{
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  icon: React.ReactNode;
  accent?: string;
  warn?: boolean;
}> = ({ label, value, delta, deltaLabel, icon, accent = "text-slate-900", warn = false }) => (
  <div className={classNames(
    "rounded-sm border p-4 flex flex-col justify-between h-24 transition-colors",
    warn ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
  )}>
    <div className="flex items-center justify-between">
      <p className={classNames("text-[10px] font-bold uppercase tracking-widest", warn ? "text-amber-700" : "text-slate-400")}>
        {label}
      </p>
      <div className={classNames("w-6 h-6 rounded-sm flex items-center justify-center", warn ? "text-amber-600" : "text-slate-400")}>
        {icon}
      </div>
    </div>
    <div>
      {/* Changed font-bold to font-black here for the thickest text */}
      <div className={classNames("text-xl font-bold tabular-nums font-poppins", warn ? "text-amber-700" : accent)}>
        {value}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={classNames(
          "inline-flex items-center gap-1 text-[10px] font-bold mt-1 font-poppins",
          delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-slate-400"
        )}>
          {delta > 0 && <ArrowUpRight className="h-3 w-3" />}
          {delta < 0 && <ArrowDownRight className="h-3 w-3" />}
          {delta === 0 && <Minus className="h-3 w-3" />}
          {delta > 0 ? `+${delta.toLocaleString()}` : delta === 0 ? "No change" : delta.toLocaleString()}
          {deltaLabel && <span className="text-slate-400 font-normal ml-0.5">{deltaLabel}</span>}
        </div>
      )}
    </div>
  </div>
);

// ─── DETAIL VIEW ──────────────────────────────────────────────────────────────
const DetailView: React.FC<{
  workspaceId: string;
  selectedUpload: DataUpload | null;
  previousUpload?: DataUpload | null;
  isOwner: boolean;
  isTeamMember?: boolean;
  handleTrackColumn: (col: string) => void;
}> = ({ workspaceId, selectedUpload, previousUpload, isOwner, isTeamMember, handleTrackColumn }) => {
  const chartData = formatChartData(selectedUpload?.analysis_results?.summary_stats);
  const navigate = useNavigate();

  const rowCount = selectedUpload?.analysis_results?.row_count ?? 0;
  const colCount = selectedUpload?.analysis_results?.column_count ?? 0;
  const prevRowCount = previousUpload?.analysis_results?.row_count ?? null;
  const prevColCount = previousUpload?.analysis_results?.column_count ?? null;
  const canConfigureTrends = isOwner || isTeamMember;
  const insights = selectedUpload?.analysis_results?.insights ?? [];
  const quality = selectedUpload?.analysis_results?.quality_report;
  const duplicateRows = quality?.duplicate_rows ?? 0;
  const missingMap = quality?.missing_percent_by_column ?? null;

  const topMissing = useMemo(() => {
    if (!missingMap) return [];
    return Object.entries(missingMap)
      .filter(([, pct]) => Number(pct) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5);
  }, [missingMap]);

  const selectedSchemaKeys = useMemo(() => {
    const schema = selectedUpload?.schema_info;
    return schema ? Object.keys(schema) : [] as string[];
  }, [selectedUpload?.schema_info]);

  const previousSchemaKeys = useMemo(() => {
    const schema = previousUpload?.schema_info;
    return schema ? Object.keys(schema) : [] as string[];
  }, [previousUpload?.schema_info]);

  const { addedCols, removedCols } = useMemo(() => {
    if (!previousUpload?.schema_info || !selectedUpload?.schema_info) {
      return { addedCols: [] as string[], removedCols: [] as string[] };
    }
    const current = new Set(selectedSchemaKeys);
    const prev = new Set(previousSchemaKeys);
    return {
      addedCols: selectedSchemaKeys.filter((c) => !prev.has(c)),
      removedCols: previousSchemaKeys.filter((c) => !current.has(c)),
    };
  }, [previousUpload?.schema_info, selectedUpload?.schema_info, selectedSchemaKeys, previousSchemaKeys]);

  const addedColsSet   = useMemo(() => new Set(addedCols),   [addedCols]);
  const removedColsSet = useMemo(() => new Set(removedCols), [removedCols]);

  const rowDelta = prevRowCount === null ? null : rowCount - prevRowCount;
  const colDelta = prevColCount === null ? null : colCount - prevColCount;

  const percentDelta = (newVal: number, oldVal: number) => {
    if (!oldVal) return null;
    const pct = ((newVal - oldVal) / oldVal) * 100;
    return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };

  if (!selectedUpload) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <div className="w-10 h-10 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center mb-3">
          <Database className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-800 font-poppins">Select a dataset</p>
        <p className="text-xs text-slate-400 font-manrope mt-1">Choose from the sidebar to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          label="Total rows"
          value={
          <AnimatedNumber 
            value={rowCount} 
            className="font-bold"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}
          />
          }
          delta={rowDelta}
          icon={<LayoutList className="h-3.5 w-3.5" />}
          accent="text-blue-600"
        />
        <MiniStat
          label="Columns"
          value={
          <AnimatedNumber 
            value={colCount}
            className="font-bold"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}
          />
          }
          delta={colDelta}
          deltaLabel="cols"
          icon={<Database className="h-3.5 w-3.5" />}
        />
        <MiniStat
          label="Column change"
          value={selectedUpload.schema_changed_from_previous ? "Detected" : "None"}
          icon={selectedUpload.schema_changed_from_previous
            ? <AlertTriangle className="h-3.5 w-3.5" />
            : <ShieldQuestion className="h-3.5 w-3.5" />
          }
          warn={!!selectedUpload.schema_changed_from_previous}
        />
      </div>

      {/* ── Change summary ── */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope">
            Change summary
          </p>
          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-sm truncate max-w-[200px]">
            {selectedUpload.file_path.split(/[/\\]/).pop()}
          </span>
        </div>

        <div className="p-4">
          {!previousUpload ? (
            <p className="text-[11px] text-slate-400 font-manrope leading-relaxed">
              This is the first dataset in this source. Upload another file to see change comparisons.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* Rows */}
              <div className="rounded-sm border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Rows</p>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <p className={classNames(
                    "text-sm font-bold tabular-nums font-poppins",
                    (rowDelta ?? 0) > 0 ? "text-emerald-700" : (rowDelta ?? 0) < 0 ? "text-red-700" : "text-slate-700"
                  )}>
                    {rowDelta !== null ? (rowDelta > 0 ? `+${rowDelta.toLocaleString()}` : rowDelta.toLocaleString()) : "—"}
                  </p>
                  {prevRowCount !== null && (
                    <p className="text-[10px] font-bold text-slate-400 tabular-nums font-manrope">
                      {percentDelta(rowCount, prevRowCount)}
                    </p>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 font-manrope mt-1 tabular-nums">
                  {prevRowCount ?? "—"} → {rowCount}
                </p>
              </div>

              {/* Columns */}
              <div className="rounded-sm border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Columns</p>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <p className="text-sm font-bold tabular-nums text-slate-700 font-poppins">
                    {colDelta !== null ? (colDelta > 0 ? `+${colDelta}` : String(colDelta)) : "—"}
                  </p>
                  {prevColCount !== null && (
                    <p className="text-[10px] font-bold text-slate-400 tabular-nums font-manrope">
                      {percentDelta(colCount, prevColCount)}
                    </p>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 font-manrope mt-1 tabular-nums">
                  {prevColCount ?? "—"} → {colCount}
                </p>
              </div>

              {/* Schema */}
              <div className="rounded-sm border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Schema</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-manrope">
                  <span className="font-bold text-emerald-700 tabular-nums">{addedCols.length}</span>
                  <span className="text-slate-400">added</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-red-700 tabular-nums">{removedCols.length}</span>
                  <span className="text-slate-400">removed</span>
                </div>
                <p className="text-[9px] text-slate-400 font-manrope mt-1">vs previous upload</p>
              </div>
            </div>
          )}
        </div>

        {/* Added / removed column pills */}
        {(addedCols.length > 0 || removedCols.length > 0) && (
          <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-manrope mb-1.5">Added</p>
              <div className="flex flex-wrap gap-1">
                {addedCols.slice(0, 10).map((c) => (
                  <span key={c} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-sm font-mono">
                    {c}
                  </span>
                ))}
                {addedCols.length > 10 && <span className="text-[9px] font-bold text-slate-400 font-manrope">+{addedCols.length - 10}</span>}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-manrope mb-1.5">Removed</p>
              <div className="flex flex-wrap gap-1">
                {removedCols.slice(0, 10).map((c) => (
                  <span key={c} className="text-[9px] font-bold bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded-sm font-mono">
                    {c}
                  </span>
                ))}
                {removedCols.length > 10 && <span className="text-[9px] font-bold text-slate-400 font-manrope">+{removedCols.length - 10}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2-col layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* LEFT */}
        <div className="lg:col-span-5 space-y-4">

          {/* Quick notes */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Quick notes</p>
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm font-manrope">
                {insights.length}
              </span>
            </div>
            <div className="p-2 space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
              {insights.length > 0 ? (
                insights.map((item: UploadInsight, idx: number) => {
                  const sev = item?.severity || "low";
                  const styles = sev === "high" ? "bg-red-50 border-red-100" : sev === "medium" ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100";
                  const dot   = sev === "high" ? "bg-red-500" : sev === "medium" ? "bg-amber-500" : "bg-slate-400";
                  return (
                    <div key={idx} className={`rounded-sm border p-2.5 text-[11px] leading-relaxed ${styles}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                        <p className="text-slate-700 font-medium font-manrope">{item?.message}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-[11px] text-slate-400 font-manrope">No issues flagged</p>
                </div>
              )}
            </div>
          </div>

          {/* Data check */}
          {quality && (
            <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Data check</p>
                <div className="relative group">
                  <div className="w-4 h-4 flex items-center justify-center rounded-full border border-slate-200 text-[9px] font-bold text-slate-400 cursor-default">i</div>
                  <div className="absolute left-0 top-5 w-52 bg-white border border-slate-200 shadow-lg rounded-sm p-3 text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none transition z-20 font-manrope">
                    <div className="space-y-1">
                      {[
                        { color: "bg-emerald-500", label: "No issues" },
                        { color: "bg-amber-500",   label: "Low / moderate" },
                        { color: "bg-red-500",      label: "High impact" },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3 max-h-52 overflow-y-auto custom-scrollbar">
                {duplicateRows === 0 && topMissing.length === 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-sm bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <p className="text-[11px] font-semibold text-emerald-700 font-manrope">No data issues detected</p>
                  </div>
                )}

                {duplicateRows > 0 && (() => {
                  const impact = duplicateRows <= 5 ? "Minor" : duplicateRows <= 20 ? "Moderate" : "High";
                  const color  = duplicateRows <= 5 ? "text-amber-600" : duplicateRows <= 20 ? "text-orange-600" : "text-red-600";
                  return (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700 font-manrope">Duplicate rows</p>
                        <p className="text-[10px] text-slate-400 font-manrope">{duplicateRows} detected</p>
                        <p className={`text-[10px] font-semibold font-manrope ${color}`}>{impact} impact</p>
                      </div>
                      <button
                        onClick={() => navigate(`/workspace/${workspaceId}/upload/${selectedUpload?.id}/issues?type=duplicates`)}
                        className="text-[10px] font-bold text-slate-600 hover:text-blue-600 font-manrope transition-colors"
                      >
                        View rows →
                      </button>
                    </div>
                  );
                })()}

                {topMissing.map(([col, pct]) => {
                  const percent = Number(pct);
                  const impact  = percent < 10 ? "Low" : percent <= 20 ? "Moderate" : "High";
                  const color   = percent < 10 ? "text-amber-600" : percent <= 20 ? "text-orange-600" : "text-red-600";
                  return (
                    <div key={col} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-700 font-mono truncate">{col}</p>
                        <p className="text-[10px] text-slate-400 font-manrope">{percent.toFixed(1)}% missing</p>
                        <p className={`text-[10px] font-semibold font-manrope ${color}`}>{impact} impact</p>
                      </div>
                      <button
                        onClick={() => navigate(`/workspace/${workspaceId}/upload/${selectedUpload?.id}/issues?type=missing&column=${encodeURIComponent(col)}`)}
                        className="text-[10px] font-bold text-slate-600 hover:text-blue-600 font-manrope transition-colors flex-shrink-0 ml-3"
                      >
                        View →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-7 space-y-4">

          {/* Columns table */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Columns</p>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-sm truncate max-w-[180px]">
                {selectedUpload.file_path.split(/[/\\]/).pop()}
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 custom-scrollbar">
              <table className="min-w-full text-[11px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {["Column", "Type", "Health", canConfigureTrends ? "Action" : null]
                      .filter(Boolean)
                      .map((h) => (
                        <th
                          key={h}
                          className={classNames(
                            "px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-manrope",
                            h === "Action" || h === "Health" ? "text-right" : "text-left"
                          )}
                        >
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedUpload.schema_info &&
                    Object.entries(selectedUpload.schema_info).map(([col, type]) => {
                      const dtype     = String(type);
                      const isNumeric = dtype.includes("int") || dtype.includes("float");
                      const missingPct = quality?.missing_percent_by_column?.[col] ?? 0;
                      const isMissingHigh = Number(missingPct) >= 20;
                      const isNew     = addedColsSet.has(col);
                      const isRemoved = removedColsSet.has(col);

                      return (
                        <tr key={col} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold text-slate-700 font-mono">{col}</span>
                              {isNew     && <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full">New</span>}
                              {isRemoved && <span className="text-[8px] font-bold bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded-full">Removed</span>}
                              {isNumeric && <span className="text-[8px] font-bold bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full">Numeric</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[9px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                              {dtype}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {Number(missingPct) > 0 ? (
                              <span className={classNames(
                                "text-[9px] font-bold border px-1.5 py-0.5 rounded-sm",
                                isMissingHigh ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {Number(missingPct).toFixed(1)}% missing
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                                OK
                              </span>
                            )}
                          </td>
                          {canConfigureTrends && (
                            <td className="px-4 py-2.5 text-right">
                              {isNumeric && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleTrackColumn(col)}
                                    className="h-6 w-6 rounded-sm border border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all"
                                    title="Track trend"
                                  >
                                    <LineChartIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => navigate(`/workspace/${workspaceId}/columns?column_name=${encodeURIComponent(col)}`)}
                                    className="h-6 w-6 rounded-sm border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center transition-all text-[11px] font-bold"
                                    title="View history"
                                  >
                                    →
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Average values chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-manrope">Average values</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-bold text-slate-400 font-manrope">Mean</span>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="mean" fill="#3b82f6" radius={[4, 4, 2, 2]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── TREND VIEW ───────────────────────────────────────────────────────────────
const TrendView: React.FC<{
  trackedColumn: string | null;
  trendData: TrendDataPoint[];
  isTrendLoading: boolean;
}> = ({ trackedColumn, trendData, isTrendLoading }) => {
  if (isTrendLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
        <p className="text-xs text-slate-400 font-manrope">Loading trend data…</p>
      </div>
    );
  }

  const numericPoints = trendData.filter((d) => typeof d.value === "number");

  if (!trendData || trendData.length < 2 || numericPoints.length < 2) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-white rounded-sm border border-slate-200">
        <div className="w-10 h-10 rounded-sm border border-slate-200 bg-slate-50 flex items-center justify-center mb-3">
          <TrendingUp className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-800 font-poppins">Not enough data</p>
        <p className="text-xs text-slate-400 font-manrope mt-1 max-w-xs">
          {numericPoints.length < 2
            ? "This column has too many empty values. Upload more datasets."
            : "Upload at least 2 datasets to see trend patterns."}
        </p>
      </div>
    );
  }

  const firstValue    = numericPoints[0].value as number;
  const lastValue     = numericPoints[numericPoints.length - 1].value as number;
  const overallChange = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : null;
  const averageValue  = numericPoints.reduce((a, c) => a + (c.value as number), 0) / numericPoints.length;
  const isPositive    = (overallChange ?? 0) >= 0;

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900 font-poppins">Trend analysis</p>
        <span className="text-[9px] font-bold text-slate-400 font-manrope uppercase tracking-wider">Tracking:</span>
        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">
          {trackedColumn}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Initial value"  value={firstValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}  icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <MiniStat label="Current value"  value={lastValue.toLocaleString(undefined,  { maximumFractionDigits: 2 })}  icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <MiniStat
          label="Net change"
          value={overallChange === null ? "N/A" : `${overallChange > 0 ? "+" : ""}${overallChange.toFixed(2)}%`}
          icon={isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          warn={!isPositive}
          accent={isPositive ? "text-emerald-700" : "text-red-700"}
        />
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4">
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const d = new Date(value);
                  if (Number.isNaN(d.getTime())) return "";
                  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
                }}
                tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 600 }}
                axisLine={false} tickLine={false} dy={8} minTickGap={40}
              />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={averageValue}
                stroke="#cbd5e1"
                strokeDasharray="5 5"
                label={{ value: "AVG", position: "insideRight", fill: "#94a3b8", fontSize: 8, fontWeight: 700 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={trackedColumn || ""}
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "white", strokeWidth: 2, stroke: "#2563eb" }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#2563eb" }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export const DataHistoryCard: React.FC<DataHistoryCardProps> = ({
  workspace, isProcessing, isOwner, onUploadsUpdate,
}) => {
  const { user } = useAuth();
  const isTeamMember = workspace.team_members?.some((m) => m.id === user?.id);

  // ── All original state — untouched ────────────────────────────────────────
  const [manualUploads,    setManualUploads]    = useState<DataUpload[]>([]);
  const [scheduledFetches, setScheduledFetches] = useState<DataUpload[]>([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [selectedUpload,   setSelectedUpload]   = useState<DataUpload | null>(null);
  const [viewMode,         setViewMode]         = useState<"snapshot" | "trend">("snapshot");
  const [trackedColumn,    setTrackedColumn]    = useState<string | null>(workspace.tracked_column || null);
  const [trendData,        setTrendData]        = useState<TrendDataPoint[]>([]);
  const [isTrendLoading,   setIsTrendLoading]   = useState(false);
  const [uploadToDelete,   setUploadToDelete]   = useState<DataUpload | null>(null);

  const fetchedForWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    setTrackedColumn(workspace.tracked_column || null);
    setViewMode("snapshot");
  }, [workspace.id, workspace.tracked_column]);

  // ── Original fetchAllUploads — untouched ─────────────────────────────────
  const fetchAllUploads = useCallback(async () => {
    if (fetchedForWorkspaceRef.current === workspace.id) return;
    fetchedForWorkspaceRef.current = workspace.id;
    setIsLoading(true);
    try {
      const res = await api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?limit=100`);
      const allData = res.data || [];
      const sorted = [...allData].sort((a, b) => {
        const at = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
        const bt = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
        return bt - at;
      });
      const manuals   = sorted.filter((u) => u.upload_type === "manual");
      const scheduled = sorted.filter((u) => u.upload_type === "api_poll" || u.upload_type === "db_query");
      setManualUploads(manuals);
      setScheduledFetches(scheduled);
      onUploadsUpdate(manuals, scheduled);
      setSelectedUpload(sorted[0] || null);
    } catch (error) {
      console.error("Failed to fetch uploads", error);
      toast.error("Could not sync data history");
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, onUploadsUpdate]);

  useEffect(() => { fetchAllUploads(); }, [fetchAllUploads]);

  // ── Original trend fetch — untouched ─────────────────────────────────────
  useEffect(() => {
    if (!trackedColumn || !selectedUpload) return;
    const fetchTrendData = async () => {
      setIsTrendLoading(true);
      try {
        const params = new URLSearchParams({
          column_name: trackedColumn,
          upload_type: selectedUpload.upload_type,
        });
        const res = await api.get<{ data: TrendDataPoint[] }>(
          `/workspaces/${workspace.id}/trend?${params.toString()}`
        );
        const points = res.data.data || [];
        setTrendData(points.map((d: TrendDataPoint) => ({ ...d, date: new Date(d.date).toLocaleString() })));
      } catch (error) {
        console.error("Failed to fetch trend data", error);
      } finally {
        setIsTrendLoading(false);
      }
    };
    fetchTrendData();
  }, [trackedColumn, workspace.id, selectedUpload]);

  const allUploads = [...manualUploads, ...scheduledFetches];

  const previousUpload = selectedUpload
    ? allUploads
        .filter(u => u.upload_type === selectedUpload.upload_type)
        .filter(u => new Date(u.uploaded_at).getTime() < new Date(selectedUpload.uploaded_at).getTime())
        .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0] || null
    : null;

  // ── Original handleTrackColumn — untouched ────────────────────────────────
  const handleTrackColumn = async (columnName: string) => {
    setTrackedColumn(columnName);
    setViewMode("trend");
    if (isOwner) {
      try {
        await api.put(`/workspaces/${workspace.id}`, { tracked_column: columnName });
      } catch (error) {
        console.error(error);
      }
    } else {
      toast.success(`Viewing trend: ${columnName}`, {
        style: { background: "#ffffff", border: "1px solid #e2e8f0", padding: "12px", color: "#334155", fontSize: "13px", borderRadius: "8px" },
        iconTheme: { primary: "#3b82f6", secondary: "#fff" },
      });
    }
  };

  // ── Original handleDeleteUpload — untouched ───────────────────────────────
  const handleDeleteUpload = async () => {
    if (!uploadToDelete) return;
    const newManuals   = manualUploads.filter((u) => u.id !== uploadToDelete.id);
    const newScheduled = scheduledFetches.filter((u) => u.id !== uploadToDelete.id);
    setManualUploads(newManuals);
    setScheduledFetches(newScheduled);
    onUploadsUpdate(newManuals, newScheduled);
    if (selectedUpload?.id === uploadToDelete.id) {
      setSelectedUpload(newManuals[0] || newScheduled[0] || null);
    }
    const closingUpload = uploadToDelete;
    setUploadToDelete(null);
    try {
      await api.delete(`/uploads/${closingUpload.id}`);
      toast.success("Data source removed", {
        style: { background: "#1e293b", color: "#fff", fontSize: "13px" },
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete upload");
      fetchedForWorkspaceRef.current = null;
      fetchAllUploads();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm lg:col-span-3 relative overflow-hidden h-full flex flex-col shadow-[0_1px_3px_rgba(15,23,42,0.06)]">

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col justify-center items-center z-50">
          <Loader2 className="animate-spin h-6 w-6 text-blue-600 mb-2.5" />
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest font-manrope">
            Processing data…
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-sm flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-poppins leading-tight">Data summary</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-manrope mt-0.5">
              History & insights
            </p>
          </div>
        </div>

        {/* Snapshot / Trend toggle */}
        {trackedColumn && (
          <div className="flex bg-slate-100 p-0.5 rounded-sm border border-slate-200">
            {(["snapshot", "trend"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={classNames(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all duration-150 font-manrope",
                  viewMode === mode
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-[550px] bg-slate-50/30 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
            <Loader2 className="animate-spin h-5 w-5 text-slate-300" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-manrope">
              Loading history…
            </p>
          </div>
        ) : !manualUploads.length && !scheduledFetches.length ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
            <div className="w-10 h-10 border border-slate-200 bg-white rounded-sm flex items-center justify-center mb-3">
              <Database className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-800 font-poppins">No data yet</p>
            <p className="text-xs text-slate-400 font-manrope mt-1 max-w-xs">
              Connect a data source or upload a CSV to begin tracking.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-full">

            {/* ── Sidebar ── */}
            <div className="lg:w-64 xl:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col flex-shrink-0">
              <div className="p-2.5 border-b border-slate-100">
                <Tab.Group
                  onChange={(index: number) => {
                    const list = index === 0 ? manualUploads : scheduledFetches;
                    setSelectedUpload(list[0] || null);
                    setViewMode("snapshot");
                  }}
                >
                  <Tab.List className="flex p-0.5 bg-slate-100 rounded-sm border border-slate-200">
                    {[
                      { label: "Manual",  icon: <FileText className="h-3 w-3" /> },
                      { label: "Auto",    icon: <Clock    className="h-3 w-3" /> },
                    ].map(({ label, icon }) => (
                      <Tab
                        key={label}
                        className={({ selected }: { selected: boolean }) => classNames(
                          "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold tracking-wider rounded-sm transition-all outline-none font-manrope",
                          selected
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {icon}{label}
                      </Tab>
                    ))}
                  </Tab.List>

                  <Tab.Panels className="mt-2">
                    <Tab.Panel className="focus:outline-none" style={{ height: "520px" }}>
                      <MasterList
                        uploads={manualUploads}
                        type="manual"
                        selectedUpload={selectedUpload}
                        setSelectedUpload={setSelectedUpload}
                        setViewMode={setViewMode}
                        setUploadToDelete={setUploadToDelete}
                        isOwner={isOwner}
                      />
                    </Tab.Panel>
                    <Tab.Panel className="focus:outline-none" style={{ height: "520px" }}>
                      <MasterList
                        uploads={scheduledFetches}
                        type="scheduled"
                        selectedUpload={selectedUpload}
                        setSelectedUpload={setSelectedUpload}
                        setViewMode={setViewMode}
                        setUploadToDelete={setUploadToDelete}
                        isOwner={isOwner}
                      />
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </div>
            </div>

            {/* ── Main view ── */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {viewMode === "snapshot" ? (
                <DetailView
                  workspaceId={workspace.id}
                  selectedUpload={selectedUpload}
                  previousUpload={previousUpload}
                  isOwner={isOwner}
                  isTeamMember={isTeamMember}
                  handleTrackColumn={handleTrackColumn}
                />
              ) : (
                <TrendView
                  trackedColumn={trackedColumn}
                  trendData={trendData}
                  isTrendLoading={isTrendLoading}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete modal ── */}
      <Transition appear show={!!uploadToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setUploadToDelete(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px]" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-1" enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm bg-white rounded-sm border border-slate-200 shadow-2xl shadow-slate-900/10 p-6">
                <div className="flex flex-col items-center text-center">
                  <Dialog.Title as="h3" className="text-sm font-bold text-slate-900 font-poppins mb-1">
                    Delete dataset?
                  </Dialog.Title>
                  <p className="text-xs text-slate-500 font-manrope leading-relaxed max-w-[260px]">
                    You're about to remove{" "}
                    <span className="font-semibold text-slate-700 font-mono">
                      {uploadToDelete?.file_path.split(/[/\\]/).pop()}
                    </span>
                    . This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setUploadToDelete(null)}
                    className="flex-1 h-9 rounded-sm border border-slate-200 text-[11px] font-bold text-slate-500 font-manrope tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUpload}
                    className="flex-1 h-9 rounded-sm bg-red-600 hover:bg-red-700 text-[11px] font-bold text-white font-manrope tracking-widest transition-all active:scale-[0.98]"
                  >
                    Delete
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};