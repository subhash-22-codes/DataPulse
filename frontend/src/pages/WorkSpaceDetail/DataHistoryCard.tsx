import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, Loader2, Globe, FileText, TrendingUp, LineChart as LineChartIcon, Trash2, ShieldQuestion, Database, ArrowUpRight, ArrowDownRight, Server, Clock } from "lucide-react";
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
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <p className="text-sm font-semibold text-gray-800">{`Time: ${label}`}</p>
        <p className="text-sm" style={{ color: payload[0].color }}>{`${payload[0].name}: ${payload[0].value.toLocaleString()}`}</p>
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

// ====================================================================
//  Sub-Components (Defined outside for clarity and stability)
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
    <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-2">
      {uploads.map(upload => (
        <div key={upload.id} className="group flex items-center gap-2">
          <button onClick={() => { setSelectedUpload(upload); setViewMode('snapshot'); }} className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${selectedUpload?.id === upload.id ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
            <div className="flex items-center gap-2">
              {upload.upload_type === 'manual' && <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />}
              {upload.upload_type === 'api_poll' && <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />}
              {upload.upload_type === 'db_query' && <Server className="h-4 w-4 text-gray-500 flex-shrink-0" />}
              <p className={`font-medium text-sm truncate ${selectedUpload?.id === upload.id ? 'text-blue-900' : 'text-gray-900'}`}>{upload.file_path.split(/[/\\]/).pop()}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-6"><FormattedDate dateString={upload.uploaded_at} /></p>
            {upload.schema_changed_from_previous && (<div className="mt-2 ml-6 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"><AlertTriangle className="h-3 w-3" />Schema Change</div>)}
          </button>
          {isOwner && <button onClick={() => setUploadToDelete(upload)} className="p-2 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete this upload"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
      {uploads.length === 0 && <p className="text-sm text-gray-500 text-center py-4">{`No ${type} uploads yet.`}</p>}
    </div>
);

const DetailView: React.FC<{
  selectedUpload: DataUpload | null;
  isOwner: boolean;
  handleTrackColumn: (col: string) => void;
}> = ({ selectedUpload, isOwner, handleTrackColumn }) => {
    const chartData = formatChartData(selectedUpload?.analysis_results?.summary_stats);
    const rowCount = selectedUpload?.analysis_results?.row_count ?? 0;
    const colCount = selectedUpload?.analysis_results?.column_count ?? 0;

    return selectedUpload ? (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200/50">
            <p className="text-sm font-medium text-blue-700">Row Count</p>
            <div className="text-2xl font-bold text-blue-900 mt-1"><AnimatedNumber value={rowCount} /></div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-200/50">
            <p className="text-sm font-medium text-green-700">Columns</p>
            <div className="text-2xl font-bold text-green-900 mt-1"><AnimatedNumber value={colCount} /></div>
          </div>
          <div className={`rounded-lg p-4 border ${selectedUpload.schema_changed_from_previous ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50' : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200/50'}`}><p className={`text-sm font-medium ${selectedUpload.schema_changed_from_previous ? 'text-amber-700' : 'text-gray-700'}`}>Schema Status</p><p className={`text-2xl font-bold mt-1 ${selectedUpload.schema_changed_from_previous ? 'text-amber-900' : 'text-gray-900'}`}>{selectedUpload.schema_changed_from_previous ? 'Changed' : 'Stable'}</p></div>
        </div>
        <div className="bg-gray-50/50 rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Schema for {selectedUpload.file_path.split(/[/\\]/).pop()}</h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden"><div className="overflow-x-auto max-h-64"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Column Name</th><th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data Type</th>{isOwner && <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Track</th>}</tr></thead><tbody className="bg-white divide-y divide-gray-200">{selectedUpload.schema_info && Object.entries(selectedUpload.schema_info).map(([col, type]) => (<tr key={col} className="hover:bg-gray-50"><td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">{col}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">{String(type)}</span></td>{isOwner && <td className="px-4 py-3 whitespace-nowrap text-sm">{ (String(type).includes('int') || String(type).includes('float')) && (<button onClick={() => handleTrackColumn(col)} title={`Track ${col}`} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100"><LineChartIcon className="h-4 w-4" /></button>) }</td>}</tr>))}</tbody></table></div></div>
        </div>
        {chartData.length > 0 && <div className="bg-gray-50/50 rounded-lg p-4"><h3 className="text-md font-semibold text-gray-800 mb-3">Summary Statistics (Mean Values)</h3><div className="bg-white rounded-lg border border-gray-200 p-4"><div className="w-full h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} angle={-45} textAnchor="end" height={80} stroke="#d1d5db" /><YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#d1d5db" /><Tooltip contentStyle={{backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} /><Legend /><Bar dataKey="mean" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Mean Value" /></BarChart></ResponsiveContainer></div></div></div>}
      </div>
    ) : <div className="text-center py-16"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div><p className="text-gray-500 font-medium">Select an upload to view details</p></div>
};

const TrendView: React.FC<{ trackedColumn: string | null; trendData: TrendDataPoint[]; isTrendLoading: boolean; }> = ({ trackedColumn, trendData, isTrendLoading }) => {
  if (isTrendLoading) return <div className="flex justify-center items-center py-16"><Loader2 className="animate-spin h-6 w-6 text-gray-400" /></div>;
  if (!trendData || trendData.length < 2) return <div className="text-center py-16"><p className="text-gray-500">Not enough data to display a trend. Need at least two uploads of the same type.</p></div>;
  const firstValue = trendData.find(d => d.value !== null)?.value;
  const lastValue = [...trendData].reverse().find(d => d.value !== null)?.value;
  let overallChange = 0;
  if (typeof firstValue === 'number' && typeof lastValue === 'number' && firstValue !== 0) {
    overallChange = ((lastValue - firstValue) / firstValue) * 100;
  }
  const averageValue = trendData.reduce((acc, curr) => acc + (curr.value || 0), 0) / trendData.filter(d => d.value !== null).length;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Trend for '{trackedColumn}'</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg border"><p className="text-sm text-gray-500">First Value</p><p className="text-2xl font-semibold text-gray-900">{firstValue?.toLocaleString() ?? 'N/A'}</p></div>
        <div className="bg-gray-50 p-4 rounded-lg border"><p className="text-sm text-gray-500">Latest Value</p><p className="text-2xl font-semibold text-gray-900">{lastValue?.toLocaleString() ?? 'N/A'}</p></div>
        <div className={`rounded-lg p-4 border ${overallChange >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><div className="flex items-center justify-between"><p className={`text-sm font-medium ${overallChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>Overall Change</p>{overallChange >= 0 ? <ArrowUpRight className="h-5 w-5 text-green-600" /> : <ArrowDownRight className="h-5 w-5 text-red-600" />}</div><p className={`text-2xl font-bold mt-1 ${overallChange >= 0 ? 'text-green-900' : 'text-red-900'}`}>{overallChange.toFixed(1)}%</p></div>
      </div>
      <div className="w-full h-96 bg-gray-50 p-4 rounded-lg border">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={['dataMin - 10', 'dataMax + 10']} /><Tooltip content={<CustomTooltip />} /><Legend /><ReferenceLine y={averageValue} label={{ value: 'Avg', position: 'insideLeft' }} stroke="red" strokeDasharray="3 3" /><Line type="monotone" dataKey="value" name={trackedColumn || ''} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} connectNulls={false} /></LineChart></ResponsiveContainer>
      </div>
    </div>
  );
};

// ====================================================================
//  Main Data History Card Component
// ====================================================================
export const DataHistoryCard: React.FC<DataHistoryCardProps> = ({ workspace, isProcessing, isOwner, onUploadsUpdate }) => {
  const { token } = useAuth();
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
        api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?upload_type=manual`, { headers: { Authorization: `Bearer ${token}` }}),
        api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?upload_type=api_poll`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads?upload_type=db_query`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const combinedScheduled = [...apiRes.data, ...dbRes.data].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      
      setManualUploads(manualRes.data);
      setScheduledFetches(combinedScheduled);
      onUploadsUpdate(manualRes.data, combinedScheduled);
      setSelectedUpload(manualRes.data[0] || combinedScheduled[0] || null);
    } catch (error) { console.error("Failed to fetch uploads", error); } 
    finally { setIsLoading(false); }
  }, [workspace.id, token, onUploadsUpdate]);

  useEffect(() => {
    fetchAllUploads();
  }, [fetchAllUploads]);

  useEffect(() => {
    if (!trackedColumn || !selectedUpload) return;
    const fetchTrendData = async () => {
      setIsTrendLoading(true);
      const uploadType = selectedUpload.upload_type;
      try {
        const res = await api.get<{ data: TrendDataPoint[] }>(`/workspaces/${workspace.id}/trend?column_name=${trackedColumn}&upload_type=${uploadType}`, { headers: { Authorization: `Bearer ${token}` } });
        setTrendData(res.data.data.map((d: any) => ({ ...d, date: new Date(d.date).toLocaleString() })));
      } catch (error) { console.error("Failed to fetch trend data", error); } 
      finally { setIsTrendLoading(false); }
    };
    fetchTrendData();
  }, [trackedColumn, workspace.id, token, selectedUpload]);

  const handleTrackColumn = async (columnName: string) => {
    setTrackedColumn(columnName);
    try {
      await api.put(`/workspaces/${workspace.id}`, { tracked_column: columnName }, { headers: { Authorization: `Bearer ${token}` } });
      setViewMode('trend');
    } catch (error){
      console.error(error);
      toast.error("Failed to set tracked column.");
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
      await api.delete(`/uploads/${closingUpload.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Upload deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete upload.");
      fetchAllUploads(); // Re-fetch on error to ensure consistency
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm lg:col-span-3 relative overflow-hidden">
      {isProcessing && (<div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col justify-center items-center z-20 rounded-xl"><div className="text-center space-y-4"><div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div><div><p className="text-lg font-semibold text-gray-900">Processing new data...</p><p className="text-sm text-gray-500 mt-1">The dashboard will refresh automatically</p></div></div></div>)}
      <div className="p-4 sm:p-6 border-b border-gray-100"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mr-3"><TrendingUp className="h-5 w-5 text-purple-600" /></div><div><h2 className="text-lg font-semibold text-gray-900">Data History & Analysis</h2><p className="text-sm text-gray-500 mt-0.5">View upload history and data insights</p></div></div></div>
      <div className="p-4 sm:p-6">
        {isLoading ? (<div className="flex flex-col items-center justify-center py-16"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Loader2 className="animate-spin h-6 w-6 text-gray-400" /></div><p className="text-gray-500 font-medium">Loading data history...</p></div>) : 
        (!manualUploads.length && !scheduledFetches.length) ? (<div className="text-center py-16"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Database className="h-8 w-8 text-gray-400" /></div><p className="text-gray-500 font-medium mb-2">No data uploaded yet</p><p className="text-sm text-gray-400">Configure the Data Source above to get started</p></div>) : 
        (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-80 flex-shrink-0">
              <Tab.Group onChange={(index) => {
                const list = index === 0 ? manualUploads : scheduledFetches;
                setSelectedUpload(list[0] || null);
                setViewMode('snapshot');
              }}>
                <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/10 p-1 mb-3">
                  <Tab className={({ selected }) => classNames('w-full rounded-lg py-2 text-sm font-medium leading-5', selected ? 'bg-white text-blue-700 shadow' : 'text-blue-500 hover:bg-white/[0.5]')}><div className="flex items-center justify-center gap-2"><FileText className="h-4 w-4"/>Manual Uploads</div></Tab>
                  <Tab className={({ selected }) => classNames('w-full rounded-lg py-2 text-sm font-medium leading-5', selected ? 'bg-white text-blue-700 shadow' : 'text-blue-500 hover:bg-white/[0.5]')}><div className="flex items-center justify-center gap-2"><Clock className="h-4 w-4"/>Scheduled Fetches</div></Tab>
                </Tab.List>
                <Tab.Panels className="mt-2 bg-gray-50/50 rounded-lg p-3">
                  <Tab.Panel><MasterList uploads={manualUploads} type="manual" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                  <Tab.Panel><MasterList uploads={scheduledFetches} type="scheduled" selectedUpload={selectedUpload} setSelectedUpload={setSelectedUpload} setViewMode={setViewMode} setUploadToDelete={setUploadToDelete} isOwner={isOwner} /></Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
            <div className="flex-1 min-w-0">
              {trackedColumn && (
                <div className="mb-4 flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-min">
                  <button onClick={() => setViewMode('snapshot')} className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'snapshot' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}>Snapshot</button>
                  <button onClick={() => setViewMode('trend')} className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'trend' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}>Trend</button>
                </div>
              )}
              {viewMode === 'snapshot' ? <DetailView selectedUpload={selectedUpload} isOwner={isOwner} handleTrackColumn={handleTrackColumn} /> : <TrendView trackedColumn={trackedColumn} trendData={trendData} isTrendLoading={isTrendLoading} />}
            </div>
          </div>
        )}
      </div>
      <Transition appear show={!!uploadToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setUploadToDelete(null)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 flex items-center"><ShieldQuestion className="h-6 w-6 text-red-600 mr-3" />Confirm Deletion</Dialog.Title>
                  <div className="mt-2"><p className="text-sm text-gray-500">Are you sure you want to delete this upload? This will permanently remove the file and all of its analysis from the database. This action cannot be undone.</p></div>
                  <div className="mt-6 flex justify-end gap-x-2">
                    <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50" onClick={() => setUploadToDelete(null)}>Cancel</button>
                    <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700" onClick={handleDeleteUpload}>Yes, Delete</button>
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