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
      <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200/60 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-slate-500 uppercase tracking-wider mb-2 text-[10px]">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          ></span>
          <p className="font-medium text-slate-700 tabular-nums">
            <span className="text-slate-400 mr-1">{payload[0].name}:</span> 
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
    <div className="flex flex-col h-full overflow-y-auto pr-1 custom-scrollbar space-y-0.5">
      {uploads.map(upload => {
        const isSelected = selectedUpload?.id === upload.id;
        return (
            <div key={upload.id} className="group relative px-1">
            <button
                onClick={() => { setSelectedUpload(upload); setViewMode('snapshot'); }}
                className={`w-full text-left p-2.5 rounded-md transition-all duration-200 border ${
                    isSelected
                    ? 'bg-white border-slate-200 shadow-sm z-10'
                    : 'bg-transparent border-transparent hover:bg-slate-100/50 text-slate-600'
                }`}
            >
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 p-1.5 rounded-md flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'}`}>
                            {upload.upload_type === 'manual' && <FileText className="h-3.5 w-3.5" />}
                            {upload.upload_type === 'api_poll' && <Globe className="h-3.5 w-3.5" />}
                            {upload.upload_type === 'db_query' && <Server className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`font-medium text-xs truncate block ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                {upload.file_path.split(/[/\\]/).pop()}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-medium text-slate-400 tabular-nums">
                                    <FormattedDate dateString={upload.uploaded_at} />
                                </p>
                                {upload.schema_changed_from_previous && (
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-100/50">
                                        Schema Change
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
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 ${
                        isSelected 
                        ? 'opacity-0 hover:opacity-100 text-slate-400 hover:bg-red-50 hover:text-red-600' 
                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-slate-100'
                    }`}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
            </div>
      )})}
      {uploads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 mx-2 mt-2">
            <LayoutList className="h-5 w-5 text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-500">{`No ${type} history`}</p>
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

    if (!selectedUpload) return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Select a Dataset</h3>
            <p className="text-slate-500 text-sm mt-1">Select an item from the sidebar to view details.</p>
        </div>
    );

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rows</p>
                <LayoutList className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight"><AnimatedNumber value={rowCount} /></div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full">
             <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Columns</p>
                <Database className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight"><AnimatedNumber value={colCount} /></div>
          </div>

          <div className={`rounded-lg p-4 border shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full ${selectedUpload.schema_changed_from_previous ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                 <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedUpload.schema_changed_from_previous ? 'text-amber-700/70' : 'text-slate-400'}`}>Schema Status</p>
                 {selectedUpload.schema_changed_from_previous ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <ShieldQuestion className="h-3.5 w-3.5 text-slate-300" />}
              </div>
              <div className={`text-xl font-semibold tracking-tight ${selectedUpload.schema_changed_from_previous ? 'text-amber-700' : 'text-slate-900'}`}>
                    {selectedUpload.schema_changed_from_previous ? 'Changed' : 'Stable'}
              </div>
          </div>
        </div>

        {/* Schema Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                Schema Definition
            </h3>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">{selectedUpload.file_path.split(/[/\\]/).pop()}</span>
          </div>
          <div className="overflow-x-auto max-h-[300px] custom-scrollbar bg-slate-50/30">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Column</th>
                  <th scope="col" className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  {canConfigureTrends && <th scope="col" className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {selectedUpload.schema_info && Object.entries(selectedUpload.schema_info).map(([col, type]) => (
                  <tr key={col} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-700">{col}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
                        {String(type)}
                      </span>
                    </td>
                    {canConfigureTrends && (
                      <td className="px-2 sm:px-4 py-2 text-right align-middle">
                        {(String(type).includes('int') || String(type).includes('float')) && (
                          <button
                            onClick={() => handleTrackColumn(col)}
                            className="
                              inline-flex items-center gap-1.5
                              rounded-md
                              px-2 py-1 sm:px-2.5 sm:py-1
                              text-[10px] sm:text-[11px]
                              font-medium
                              text-slate-600
                              hover:text-blue-600
                              focus:text-blue-600
                              bg-transparent
                              hover:bg-blue-50
                              focus:bg-blue-50
                              transition-colors
                              focus:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-blue-500/40
                            "
                            aria-label="Track trend for column"
                          >
                            {/* Icon first for visual clarity */}
                            <LineChartIcon className="h-3 w-3 shrink-0" />

                            {/* Hide text on very small screens */}
                            <span className="hidden sm:inline">Track Trend</span>
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

        {/* Summary Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Statistical Averages</h3>
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="mean" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
};

const TrendView: React.FC<{ trackedColumn: string | null; trendData: TrendDataPoint[]; isTrendLoading: boolean; }> = ({ trackedColumn, trendData, isTrendLoading }) => {
  if (isTrendLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>;
  
  if (!trendData || trendData.length < 2) return (
    <div className="h-96 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
             <TrendingUp className="h-5 w-5 text-slate-300" />
        </div>
        <h3 className="text-slate-900 font-medium text-sm">Insufficient Data</h3>
        <p className="text-slate-500 text-xs mt-1">Need at least two uploads to visualize trends.</p>
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Trend Analysis
            </h3>
            <p className="text-xs text-slate-500 mt-1">Tracking column: <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{trackedColumn}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Value</p>
            <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums tracking-tight">{firstValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Value</p>
            <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums tracking-tight">{lastValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
        </div>
        <div className={`p-4 rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${isPositive ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isPositive ? 'text-emerald-700/70' : 'text-rose-700/70'}`}>Net Change</p>
            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />}
          </div>
          <p className={`text-xl font-bold mt-1 tracking-tight tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {overallChange > 0 ? '+' : ''}{overallChange.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="w-full h-80 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
                minTickGap={30} 
            />
            <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                domain={['auto', 'auto']} 
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={averageValue} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Avg', position: 'insideRight', fill: '#94a3b8', fontSize: 10 }} />
            <Line 
                type="monotone" 
                dataKey="value" 
                name={trackedColumn || ''} 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={{ r: 3, fill: 'white', strokeWidth: 1.5, stroke: '#3b82f6' }} 
                activeDot={{ r: 5, strokeWidth: 0, fill: '#2563eb' }} 
                connectNulls={false} 
            />
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
}, [workspace.id, onUploadsUpdate]);

  useEffect(() => {
    fetchAllUploads();
  }, [fetchAllUploads]);

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
    background: '#ffffff', // 👈 This fixes the black background
    border: '1px solid #e2e8f0', 
    padding: '12px', 
    color: '#334155', 
    fontSize: '13px',
    borderRadius: '8px', // Optional: matches your UI's rounded corners
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-3 relative overflow-hidden h-full flex flex-col font-sans">
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col justify-center items-center z-50 rounded-xl transition-all duration-300">
            <Loader2 className="animate-spin h-6 w-6 text-blue-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700 tracking-wide">Syncing Data...</p>
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-md border border-blue-100/50 flex items-center justify-center shadow-sm">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none">Data Intelligence</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">History, Trends & Validation</p>
          </div>
        </div>
        
        {trackedColumn && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                <button 
                    onClick={() => setViewMode('snapshot')} 
                    className={`px-3 py-1 text-[11px] font-semibold rounded-[6px] transition-all duration-200 ${viewMode === 'snapshot' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Snapshot
                </button>
                <button 
                    onClick={() => setViewMode('trend')} 
                    className={`px-3 py-1 text-[11px] font-semibold rounded-[6px] transition-all duration-200 ${viewMode === 'trend' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Trends
                </button>
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[500px] bg-slate-50/50 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Loader2 className="animate-spin h-6 w-6 text-slate-400 mb-3" />
            <p className="text-slate-400 text-xs font-medium">Loading history...</p>
          </div>
        ) : (!manualUploads.length && !scheduledFetches.length) ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
            <div className="w-12 h-12 bg-white border border-slate-200/60 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Database className="h-5 w-5 text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Data History</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-[280px] mx-auto leading-relaxed">Upload a file or configure a connection to start visualizing your data.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-full">
            {/* Sidebar Navigation */}
            <div className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-100">
                <Tab.Group onChange={(index) => {
                    const list = index === 0 ? manualUploads : scheduledFetches;
                    setSelectedUpload(list[0] || null);
                    setViewMode('snapshot');
                }}>
                    <Tab.List className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/50">
                    <Tab className={({ selected }) => classNames('w-full rounded-[6px] py-1.5 text-[11px] font-semibold leading-5 transition-all outline-none focus:ring-0', selected ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700')}>
                        <div className="flex items-center justify-center gap-1.5"><FileText className="h-3.5 w-3.5"/>Manual</div>
                    </Tab>
                    <Tab className={({ selected }) => classNames('w-full rounded-[6px] py-1.5 text-[11px] font-semibold leading-5 transition-all outline-none focus:ring-0', selected ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700')}>
                        <div className="flex items-center justify-center gap-1.5"><Clock className="h-3.5 w-3.5"/>Auto</div>
                    </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-2 flex-1 h-[480px]">
                        <Tab.Panel className="h-full focus:outline-none"><MasterList uploads={manualUploads} type="manual" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                        <Tab.Panel className="h-full focus:outline-none"><MasterList uploads={scheduledFetches} type="scheduled" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
              </div>
            </div>

            {/* Main View Area */}
            <div className="flex-1 bg-slate-50/30 p-4 lg:p-6 overflow-y-auto custom-scrollbar">
              {viewMode === 'snapshot' ? 
                <DetailView selectedUpload={selectedUpload} isOwner={isOwner} isTeamMember={isTeamMember} handleTrackColumn={handleTrackColumn} /> : 
                <TrendView trackedColumn={trackedColumn} trendData={trendData} isTrendLoading={isTrendLoading} />
              }
            </div>
          </div>
        )}
      </div>

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
                    <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-1 ring-red-100">
                        <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <Dialog.Title as="h3" className="text-base font-bold text-slate-900">Delete Dataset?</Dialog.Title>
                    <div className="mt-2 text-center">
                        <p className="text-sm text-slate-500">
                            You are about to remove <span className="font-semibold text-slate-900 break-all">{uploadToDelete?.file_path.split(/[/\\]/).pop()}</span>.
                            <br/>This action cannot be undone.
                        </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="button" className="flex-1 justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors" onClick={() => setUploadToDelete(null)}>Cancel</button>
                    <button type="button" className="flex-1 justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors" onClick={handleDeleteUpload}>Delete</button>
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