import React, { useState } from "react";
import { Clock, Power, Upload, Server, Settings2,  Link } from "lucide-react";
import { Workspace, DataUpload } from "../../types";
import { DataSourceModal } from "./DataSourceModal";
import { FormattedDate } from "../../components/FormattedDate";

// --- IMPORT YOUR PREMIUM ILLUSTRATIONS ---
import CsvIllustration from "../../components/website-ui/Illustrations/CsvIllustration";
import ApiIllustration from "../../components/website-ui/Illustrations/ApiIllustration"
import DbIllustration from "../../components/website-ui/Illustrations/DbIllustration";
import LatestCsvIllustration from "../../components/website-ui/Illustrations/LatestCsvIllustration";
import DataSourceIllustration from "../../components/website-ui/Illustrations/DataSourceIllustration";

interface DataSourceCardProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdate: (data: Partial<Workspace>) => void;
  onUploadStart: () => void;
  lastUpload: DataUpload | null;
}

export const DataSourceCard: React.FC<DataSourceCardProps> = ({ workspace, isOwner, onUpdate, onUploadStart, lastUpload }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper: Returns the ILLUSTRATION COMPONENT directly
  const getHeaderInfo = () => {
    if (!workspace.data_source) {
       // Default state (Empty)
       return { Illustration: DataSourceIllustration, label: "Data Source", sub: "Not Configured" };
    }
    
    switch (workspace.data_source) {
        case 'CSV': 
          return { Illustration: CsvIllustration, label: "File Upload", sub: "Static Data" };
        case 'API': 
          return { Illustration: ApiIllustration, label: "API Stream", sub: "Real-time" };
        case 'DB': 
          return { Illustration: DbIllustration, label: "Database", sub: "External Connection" };
        default: 
          return { Illustration: DataSourceIllustration, label: "Data Source", sub: "Generic" };
    }
  };

  const { Illustration, label, sub } = getHeaderInfo();

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full group transition-all duration-300 hover:shadow-md overflow-hidden font-sans">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white gap-4">
          <div className="flex items-center gap-3">
            
            {/* Standardized Icon Container for Consistency */}
            <div className="flex-shrink-0 w-8 h-8 bg-slate-50 text-slate-600 rounded-md border border-slate-200/60 flex items-center justify-center shadow-sm overflow-hidden p-1">
               <Illustration className="w-full h-full object-contain" /> 
            </div>

            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 leading-none">{label}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-500 font-medium">{sub}</span>
                {/* Status Indicator */}
                {(workspace.data_source === 'API' || workspace.data_source === 'DB') && (
                    <span className={`flex items-center gap-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${workspace.is_polling_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${workspace.is_polling_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {workspace.is_polling_active ? 'LIVE' : 'PAUSED'}
                    </span>
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="text-slate-400 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Configure Data Source"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 🚨 Error Alert: Show this only if it's NOT polling and there's a reason */}
        {/* 🚨 Pro-Compact Full Error Banner */}
          {!workspace.is_polling_active && workspace.last_failure_reason && (
            <div className="bg-red-50/60 border-b border-red-100 px-5 py-2 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
                <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.1em]">
                  System Alert: Sync Halted
                </span>
              </div>
              
              {/* Full Error Message - Small, mono-style for that 'Dev' feel */}
              <div className="pl-3 border-l border-red-200/50 mt-0.5">
                <p className="text-[10px] text-red-700/80 font-medium leading-relaxed font-mono break-words line-clamp-3">
                  {workspace.last_failure_reason}
                </p>
              </div>
            </div>
          )}

        {/* --- CONTENT --- */}
        <div className="p-5 flex-grow flex flex-col bg-slate-50/30">
          {!workspace.data_source ? (
            
            /* 1. HERO EMPTY STATE */
            <div className="flex-grow flex flex-col items-center justify-center py-6 text-center h-full">
               <div className="w-24 h-24 mb-3 opacity-90 hover:scale-105 transition-transform duration-500 ease-out">
                  <DataSourceIllustration className="w-full h-full drop-shadow-sm" />
               </div>
               
               <h3 className="text-sm font-semibold text-slate-900">Connect Your Data</h3>
               <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                 Connect a Database, API, or upload a CSV to start monitoring real-time metrics.
               </p>
               {isOwner && (
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="mt-5 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-black transition-all shadow-sm hover:shadow-md active:transform active:scale-95"
                 >
                   <Upload className="w-3.5 h-3.5" />
                   Configure Source
                 </button>
               )}
            </div>

          ) : (
            <div className="flex-grow flex flex-col h-full">
              
              {/* 2. CSV FILE VIEW */}
               {workspace.data_source === 'CSV' && (
                <div className="flex-grow flex flex-col justify-center animate-in fade-in duration-300">
                   {lastUpload && lastUpload.upload_type === 'manual' ? (
                     <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 group/file relative hover:border-blue-300 transition-colors">
                        <div className="flex items-start gap-4">
                           {/* Illustration as Icon */}
                           <div className="w-10 h-10 flex-shrink-0 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                              <LatestCsvIllustration className="w-full h-full" />
                           </div>
                           
                           <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latest Upload</p>
                             <p className="text-sm font-semibold text-slate-900 truncate font-mono" title={lastUpload.file_path}>
                               {lastUpload.file_path.split(/[/\\]/).pop()}
                             </p>
                             <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-medium">
                                 <Clock className="w-3 h-3" />
                                 Uploaded <FormattedDate dateString={lastUpload.uploaded_at} />
                             </div>
                           </div>
                        </div>

                        {isOwner && (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                    <Upload className="w-3 h-3" /> Upload New Version
                                </button>
                            </div>
                        )}
                     </div>
                   ) : (
                      <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                          <div className="w-10 h-10 mx-auto mb-2 opacity-50 grayscale">
                             <CsvIllustration className="w-full h-full" />
                          </div>
                          <p className="text-xs font-medium text-slate-500">No CSV file uploaded yet.</p>
                          {isOwner && (
                            <button onClick={() => setIsModalOpen(true)} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700">
                                Upload File
                            </button>
                          )}
                      </div>
                   )}
                </div>
              )}

              {/* 3. API VIEW */}
               {workspace.data_source === 'API' && workspace.api_url && (
                <div className="flex flex-col h-full animate-in fade-in duration-300">
                    <div className="space-y-3">
                        {/* URL Card */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-1.5 mb-1.5">
                                <Link className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Endpoint
                                </span>
                             </div>
                            <code className="block text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1.5 rounded border border-slate-100 break-all">
                                {workspace.api_url}
                            </code>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <Clock className="w-3 h-3" /> Interval
                                </span>
                                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                    {workspace.polling_interval}
                                </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <Power className="w-3 h-3" /> Status
                                </span>
                                <p className={`text-sm font-semibold transition-colors duration-500 ${
                                    workspace.is_polling_active 
                                      ? 'text-emerald-600' // Make it stand out when active
                                      : 'text-slate-500'
                                  }`}>
                                    {workspace.is_polling_active ? 'Active' : 'Paused'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* 4. DATABASE VIEW */}
               {workspace.data_source === 'DB' && workspace.db_host && (
                <div className="flex flex-col h-full animate-in fade-in duration-300">
                    <div className="space-y-3">
                        {/* Host Card */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] -mr-3 -mt-3 pointer-events-none rotate-12">
                                <DbIllustration className="w-full h-full text-slate-900" />
                            </div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Server className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Host Connection
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-slate-700 font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                    {workspace.db_host}
                                </code>
                                <span className="text-slate-300 text-xs">:</span>
                                <code className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-1 rounded border border-slate-100">
                                    {workspace.db_port}
                                </code>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <Clock className="w-3 h-3" /> Rate
                                </span>
                                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                    {workspace.polling_interval}
                                </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    Status
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${workspace.is_polling_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                    <p className={`text-sm font-semibold ${workspace.is_polling_active ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {workspace.is_polling_active ? 'Polling' : 'Idle'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      <DataSourceModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        workspace={workspace}
        onUpdate={onUpdate}
        onUploadStart={onUploadStart}
      />
    </>
  );
};