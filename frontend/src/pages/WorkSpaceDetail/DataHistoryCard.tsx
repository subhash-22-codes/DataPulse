import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, Loader2, Globe, FileText, TrendingUp, LineChart as LineChartIcon, Trash2, ShieldQuestion, Database, ArrowUpRight, ArrowDownRight, Server, Clock, LayoutList } from "lucide-react";
import { Workspace, DataUpload, TrendDataPoint, SummaryStats } from "../../types";
import { Tab, Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { FormattedDate } from "../../components/FormattedDate";
import type { UploadInsight } from "../../types";

// --- HELPER FUNCTIONS ---
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const formatChartData = (summaryStats: SummaryStats | null | undefined) => {
  if (!summaryStats) return [];
  return Object.keys(summaryStats).map(col => ({
    name: col,
    mean: summaryStats[col]?.mean,
  })).filter(item => item.mean !== undefined);
};

// UI UPDATE: Production-grade tooltip with tabular alignment
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-[11px]">
        <p className="font-bold text-slate-400 uppercase tracking-wider mb-2 text-[9px]">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          ></span>
          <p className="font-semibold text-slate-700 tabular-nums">
            <span className="text-slate-400 mr-1 font-medium">{payload[0].name}:</span>
            {payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// --- TYPE DEFINITIONS ---
interface DataHistoryCardProps {
  workspace: Workspace;
  isProcessing: boolean;
  isOwner: boolean;
  onUploadsUpdate: (manual: DataUpload[], scheduled: DataUpload[]) => void;
}
interface CustomTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: {
    name: string;
    value: number;
    color: string;
  }[];
}

// ====================================================================
//  Sub-Components
// ====================================================================

const MasterList: React.FC<{
  uploads: DataUpload[];
  type: 'manual' | 'scheduled';
  selectedUpload: DataUpload | null;
  setSelectedUpload: (u: DataUpload) => void;
  setViewMode: (v: 'snapshot' | 'trend') => void;
  setUploadToDelete: (u: DataUpload) => void;
  isOwner: boolean;
}> = ({ uploads, type, selectedUpload, setSelectedUpload, setViewMode, setUploadToDelete, isOwner }) => (
    <div className="flex flex-col h-full overflow-y-auto pr-1 custom-scrollbar space-y-1 py-1">
      {uploads.map(upload => {
        const isSelected = selectedUpload?.id === upload.id;
        return (
            <div key={upload.id} className="group relative px-2">
            <button
                onClick={() => { setSelectedUpload(upload); setViewMode('snapshot'); }}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                    isSelected
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-600'
                }`}
            >
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500'}`}>
                            {upload.upload_type === 'manual' && <FileText className="h-4 w-4" />}
                            {upload.upload_type === 'api_poll' && <Globe className="h-4 w-4" />}
                            {upload.upload_type === 'db_query' && <Server className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`font-semibold text-[11px] truncate block ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                {upload.file_path.split(/[/\\]/).pop()}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-medium text-slate-400 tabular-nums">
                                    <FormattedDate dateString={upload.uploaded_at} />
                                </p>
                                {upload.schema_changed_from_previous && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                        Updated
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </button>

            {isOwner && (
                <button
                    onClick={(e) => { e.stopPropagation(); setUploadToDelete(upload); }}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${
                        isSelected
                        ? 'opacity-0 hover:opacity-100 text-slate-400 hover:bg-red-50 hover:text-red-600'
                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-slate-100'
                    }`}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
            </div>
      )})}
      {uploads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 mx-2 mt-2">
            <LayoutList className="h-5 w-5 text-slate-300 mb-2" />
            <p className="text-[10px] font-medium text-slate-500">{`No ${type} uploads`}</p>
        </div>
      )}
    </div>
);

const DetailView: React.FC<{
  selectedUpload: DataUpload | null;
  isOwner: boolean;
  isTeamMember?: boolean;
  handleTrackColumn: (col: string) => void;
}> = ({ selectedUpload, isOwner, isTeamMember, handleTrackColumn }) => {
    const chartData = formatChartData(selectedUpload?.analysis_results?.summary_stats);
    const rowCount = selectedUpload?.analysis_results?.row_count ?? 0;
    const colCount = selectedUpload?.analysis_results?.column_count ?? 0;
    const canConfigureTrends = isOwner || isTeamMember;
    const insights = selectedUpload?.analysis_results?.insights ?? [];
    const quality = selectedUpload?.analysis_results?.quality_report;
    const duplicateRows = quality?.duplicate_rows ?? 0;
   

    const topMissing = quality?.missing_percent_by_column
    ? Object.entries(quality.missing_percent_by_column)
        .filter(([, pct]) => Number(pct) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 5)
    : [];
    const hasMissing = topMissing.length > 0;
     const isClean = duplicateRows === 0 && !hasMissing;

    if (!selectedUpload) return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                <Database className="h-7 w-7 text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Select a dataset</h3>
            <p className="text-slate-500 text-xs mt-1">Choose from the sidebar to view details</p>
        </div>
    );

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-8">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-28">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Rows</p>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><LayoutList className="h-4 w-4" /></div>
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums"><AnimatedNumber value={rowCount} /></div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-28">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Columns</p>
                <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><Database className="h-4 w-4" /></div>
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums"><AnimatedNumber value={colCount} /></div>
          </div>

          <div className={`rounded-lg p-5 border shadow-sm flex flex-col justify-between h-28 transition-colors ${selectedUpload.schema_changed_from_previous ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                 <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedUpload.schema_changed_from_previous ? 'text-amber-700' : 'text-slate-500'}`}>Column Change</p>
                 {selectedUpload.schema_changed_from_previous ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <div className="p-1.5 bg-slate-100 text-slate-400 rounded-lg"><ShieldQuestion className="h-4 w-4" /></div>}
              </div>
              <div className={`text-2xl font-bold tabular-nums ${selectedUpload.schema_changed_from_previous ? 'text-amber-700' : 'text-slate-900'}`}>
                    {selectedUpload.schema_changed_from_previous ? 'Detected' : 'None'}
              </div>
          </div>
        </div>

        {/* 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Quick Notes + Data Check */}
          <div className="lg:col-span-5 space-y-6">

            {/* Quick Notes */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Notes</h3>
                <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded-md">{insights.length}</span>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {insights.length > 0 ? insights.map((item: UploadInsight, idx: number) => {
                  const severity = item?.severity || "low";
                  const badge = severity === "high" ? "bg-red-50 text-red-600 border-red-100" : severity === "medium" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200";
                  return (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-slate-700 font-medium">{item?.message}</p>
                        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${badge}`}>{severity}</span>
                      </div>
                    </div>
                  );
                }) : <div className="py-8 text-center text-slate-400 text-xs font-medium">No notes</div>}
              </div>
            </div>

            {/* Data Check */}
            {quality && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Check</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Duplicates:</span>
                    <span className="text-[11px] font-bold text-slate-900 tabular-nums">{duplicateRows}</span>
                  </div>
                </div>
                <div className="p-5">
                  {topMissing.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Missing Values</p>
                      <div className="space-y-4">
                        {topMissing.map(([col, pct]) => (
                          <div key={col} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold text-slate-700 truncate">{col}</p>
                              <span className="text-[10px] font-bold text-slate-900 tabular-nums">{Number(pct).toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${Number(pct) > 20 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(Number(pct), 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg text-[11px] font-semibold ${
                        isClean
                          ? "text-emerald-700 bg-emerald-50"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      <p className="text-xs">
                        {isClean ? "Data looks clean" : "Issues found"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Chart + Columns Table */}
          <div className="lg:col-span-7 space-y-6">

            {/* Average Values */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Average Values</h3>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-[9px] font-bold text-slate-400 uppercase">Mean</span></div>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="mean" fill="#3b82f6" radius={[6, 6, 2, 2]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Columns */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Columns</h3>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[180px]">{selectedUpload.file_path.split(/[/\\]/).pop()}</span>
              </div>
              <div className="overflow-x-auto max-h-80 custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">Column Name</th>
                      <th scope="col" className="px-5 py-3 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">Data Type</th>
                      {canConfigureTrends && <th scope="col" className="px-5 py-3 text-right text-[9px] font-bold text-slate-500 uppercase tracking-wider">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {selectedUpload.schema_info && Object.entries(selectedUpload.schema_info).map(([col, type]) => (
                      <tr key={col} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-[11px] font-semibold text-slate-700">{col}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            {String(type)}
                          </span>
                        </td>
                        {canConfigureTrends && (
                          <td className="px-5 py-3 text-right">
                            {(String(type).includes('int') || String(type).includes('float')) && (
                              <button
                                onClick={() => handleTrackColumn(col)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all active:scale-95"
                                aria-label="Track trend for column"
                              >
                                <LineChartIcon className="h-3 w-3" />
                                <span className="hidden sm:inline">Track</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

const TrendView: React.FC<{ trackedColumn: string | null; trendData: TrendDataPoint[]; isTrendLoading: boolean; }> = ({ trackedColumn, trendData, isTrendLoading }) => {
  if (isTrendLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-blue-500/50" /></div>;

  if (!trendData || trendData.length < 2) return (
    <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg border border-slate-200 border-dashed">
        <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
             <TrendingUp className="h-7 w-7 text-slate-300" />
        </div>
        <h3 className="text-slate-900 font-semibold text-sm">Insufficient history</h3>
        <p className="text-slate-500 text-xs mt-2 max-w-xs">Upload at least 2 datasets to see trend patterns</p>
    </div>
  );

  const firstValue = trendData.find(d => d.value !== null)?.value;
  const lastValue = [...trendData].reverse().find(d => d.value !== null)?.value;
  let overallChange = 0;
  if (typeof firstValue === 'number' && typeof lastValue === 'number' && firstValue !== 0) {
    overallChange = ((lastValue - firstValue) / firstValue) * 100;
  }
  const averageValue = trendData.reduce((acc, curr) => acc + (curr.value || 0), 0) / trendData.filter(d => d.value !== null).length;
  const isPositive = overallChange >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-400 pb-8">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Trend Analysis</h3>
        <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tracking:</span>
            <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{trackedColumn}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-28">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Initial Value</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{firstValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-28">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Value</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{lastValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
        </div>
        <div className={`p-5 rounded-lg border shadow-sm flex flex-col justify-between h-28 ${isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>Net Change</p>
            {isPositive ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
          </div>
          <p className={`text-2xl font-bold tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {overallChange > 0 ? '+' : ''}{overallChange.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="w-full h-96 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} minTickGap={30} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={averageValue} stroke="#cbd5e1" strokeDasharray="5 5" label={{ value: 'AVERAGE', position: 'insideRight', fill: '#94a3b8', fontSize: 8, fontWeight: 900 }} />
            <Line type="monotone" dataKey="value" name={trackedColumn || ''} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: 'white', strokeWidth: 2, stroke: '#3b82f6' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ====================================================================
//  Main Data History Card Component
// ====================================================================
export const DataHistoryCard: React.FC<DataHistoryCardProps> = ({ workspace, isProcessing, isOwner, onUploadsUpdate }) => {
  // 1. Logic preserved
  const { user } = useAuth();

  // 3. CALCULATE PERMISSION INTERNALLY
  const isTeamMember = workspace.team_members?.some(m => m.id === user?.id);
  const [manualUploads, setManualUploads] = useState<DataUpload[]>([]);
  const [scheduledFetches, setScheduledFetches] = useState<DataUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState<DataUpload | null>(null);
  const [viewMode, setViewMode] = useState<'snapshot' | 'trend'>('snapshot');
  const [trackedColumn, setTrackedColumn] = useState<string | null>(workspace.tracked_column || null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<DataUpload | null>(null);

  const fetchAllUploads = useCallback(async () => {
    if (manualUploads.length > 0 || scheduledFetches.length > 0) return;
    setIsLoading(true);
    try {
      const res = await api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?limit=100`);

      const allData = res.data;
      const manuals = allData.filter(u => u.upload_type === 'manual');
      const scheduled = allData.filter(u => u.upload_type === 'api_poll' || u.upload_type === 'db_query');

      setManualUploads(manuals);
      setScheduledFetches(scheduled);
      onUploadsUpdate(manuals, scheduled);
      setSelectedUpload(allData[0] || null);

    } catch (error) {
      console.error("Failed to fetch uploads", error);
      toast.error("Could not sync data history");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id,manualUploads.length, scheduledFetches.length]);

  useEffect(() => {
    if (manualUploads.length === 0 && scheduledFetches.length === 0) {
        fetchAllUploads();
    }
}, [fetchAllUploads, manualUploads.length, scheduledFetches.length]);

  useEffect(() => {
    if (!trackedColumn || !selectedUpload) return;
    const fetchTrendData = async () => {
      setIsTrendLoading(true);
      const uploadType = selectedUpload.upload_type;
      try {
        const res = await api.get<{ data: TrendDataPoint[] }>(`/workspaces/${workspace.id}/trend?column_name=${trackedColumn}&upload_type=${uploadType}`);
        setTrendData(res.data.data.map((d: TrendDataPoint) => ({ ...d, date: new Date(d.date).toLocaleString() })));
      } catch (error) { console.error("Failed to fetch trend data", error); }
      finally { setIsTrendLoading(false); }
    };
    fetchTrendData();
  }, [trackedColumn, workspace.id, selectedUpload]);

  const handleTrackColumn = async (columnName: string) => {
    // 1. Always update local state so they can SEE the graph
    setTrackedColumn(columnName);
    setViewMode('trend');

    // 2. Only attempt to SAVE to DB if they are Owner
    if (isOwner) {
        try {
            await api.put(`/workspaces/${workspace.id}`, { tracked_column: columnName });
        } catch (error){
            console.error(error);
        }
    } else {
        toast.success(`Viewing trend: ${columnName}`, {
  style: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    padding: '12px',
    color: '#334155',
    fontSize: '13px',
    borderRadius: '8px',
  },
  iconTheme: {
    primary: '#3b82f6',
    secondary: '#fff'
  },
});
    }
  };

  const handleDeleteUpload = async () => {
    if (!uploadToDelete) return;

    const newManuals = manualUploads.filter(u => u.id !== uploadToDelete.id);
    const newScheduled = scheduledFetches.filter(u => u.id !== uploadToDelete.id);

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
         style: { background: '#1e293b', color: '#fff', fontSize: '13px' }
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete upload");
      fetchAllUploads();
    }
  };


  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm lg:col-span-3 relative overflow-hidden h-full flex flex-col font-sans">

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl">
            <Loader2 className="animate-spin h-7 w-7 text-blue-600 mb-3" />
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Processing Data...</p>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex items-center justify-center shadow-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Data Summary</h2>
            <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">History and insights</p>
          </div>
        </div>

        {trackedColumn && (
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                    onClick={() => setViewMode('snapshot')}
                    className={`px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${viewMode === 'snapshot' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Snapshot
                </button>
                <button
                    onClick={() => setViewMode('trend')}
                    className={`px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${viewMode === 'trend' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Trends
                </button>
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[550px] bg-slate-50/30 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Loader2 className="animate-spin h-7 w-7 text-slate-300 mb-4" />
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Loading history...</p>
          </div>
        ) : (!manualUploads.length && !scheduledFetches.length) ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
            <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mb-4 shadow-sm">
                <Database className="h-7 w-7 text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No data available</h3>
            <p className="text-slate-500 text-[10px] mt-2 max-w-xs">Connect a data source or upload a file to begin</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-full">
            {/* Sidebar Navigation */}
            <div className="lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-100">
                <Tab.Group onChange={(index) => {
                    const list = index === 0 ? manualUploads : scheduledFetches;
                    setSelectedUpload(list[0] || null);
                    setViewMode('snapshot');
                }}>
                    <Tab.List className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <Tab className={({ selected }) => classNames('w-full rounded-md py-2 text-[9px] font-bold tracking-wider leading-5 transition-all outline-none focus:ring-0', selected ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600')}>
                        <div className="flex items-center justify-center gap-1.5"><FileText className="h-3 w-3"/>Manual</div>
                    </Tab>
                    <Tab className={({ selected }) => classNames('w-full rounded-md py-2 text-[9px] font-bold tracking-wider leading-5 transition-all outline-none focus:ring-0', selected ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600')}>
                        <div className="flex items-center justify-center gap-1.5"><Clock className="h-3 w-3"/>Auto</div>
                    </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-3 flex-1 h-[520px]">
                        <Tab.Panel className="h-full focus:outline-none"><MasterList uploads={manualUploads} type="manual" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                        <Tab.Panel className="h-full focus:outline-none"><MasterList uploads={scheduledFetches} type="scheduled" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
              </div>
            </div>

            {/* Main View Area */}
            <div className="flex-1 bg-slate-50/30 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
              {viewMode === 'snapshot' ?
                <DetailView selectedUpload={selectedUpload} isOwner={isOwner} isTeamMember={isTeamMember} handleTrackColumn={handleTrackColumn} /> :
                <TrendView trackedColumn={trackedColumn} trendData={trendData} isTrendLoading={isTrendLoading} />
              }
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
       {/* Delete Confirmation Modal */}
      <Transition appear show={!!uploadToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setUploadToDelete(null)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-2xl transition-all border border-slate-100 ring-1 ring-black/5">
                  <div className="flex flex-col items-center">
                    <Dialog.Title as="h3" className="text-base font-bold text-slate-900">Delete Dataset?</Dialog.Title>
                    <div className="mt-2 text-center">
                        <p className="text-sm text-slate-500">
                            You are about to remove <span className="font-semibold text-slate-900 break-all">{uploadToDelete?.file_path.split(/[/\\]/).pop()}</span>.
                            <br/>This action cannot be undone.
                        </p>
                    </div>
                  </div>
                  <div className="mt-6 flex w-full gap-2">
                      {/* LEFT SIDE: Cancel */}
                      <button
                        type="button"
                        onClick={() => setUploadToDelete(null)}
                        className="
                          flex-1 
                          h-8
                          rounded-sm border border-slate-200 
                          bg-white
                          text-[10px] font-bold text-slate-400 font-manrope tracking-widest 
                          hover:bg-slate-50 hover:text-slate-900 
                          transition-all
                        "
                      >
                        Cancel
                      </button>
                      
                      {/* RIGHT SIDE: Delete Action */}
                      <button
                        type="button"
                        onClick={handleDeleteUpload}
                        className="
                          flex-1 
                          h-8
                          bg-red-600 hover:bg-red-700 
                          rounded-sm 
                          text-[10px] font-bold text-white font-manrope tracking-widest 
                          shadow-sm transition-all active:scale-95
                        "
                      >
                        Delete
                      </button>
                    </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
