import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useAuth } from "../../context/AuthContext"; 
import { api } from "../../services/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,  ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, Loader2, Globe, FileText, TrendingUp, LineChart as LineChartIcon, Trash2, ShieldQuestion, Database, ArrowUpRight, ArrowDownRight, Server, Clock,  LayoutList } from "lucide-react";
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

// UI UPDATE: Cleaner, modern tooltip with shadow and border radius
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </p>

        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          ></span>

          <p className="text-sm font-semibold text-gray-900">
            {payload[0].name}:{" "}
            <span className="font-mono">
              {payload[0].value.toLocaleString()}
            </span>
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
    <div className="flex flex-col h-full max-h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
      {uploads.map(upload => {
        const isSelected = selectedUpload?.id === upload.id;
        return (
            <div key={upload.id} className="group relative flex items-center">
            <button 
                onClick={() => { setSelectedUpload(upload); setViewMode('snapshot'); }} 
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 border relative overflow-hidden ${
                    isSelected 
                    ? 'bg-blue-50/60 border-blue-200 ring-1 ring-blue-100 z-10' 
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-600'
                }`}
            >
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {upload.upload_type === 'manual' && <FileText className="h-4 w-4" />}
                            {upload.upload_type === 'api_poll' && <Globe className="h-4 w-4" />}
                            {upload.upload_type === 'db_query' && <Server className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                            <p className={`font-semibold text-sm truncate block max-w-[180px] ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                {upload.file_path.split(/[/\\]/).pop()}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <FormattedDate dateString={upload.uploaded_at} />
                            </p>
                        </div>
                    </div>
                </div>

                {upload.schema_changed_from_previous && (
                    <div className="mt-3 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-medium uppercase tracking-wide">
                            <AlertTriangle className="h-3 w-3" /> Schema Change
                        </span>
                    </div>
                )}
            </button>
            
            {isOwner && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setUploadToDelete(upload); }} 
                    className={`absolute right-2 top-3 p-2 rounded-lg transition-all duration-200 ${
                        isSelected ? 'opacity-100 hover:bg-red-50 hover:text-red-600 text-gray-400' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500'
                    }`}
                    title="Delete this upload"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
            </div>
      )})}
      {uploads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            <LayoutList className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">{`No ${type} history`}</p>
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
        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 ring-1 ring-gray-100">
                <FileText className="h-8 w-8 text-blue-100" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Select a Dataset</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs">Choose an upload from the sidebar to view its comprehensive analysis.</p>
        </div>
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-white rounded-xl p-5 border border-gray-100 shadow-sm group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Database className="h-16 w-16 text-blue-600" /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Rows</p>
            <div className="text-3xl font-bold text-gray-900 mt-2"><AnimatedNumber value={rowCount} /></div>
          </div>
          
          <div className="relative overflow-hidden bg-white rounded-xl p-5 border border-gray-100 shadow-sm group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><LayoutList className="h-16 w-16 text-emerald-600" /></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Columns</p>
            <div className="text-3xl font-bold text-gray-900 mt-2"><AnimatedNumber value={colCount} /></div>
          </div>

          <div className={`relative overflow-hidden rounded-xl p-5 border shadow-sm transition-all ${selectedUpload.schema_changed_from_previous ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}>
             <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${selectedUpload.schema_changed_from_previous ? 'text-amber-600' : 'text-gray-400'}`}>Schema Health</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-2xl font-bold ${selectedUpload.schema_changed_from_previous ? 'text-amber-700' : 'text-gray-900'}`}>
                            {selectedUpload.schema_changed_from_previous ? 'Changed' : 'Stable'}
                        </span>
                    </div>
                </div>
                <div className={`p-2 rounded-lg ${selectedUpload.schema_changed_from_previous ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
                    {selectedUpload.schema_changed_from_previous ? <AlertTriangle className="h-6 w-6" /> : <ShieldQuestion className="h-6 w-6" />}
                </div>
             </div>
          </div>
        </div>

        {/* Schema Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-400" />
                Schema Definition
            </h3>
            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">{selectedUpload.file_path.split(/[/\\]/).pop()}</span>
          </div>
          <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Column Name</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data Type</th>
                  {canConfigureTrends && <th scope="col" className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {selectedUpload.schema_info && Object.entries(selectedUpload.schema_info).map(([col, type]) => (
                  <tr key={col} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-700">{col}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 font-mono border border-gray-200">
                        {String(type)}
                      </span>
                    </td>
                    {canConfigureTrends && (
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-right">
                        {(String(type).includes('int') || String(type).includes('float')) && (
                          <button 
                            onClick={() => handleTrackColumn(col)} 
                            className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all"
                          >
                            Track Trend
                            <LineChartIcon className="h-3 w-3" />
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Statistical Averages</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#f9fafb'}} />
                  <Bar dataKey="mean" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
};

const TrendView: React.FC<{ trackedColumn: string | null; trendData: TrendDataPoint[]; isTrendLoading: boolean; }> = ({ trackedColumn, trendData, isTrendLoading }) => {
  if (isTrendLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  
  if (!trendData || trendData.length < 2) return (
    <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        <TrendingUp className="h-10 w-10 text-gray-300 mb-3" />
        <h3 className="text-gray-900 font-medium">Insufficient Data</h3>
        <p className="text-gray-500 text-sm mt-1">Need at least two uploads to visualize trends.</p>
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><LineChartIcon className="h-5 w-5" /></span>
            Trend Analysis: <span className="text-blue-600">{trackedColumn}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Initial Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{firstValue?.toLocaleString() ?? 'N/A'}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Current Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{lastValue?.toLocaleString() ?? 'N/A'}</p>
        </div>
        <div className={`p-5 rounded-xl border shadow-sm ${isPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>Net Change</p>
            {isPositive ? <ArrowUpRight className="h-5 w-5 text-emerald-600" /> : <ArrowDownRight className="h-5 w-5 text-rose-600" />}
          </div>
          <p className={`text-2xl font-bold mt-1 ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {overallChange > 0 ? '+' : ''}{overallChange.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="w-full h-96 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={averageValue} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: 'Avg', position: 'insideRight', fill: '#9ca3af', fontSize: 10 }} />
            <Line 
                type="monotone" 
                dataKey="value" 
                name={trackedColumn || ''} 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'white', strokeWidth: 2 }} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} 
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
      const [manualRes, apiRes, dbRes] = await Promise.all([
        api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?upload_type=manual`),
        api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?upload_type=api_poll`),
        api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?upload_type=db_query`)
      ]);
      const combinedScheduled = [...apiRes.data, ...dbRes.data].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      
      setManualUploads(manualRes.data);
      setScheduledFetches(combinedScheduled);
      onUploadsUpdate(manualRes.data, combinedScheduled);
      setSelectedUpload(manualRes.data[0] || combinedScheduled[0] || null);
    } catch (error) { console.error("Failed to fetch uploads", error); } 
    finally { setIsLoading(false); }
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
    // Team Members (who would get a 403) skip this block
    if (isOwner) {
        try {
            await api.put(`/workspaces/${workspace.id}`, { tracked_column: columnName });
        } catch (error){
            console.error(error);
            // Even if save fails, we don't alert the user aggressively since they can still see the graph
        }
    } else {
        // Optional: Let them know it's a temporary view
        toast.success(`Viewing trend: ${columnName}`);
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
      toast.success("Upload deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete upload.");
      fetchAllUploads();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm lg:col-span-3 relative overflow-hidden transition-all hover:shadow-md">
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col justify-center items-center z-50 rounded-2xl animate-in fade-in duration-300">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
              <Loader2 className="animate-spin h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Syncing Data...</p>
              <p className="text-sm text-gray-500 mt-1">Refining your workspace insights</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center ring-4 ring-purple-50">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Data Intelligence</h2>
            <p className="text-sm text-gray-500 font-medium">History, Trends & Schema Validation</p>
          </div>
        </div>
        
        {trackedColumn && (
            <div className="hidden sm:flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('snapshot')} 
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'snapshot' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Snapshot
                </button>
                <button 
                    onClick={() => setViewMode('trend')} 
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'trend' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Trends
                </button>
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-6 min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
            <p className="text-gray-500 font-medium">Loading history...</p>
          </div>
        ) : (!manualUploads.length && !scheduledFetches.length) ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
                <Database className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No Data Found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">Upload a file or configure a connection to start visualizing your data history.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Sidebar Navigation */}
            <div className="lg:w-80 flex-shrink-0 flex flex-col gap-4">
              <Tab.Group onChange={(index) => {
                const list = index === 0 ? manualUploads : scheduledFetches;
                setSelectedUpload(list[0] || null);
                setViewMode('snapshot');
              }}>
                <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-xl">
                  <Tab className={({ selected }) => classNames('w-full rounded-lg py-2.5 text-sm font-semibold leading-5 transition-all outline-none focus:ring-0', selected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    <div className="flex items-center justify-center gap-2"><FileText className="h-4 w-4"/>Manual</div>
                  </Tab>
                  <Tab className={({ selected }) => classNames('w-full rounded-lg py-2.5 text-sm font-semibold leading-5 transition-all outline-none focus:ring-0', selected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    <div className="flex items-center justify-center gap-2"><Clock className="h-4 w-4"/>Auto</div>
                  </Tab>
                </Tab.List>
                <Tab.Panels className="flex-1 bg-gray-50/50 rounded-2xl border border-gray-200/50 p-3 h-[500px]">
                  <Tab.Panel className="h-full focus:outline-none"><MasterList uploads={manualUploads} type="manual" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                  <Tab.Panel className="h-full focus:outline-none"><MasterList uploads={scheduledFetches} type="scheduled" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>

            {/* Main View Area */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl">
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
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all border border-gray-100">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
                    <ShieldQuestion className="h-6 w-6 text-red-600" />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-bold text-center text-gray-900">Confirm Deletion</Dialog.Title>
                  <div className="mt-2 text-center">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-semibold text-gray-700">{uploadToDelete?.file_path.split(/[/\\]/).pop()}</span>?
                        <br/>This action cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="button" className="flex-1 justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors" onClick={() => setUploadToDelete(null)}>Cancel</button>
                    <button type="button" className="flex-1 justify-center rounded-xl border border-transparent bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors" onClick={handleDeleteUpload}>Delete</button>
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