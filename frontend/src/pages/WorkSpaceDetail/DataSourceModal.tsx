import React, { Fragment, useState, useEffect } from "react";
import { api } from "../../services/api";
import { Dialog, Transition, RadioGroup, Switch } from '@headlessui/react';
import { CheckCircle2, Loader2, UploadCloud, X, Database, Globe, FileText,User, Key, BookOpen, Lock, Activity, FileSpreadsheet,AlertTriangle, Clock } from "lucide-react";
import { Workspace } from "../../types";
import toast from 'react-hot-toast';
interface DataSourceModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspace: Workspace;
  onUpdate: (data: Partial<Workspace>) => void;
  onUploadStart: () => void;
}

interface UpdatePayload {
    data_source: string;
    is_polling_active?: boolean;
    polling_interval?: string;
    api_url?: string;
    api_header_name?: string;
    api_header_value?: string;
    db_type?: string;
    db_host?: string;
    db_port?: number;
    db_user?: string;
    db_password?: string;
    db_name?: string;
    db_query?: string;
}

// --- Polling Configuration Sub-component ---
const PollingSection: React.FC<{
    pollingInterval: string;
    setPollingInterval: (val: string) => void;
    isPollingActive: boolean;
    setIsPollingActive: (val: boolean) => void;
}> = ({ pollingInterval, setPollingInterval, isPollingActive, setIsPollingActive }) => (
    <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                Auto-Sync Settings
            </h4>
        </div>

        <div className="flex items-start gap-5">
            <div className="flex-1 space-y-1">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Frequency</label>
                <div className="relative">
                    <select
                        value={pollingInterval}
                        onChange={e => setPollingInterval(e.target.value)}
                        disabled={!isPollingActive}
                        className="appearance-none w-full rounded-md border border-slate-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 py-2 pl-3 pr-8 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 transition-all font-medium"
                    >
                        <option value="30min">Every 30 Minutes</option>
                        <option value="hourly">Hourly</option>
                        <option value="3hours">Every 3 Hours</option>
                        <option value="12hours">Every 12 Hours</option>
                        <option value="daily">Daily</option>
                        
                    </select>
                    {/* Custom Arrow */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 flex items-center justify-between bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                <div className="flex flex-col pl-1">
                    <span className="text-xs font-semibold text-slate-900">Enable Sync</span>
                    <span className="text-[10px] text-slate-500">Fetch data automatically</span>
                </div>
                <Switch
                    checked={isPollingActive}
                    onChange={setIsPollingActive}
                    className={`${
                        isPollingActive ? 'bg-blue-600' : 'bg-slate-200'
                    } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                >
                    <span
                        aria-hidden="true"
                        className={`${
                            isPollingActive ? 'translate-x-4' : 'translate-x-0'
                        } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out`}
                    />
                </Switch>
            </div>
        </div>
    </div>
);

export const DataSourceModal: React.FC<DataSourceModalProps> = ({ isOpen, setIsOpen, workspace, onUpdate, onUploadStart }) => {
  const [dataSource, setDataSource] = useState(workspace.data_source || "CSV");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // API State
  const [apiUrl, setApiUrl] = useState('');
  const [pollingInterval, setPollingInterval] = useState('hourly');
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [apiHeaderName, setApiHeaderName] = useState('');
  const [apiHeaderValue, setApiHeaderValue] = useState('');
  
  // DB State
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState(5432);
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('');
  const [dbQuery, setDbQuery] = useState('SELECT * FROM your_table LIMIT 100;');
  
  const [isSaving, setIsSaving] = useState(false);
  const isAutoDisabled = !workspace.is_polling_active && workspace.last_failure_reason;
  useEffect(() => {
    if (isOpen) {
      setDataSource(workspace.data_source || 'CSV');
      setApiUrl(workspace.api_url || '');
      setPollingInterval(workspace.polling_interval || 'hourly');
      setIsPollingActive(workspace.is_polling_active || false);
      setApiHeaderName(workspace.api_header_name || ''); 
      setApiHeaderValue(''); 

      setDbHost(workspace.db_host || '');
      setDbPort(workspace.db_port || 5432);
      setDbUser(workspace.db_user || '');
      setDbPassword('');
      setDbName(workspace.db_name || '');
      setDbQuery(workspace.db_query || 'SELECT * FROM your_table LIMIT 100;');
      setSelectedFile(null);
    }
  }, [isOpen, workspace]);

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    const payload: UpdatePayload = { 
        data_source: dataSource,
        is_polling_active: isPollingActive,
        polling_interval: pollingInterval
    };
    
    if (dataSource === 'API') {
      if (!apiUrl.trim()) { setIsSaving(false); return toast.error("API URL cannot be empty."); }
      payload.api_url = apiUrl;
      if (apiHeaderName.trim()) payload.api_header_name = apiHeaderName;
      if (apiHeaderValue.trim()) payload.api_header_value = apiHeaderValue;
    } 
    else if (dataSource === 'DB') {
      if (!dbHost.trim() || !dbUser.trim() || !dbName.trim() || !dbQuery.trim()) {
        setIsSaving(false);
        return toast.error("Please fill all required database fields.");
      }
      payload.db_type = 'postgresql';
      payload.db_host = dbHost;
      payload.db_port = dbPort;
      payload.db_user = dbUser;
      if (dbPassword) payload.db_password = dbPassword;
      payload.db_name = dbName;
      payload.db_query = dbQuery;
    }
    try {
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, payload);
      onUpdate(res.data);
      if (isPollingActive) {
          onUploadStart(); 
      }
      toast.success("Configuration saved successfully!", { style: { fontSize: '13px', background: '#334155', color: '#fff' }});
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };
  
    const handleCsvUpload = async () => {
      if (!selectedFile) return toast.error("Please select a CSV file to upload.");

      // --- 🛡️ THE RENDER PROTECTOR ---
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > MAX_FILE_SIZE) {
        return toast.error("File is too large! Maximum limit is 5MB.", {
          style: { fontSize: '13px', background: '#991b1b', color: '#fff' }
        });
      }

      setIsSaving(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        // 1. Upload the file
        await api.post(`/workspaces/${workspace.id}/upload-csv`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        onUploadStart();

        // 2. Set the data source and stop polling (since CSV is static)
        const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, { 
          data_source: 'CSV', 
          is_polling_active: false 
        });

        onUpdate(res.data);
        
        toast.success("Upload successful!", { 
          style: { fontSize: '13px', background: '#334155', color: '#fff' }
        });
        
        setIsOpen(false);
      } catch (error) {
        console.error(error);
        toast.error("File upload failed.");
      } finally {
        setIsSaving(false);
      }
  };

  const dataSourceOptions = [
    { value: "CSV", label: "CSV Upload", description: "Static file ingestion", icon: FileSpreadsheet },
    { value: "API", label: "REST API", description: "External JSON endpoint", icon: Globe },
    { value: "DB", label: "PostgreSQL", description: "Direct SQL connection", icon: Database }
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 font-sans" onClose={() => !isSaving && setIsOpen(false)}>
        {/* Backdrop - Lighter blur for performance */}
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform rounded-xl bg-white shadow-xl transition-all overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
                  <div>
                      <Dialog.Title as="h3" className="text-base font-bold text-slate-900">Configure Data Source</Dialog.Title>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-tighter ${workspace.is_polling_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                           {workspace.is_polling_active ? '● Active' : isAutoDisabled ? '● Auto-Disabled' : '● Paused'}
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium">Select and configure your primary ingestion method.</p>
                  </div>
                  <button 
                      onClick={() => !isSaving && setIsOpen(false)} 
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                      <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                  <div className="space-y-6">
                    {isAutoDisabled && (
                      <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="mt-0.5">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-red-900">Polling was automatically stopped</p>
                          <p className="text-[11px] text-red-700 leading-relaxed">
                            <span className="font-bold underline">Reason:</span> {workspace.last_failure_reason}
                          </p>
                          {workspace.auto_disabled_at && (
                             <p className="text-[10px] text-red-500 flex items-center gap-1">
                               <Clock className="h-3 w-3" /> Stopped at {new Date(workspace.auto_disabled_at).toLocaleString()}
                             </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Data Source Selector - Thin borders, clean look */}
                    <RadioGroup value={dataSource} onChange={setDataSource}>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {dataSourceOptions.map((option) => (
                          <RadioGroup.Option 
                              key={option.value} 
                              value={option.value} 
                              className={({ checked }) => `${checked ? 'ring-1 ring-blue-500 bg-blue-50/20 border-blue-500/30' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'} relative flex flex-col cursor-pointer rounded-lg border p-3 transition-all focus:outline-none select-none`}
                          >
                            {({ checked }) => (
                              <>
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2.5 transition-colors ${checked ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <option.icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <RadioGroup.Label as="p" className={`font-bold text-sm mb-0.5 ${checked ? 'text-blue-900' : 'text-slate-900'}`}>
                                      {option.label}
                                  </RadioGroup.Label>
                                  <p className={`text-[10px] ${checked ? 'text-blue-700' : 'text-slate-500'}`}>
                                      {option.description}
                                  </p>
                                </div>
                                {checked && <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-blue-600" />}
                              </>
                            )}
                          </RadioGroup.Option>
                        ))}
                      </div>
                    </RadioGroup>

                    {/* DYNAMIC FORMS - Zero lag transitions */}
                    <div className="animate-in fade-in duration-200">
                        {dataSource === 'CSV' && (
                        <div>
                            {!selectedFile ? (
                                <div className="relative mt-1 flex justify-center px-6 pt-8 pb-8 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-slate-50/30 transition-all cursor-pointer group">
                                    <div className="text-center space-y-2">
                                        <div className="mx-auto w-10 h-10 bg-slate-50 group-hover:bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
                                            <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                                        </div>
                                        <div>
                                            <label htmlFor="file-upload-input" className="relative cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 focus-within:outline-none">
                                                <span>Click to upload</span>
                                                <input id="file-upload-input" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                                            </label>
                                            <p className="text-xs text-slate-500">or drag and drop CSV (Max 10MB)</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-9 h-9 bg-emerald-50 rounded-md flex items-center justify-center border border-emerald-100">
                                            <FileText className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{selectedFile.name}</p>
                                            <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-500 transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        )}

                        {dataSource === 'API' && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endpoint URL</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Globe className="h-3.5 w-3.5 text-slate-400" /></div>
                                    <input 
                                        type="url" 
                                        value={apiUrl} 
                                        onChange={e => setApiUrl(e.target.value)} 
                                        className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm font-mono text-slate-700 placeholder:text-slate-400 transition-all" 
                                        placeholder="https://api.example.com/v1/data"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lock className="h-3 w-3" /> Auth Headers (Optional)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-semibold text-slate-500">Key</label>
                                        <input 
                                            type="text" 
                                            value={apiHeaderName} 
                                            onChange={e => setApiHeaderName(e.target.value)} 
                                            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" 
                                            placeholder="Authorization"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-semibold text-slate-500">Value</label>
                                        <input 
                                            type="password" 
                                            value={apiHeaderValue} 
                                            onChange={e => setApiHeaderValue(e.target.value)} 
                                            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono" 
                                            placeholder="Bearer token..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <PollingSection pollingInterval={pollingInterval} setPollingInterval={setPollingInterval} isPollingActive={isPollingActive} setIsPollingActive={setIsPollingActive} />
                        </div>
                        )}

                        {dataSource === 'DB' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-8 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Host</label>
                                    <input type="text" value={dbHost} onChange={e => setDbHost(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white shadow-sm text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="db.example.com"/>
                                </div>
                                <div className="sm:col-span-4 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Port</label>
                                    <input type="number" value={dbPort} onChange={e => setDbPort(Number(e.target.value))} className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white shadow-sm text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="5432"/>
                                </div>
                                <div className="sm:col-span-6 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</label>
                                    <div className="relative">
                                        <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <input type="text" value={dbUser} onChange={e => setDbUser(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 bg-white shadow-sm text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="postgres"/>
                                    </div>
                                </div>
                                <div className="sm:col-span-6 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 bg-white shadow-sm text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="••••••••"/>
                                    </div>
                                </div>
                                <div className="sm:col-span-12 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Database Name</label>
                                    <div className="relative">
                                        <Database className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <input type="text" value={dbName} onChange={e => setDbName(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 bg-white shadow-sm text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="production_db"/>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-slate-400"/> SQL Query</label>
                                <textarea value={dbQuery} onChange={e => setDbQuery(e.target.value)} rows={4} className="w-full px-3 py-3 rounded-lg border border-slate-200 bg-slate-900 text-slate-200 shadow-sm font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blue-500/50 resize-y" placeholder="SELECT * FROM my_table LIMIT 100;"/>
                            </div>
                            <PollingSection pollingInterval={pollingInterval} setPollingInterval={setPollingInterval} isPollingActive={isPollingActive} setIsPollingActive={setIsPollingActive} />
                        </div>
                        )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 px-4 pb-4 bg-white">
                  {/* SECONDARY: Neutral and low-pressure */}
                  <button 
                    type="button" 
                    onClick={() => !isSaving && setIsOpen(false)} 
                    disabled={isSaving}
                    className="
                      w-full sm:w-auto 
                      px-5 py-2 
                      text-[11px] font-bold text-slate-400 font-manrope tracking-widest
                      hover:text-slate-900 hover:bg-slate-100 hover:bg-black/5
                      rounded-sm transition-all
                      disabled:opacity-20
                    "
                  >
                    Cancel
                  </button>

                  {/* PRIMARY: SaaS Blue - The Growth Action (Heart of DataPulse) */}
                  {dataSource === 'CSV' ? (
                    <button 
                      type="button" 
                      onClick={handleCsvUpload} 
                      disabled={isSaving || !selectedFile}
                      className="
                        w-full sm:w-auto 
                        min-w-[160px] 
                        bg-blue-600 hover:bg-blue-700 
                        px-6 py-2.5 
                        text-[11px] font-bold text-white font-manrope tracking-widest 
                        rounded-sm shadow-sm 
                        transition-all active:scale-[0.98]
                        disabled:opacity-20 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                      "
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      <span>{isSaving ? 'Uploading...' : 'Upload & Process'}</span>
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleSaveConfiguration} 
                      disabled={isSaving}
                      className="
                        w-full sm:w-auto 
                        min-w-[160px] 
                        bg-blue-600 hover:bg-blue-700 
                        px-6 py-2.5 
                        text-[11px] font-bold text-white font-manrope tracking-widest 
                        rounded-sm shadow-sm 
                        transition-all active:scale-[0.98]
                        disabled:opacity-20 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                      "
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                  )}
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};