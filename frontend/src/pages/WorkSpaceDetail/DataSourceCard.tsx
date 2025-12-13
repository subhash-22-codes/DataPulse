import React, { useState } from "react";
import { Clock, Power, PowerOff, Upload, Server, Settings2 } from "lucide-react"; // Removed generic icons
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
       // Default state (Empty) -> Use DB Illustration as generic "Data" symbol
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full group transition-shadow hover:shadow-md overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            
            <div className="w-12 h-12 flex-shrink-0">
               <Illustration className="w-full h-full drop-shadow-sm" /> 
            </div>

            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{label}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-medium">{sub}</span>
                {/* Status Indicator */}
                {(workspace.data_source === 'API' || workspace.data_source === 'DB') && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${workspace.is_polling_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${workspace.is_polling_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {workspace.is_polling_active ? 'LIVE' : 'PAUSED'}
                    </span>
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-200 transition-all group-hover:text-blue-600"
              title="Configure Data Source"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* --- CONTENT --- */}
        <div className="p-5 flex-grow flex flex-col bg-white">
          {!workspace.data_source ? (
            
            /* 1. HERO EMPTY STATE */
            <div className="flex-grow flex flex-col items-center justify-center py-6 text-center opacity-90">
               {/* Replaced Icon Circle with Illustration */}
               <div className="w-20 h-20 mb-2">
                  <DataSourceIllustration className="w-full h-full opacity-90" />
               </div>
               
               <h3 className="text-sm font-semibold text-gray-900">Connect Your Data</h3>
               <p className="text-xs text-gray-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                 Connect a Database, API, or upload a CSV to start monitoring real-time metrics.
               </p>
               {isOwner && (
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="mt-6 flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-black transition-all shadow-sm"
                 >
                   <Upload className="w-3 h-3" />
                   Configure Source
                 </button>
               )}
            </div>

          ) : (
            <div className="flex-grow flex flex-col h-full">
              
              {/* 2. CSV FILE VIEW */}
               {workspace.data_source === 'CSV' && (
                <div className="flex-grow flex flex-col justify-center">
                   {lastUpload && lastUpload.upload_type === 'manual' ? (
                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 group/file relative">
                        <div className="flex items-center gap-4">
                           {/* Replaced FileText Icon with CsvIllustration */}
                           <div className="w-10 h-10 flex-shrink-0">
                              <LatestCsvIllustration className="w-full h-full" />
                           </div>
                           
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Latest File</p>
                              <p className="text-sm font-semibold text-gray-900 truncate" title={lastUpload.file_path}>
                                {lastUpload.file_path.split(/[/\\]/).pop()}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400">
                                 <Clock className="w-3 h-3" />
                                 Uploaded <FormattedDate dateString={lastUpload.uploaded_at} />
                              </div>
                           </div>
                        </div>

                        {isOwner && (
                            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                >
                                    <Upload className="w-3 h-3" /> Upload File
                                </button>
                            </div>
                        )}
                     </div>
                   ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                          <div className="w-12 h-12 mx-auto mb-2 opacity-50">
                             <CsvIllustration className="w-full h-full" />
                          </div>
                          <p className="text-xs text-gray-500">No CSV file uploaded yet.</p>
                          {isOwner && (
                            <button onClick={() => setIsModalOpen(true)} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
                                Upload File
                            </button>
                          )}
                      </div>
                   )}
                </div>
              )}

              {/* 3. API VIEW */}
               {workspace.data_source === 'API' && workspace.api_url && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                             {/* Keep small icons for labels as they are text-inline */}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                Endpoint URL
                            </span>
                            <p className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                                {workspace.api_url}
                            </p>
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex-1 p-3 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                    <Clock className="w-3 h-3" /> Interval
                                </span>
                                <p className="text-sm font-semibold text-gray-900">
                                    {workspace.polling_interval}
                                </p>
                            </div>
                            <div className="flex-1 p-3 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                    {workspace.is_polling_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />} Status
                                </span>
                                <p className={`text-sm font-semibold ${workspace.is_polling_active ? 'text-green-600' : 'text-gray-500'}`}>
                                    {workspace.is_polling_active ? 'Active' : 'Paused'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* 4. DATABASE VIEW */}
               {workspace.data_source === 'DB' && workspace.db_host && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-3 bg-gray-50 rounded-md border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 opacity-10 -mr-4 -mt-4 pointer-events-none">
                                <DbIllustration className="w-full h-full" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                <Server className="w-3 h-3" /> Host Connection
                            </span>
                            <p className="text-sm font-mono text-gray-800 font-medium relative z-10">
                                {workspace.db_host}
                                <span className="text-gray-400">:{workspace.db_port}</span>
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 p-3 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                    <Clock className="w-3 h-3" /> Refresh Rate
                                </span>
                                <p className="text-sm font-semibold text-gray-900">
                                    {workspace.polling_interval}
                                </p>
                            </div>
                            <div className="flex-1 p-3 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                    Status
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${workspace.is_polling_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                    <p className={`text-sm font-semibold ${workspace.is_polling_active ? 'text-gray-900' : 'text-gray-500'}`}>
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