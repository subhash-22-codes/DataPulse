import React, { useState } from "react";
import { Database, Globe, Clock, Power, PowerOff, FileText, Upload, Server } from "lucide-react";
import { Workspace, DataUpload } from "../../types";
import { DataSourceModal } from "./DataSourceModal";
import { EmptyState } from "../../components/EmptyState";
import { FormattedDate } from "../../components/FormattedDate";

interface DataSourceCardProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdate: (data: Partial<Workspace>) => void;
  onUploadStart: () => void;
  lastUpload: DataUpload | null;
}

export const DataSourceCard: React.FC<DataSourceCardProps> = ({ workspace, isOwner, onUpdate, onUploadStart, lastUpload }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
        <div className="bg-gradient-to-r from-blue-50 to-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Data Source
            </h2>
            {isOwner && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-offset-2"
              >
                Configure
              </button>
            )}
          </div>
        </div>

        <div className="p-6 min-h-[280px] flex flex-col items-center justify-center">
          {!workspace.data_source ? (
            <EmptyState
              Icon={Database}
              title="No Data Source"
              message="Connect a data source like a CSV, API, or Database to start monitoring."
              actionText={isOwner ? "Configure Now" : undefined}
              onAction={isOwner ? () => setIsModalOpen(true) : undefined}
            />
          ) : (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-center mb-6">
                {workspace.data_source === 'CSV' && <FileText className="h-4 w-4 text-blue-600" />}
                {workspace.data_source === 'API' && <Globe className="h-4 w-4 text-blue-600" />}
                {workspace.data_source === 'DB' && <Server className="h-4 w-4 text-blue-600" />}
                <span className="ml-2 text-blue-600 font-semibold">{workspace.data_source}</span>
              </div>          
               {workspace.data_source === 'CSV' && (
                // If a manual upload exists, show its details
                lastUpload && lastUpload.upload_type === 'manual' ? (
                  <div className="mt-6 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-left">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Last Upload</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">File Name</p>
                            <p className="font-mono text-sm text-gray-900 break-all">{lastUpload.file_path.split(/[/\\]/).pop()}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Uploaded At</p>
                            <p className="text-sm text-gray-900"><FormattedDate dateString={lastUpload.uploaded_at} /></p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-lg font-medium transition-colors">
                        <Upload className="h-4 w-4" />
                        Upload New CSV
                      </button>
                    )}
                  </div>
                ) : (
                  // Otherwise, show the guided empty state
                  <div className="mt-6">
                    <EmptyState 
                      Icon={Upload} 
                      title="No CSVs Uploaded" 
                      message="Upload your first CSV file to begin analysis." 
                      actionText={isOwner ? "Upload Now" : undefined} 
                      onAction={isOwner ? () => setIsModalOpen(true) : undefined} 
                    />
                  </div>
                )
              )}

              {workspace.data_source === 'API' && workspace.api_url && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                        {workspace.is_polling_active ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            <Power className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                            <PowerOff className="h-3.5 w-3.5" />
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">Endpoint</p>
                          <p className="font-mono text-sm text-gray-900 break-all">{workspace.api_url}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Polling Frequency</p>
                          <p className="text-sm text-gray-900 font-medium">{workspace.polling_interval}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {workspace.data_source === 'DB' && workspace.db_host && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                        {workspace.is_polling_active ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            <Power className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                            <PowerOff className="h-3.5 w-3.5" />
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-3">
                        <Server className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">Database Host</p>
                          <p className="font-mono text-sm text-gray-900 break-all">{workspace.db_host}:{workspace.db_port}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Polling Frequency</p>
                          <p className="text-sm text-gray-900 font-medium">{workspace.polling_interval}</p>
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
