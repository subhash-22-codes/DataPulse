import React, { Fragment, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Dialog, Transition, RadioGroup, Switch } from '@headlessui/react';
import { CheckCircle2, Loader2, UploadCloud, X, Database, Globe, FileText, Info, Server, User, Key, BookOpen, Lock } from "lucide-react";
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
    // --- NEW: API Authentication Fields ---
    api_header_name?: string;
    api_header_value?: string;
    // --------------------------------------
    db_type?: string;
    db_host?: string;
    db_port?: number;
    db_user?: string;
    db_password?: string;
    db_name?: string;
    db_query?: string;
}

// --- A reusable sub-component for the polling configuration ---
const PollingSection: React.FC<{
    pollingInterval: string;
    setPollingInterval: (val: string) => void;
    isPollingActive: boolean;
    setIsPollingActive: (val: boolean) => void;
}> = ({ pollingInterval, setPollingInterval, isPollingActive, setIsPollingActive }) => (
    <div className="space-y-4 pt-5 border-t border-gray-200">
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Polling Frequency</label>
            <select
                value={pollingInterval}
                onChange={e => setPollingInterval(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-400 px-4 py-2.5 text-sm"
            >
                <option value="every_minute">Every Minute (for testing)</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Every Day</option>
            </select>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
            <Switch.Group as="div" className="flex items-start justify-between gap-4">
                <span className="flex-grow flex flex-col">
                    <Switch.Label as="span" className="text-sm font-semibold text-gray-900 mb-1" passive>
                        Enable Automatic Polling
                    </Switch.Label>
                    <Switch.Description as="span" className="text-xs leading-relaxed text-gray-600">
                        Automatically fetch fresh data based on your selected schedule.
                    </Switch.Description>
                </span>
                <Switch
                    checked={isPollingActive}
                    onChange={setIsPollingActive}
                    className={`${
                        isPollingActive ? 'bg-blue-600' : 'bg-gray-300'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-offset-2`}
                >
                    <span
                        aria-hidden="true"
                        className={`${
                            isPollingActive ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-all duration-200 ease-in-out`}
                    />
                </Switch>
            </Switch.Group>
        </div>
    </div>
);


export const DataSourceModal: React.FC<DataSourceModalProps> = ({ isOpen, setIsOpen, workspace, onUpdate, onUploadStart }) => {
  const { token } = useAuth();
  const [dataSource, setDataSource] = useState(workspace.data_source || "CSV");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // API State
  const [apiUrl, setApiUrl] = useState('');
  const [pollingInterval, setPollingInterval] = useState('hourly');
  const [isPollingActive, setIsPollingActive] = useState(false);
  // --- NEW: API Key State ---
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

  useEffect(() => {
    if (isOpen) {
      setDataSource(workspace.data_source || 'CSV');
      setApiUrl(workspace.api_url || '');
      setPollingInterval(workspace.polling_interval || 'hourly');
      setIsPollingActive(workspace.is_polling_active || false);
      // Initialize API Header Name (Value is kept secret/empty)
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
      // --- Include Auth Fields if provided ---
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
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate(res.data);
      toast.success("Configuration saved successfully!");
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
    setIsSaving(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await api.post(`/workspaces/${workspace.id}/upload-csv`, formData, { headers: { Authorization: `Bearer ${token}` } });
      onUploadStart();
      const res = await api.put<Workspace>(`/workspaces/${workspace.id}`, { data_source: 'CSV', is_polling_active: false }, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate(res.data);
      toast.success("Upload successful! Processing has started.");
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("File upload failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const dataSourceOptions = [
    { value: "CSV", label: "CSV File", description: "Upload a comma-separated file", icon: FileText },
    { value: "API", label: "API Connection", description: "Connect to an external REST API", icon: Globe },
    { value: "DB", label: "Database", description: "Connect to your SQL database", icon: Database }
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !isSaving && setIsOpen(false)}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform rounded-xl bg-white shadow-xl overflow-hidden">
                <div className="relative px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <button onClick={() => !isSaving && setIsOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
                  <div className="pr-10">
                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">Configure Data Source</Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">Choose your preferred data ingestion method.</p>
                  </div>
                </div>

                <div className="px-6 py-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <div className="space-y-6">
                    <div>
                      <RadioGroup value={dataSource} onChange={setDataSource}>
                        <RadioGroup.Label className="text-sm font-semibold text-gray-900 mb-3 block">Data Source Type</RadioGroup.Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {dataSourceOptions.map((option) => (
                            <RadioGroup.Option key={option.value} value={option.value} className={({ checked }) => `${checked ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'} relative flex cursor-pointer rounded-lg border-2 p-4 focus:outline-none`}>
                              {({ checked }) => (
                                <div className="flex flex-col w-full">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${checked ? 'bg-blue-500' : 'bg-gray-100'}`}><option.icon className={`h-5 w-5 ${checked ? 'text-white' : 'text-gray-600'}`} /></div>
                                    {checked && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                                  </div>
                                  <div className="text-left mt-auto">
                                    <RadioGroup.Label as="p" className="font-semibold text-sm text-gray-900 mb-1">{option.label}</RadioGroup.Label>
                                    <p className="text-xs text-gray-600 leading-relaxed">{option.description}</p>
                                  </div>
                                </div>
                              )}
                            </RadioGroup.Option>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {dataSource === 'CSV' && (
                      <div className="pt-5 border-t border-gray-200 space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-3">Upload CSV File</label>
                          <div className="mt-2 flex justify-center px-6 pt-6 pb-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 bg-gray-50 transition-colors cursor-pointer">
                            <div className="text-center space-y-2">
                              <div className="mx-auto w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200"><UploadCloud className="h-6 w-6 text-gray-400" /></div>
                              <div>
                                <div className="flex text-sm text-gray-600 justify-center items-center gap-1">
                                  <label htmlFor="file-upload-input" className="relative cursor-pointer font-semibold text-blue-600 hover:text-blue-700 focus-within:outline-none rounded px-1"><span>Choose a file</span><input id="file-upload-input" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} /></label>
                                  <span>or drag and drop</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">CSV files only</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {selectedFile && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-green-200"><FileText className="h-5 w-5 text-green-600" /></div>
                                <div>
                                  <span className="text-sm font-semibold text-green-900 block">{selectedFile.name}</span>
                                  <span className="text-xs text-green-700">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                                </div>
                              </div>
                              <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-green-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"><X className="h-4 w-4 text-green-700" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {dataSource === 'API' && (
                      <div className="pt-5 border-t border-gray-200 space-y-5">
                        {workspace.is_polling_active && workspace.data_source === 'API' && <div className="p-4 rounded-lg flex items-start space-x-3 border border-blue-200 bg-blue-50"><div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0"><Info className="h-5 w-5 text-white" /></div><div className="text-sm text-left flex-1"><p className="font-semibold text-blue-900 mb-1">Active Polling Detected</p><p className="text-blue-800 leading-relaxed">Polling is currently active. To modify settings, disable the toggle, save, then reopen this modal.</p></div></div>}
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-900">API Endpoint URL</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Globe className="h-5 w-5 text-gray-400" /></div>
                            <input type="url" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-400 text-sm" placeholder="https://api.example.com/v1/data"/>
                          </div>
                        </div>

                        {/* --- NEW: Authentication Section --- */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <Lock className="h-4 w-4 text-gray-500" /> Authentication (Optional)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-700">Header Name</label>
                                    <input 
                                        type="text" 
                                        value={apiHeaderName} 
                                        onChange={e => setApiHeaderName(e.target.value)} 
                                        className="w-full px-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm text-sm" 
                                        placeholder="Authorization"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-700">Header Value</label>
                                    <input 
                                        type="password" 
                                        value={apiHeaderValue} 
                                        onChange={e => setApiHeaderValue(e.target.value)} 
                                        className="w-full px-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm text-sm" 
                                        placeholder="Bearer sk_..."
                                    />
                                </div>
                            </div>
                        </div>
                        {/* ----------------------------------- */}

                        <PollingSection pollingInterval={pollingInterval} setPollingInterval={setPollingInterval} isPollingActive={isPollingActive} setIsPollingActive={setIsPollingActive} />
                      </div>
                    )}

                    {dataSource === 'DB' && (
                      <div className="pt-5 border-t border-gray-200 space-y-5">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-4">Connection Details</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="block text-xs font-semibold text-gray-700">Host</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Server className="h-4 w-4 text-gray-400" /></div><input type="text" value={dbHost} onChange={e => setDbHost(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm" placeholder="db.example.com"/></div></div>
                            <div className="space-y-2"><label className="block text-xs font-semibold text-gray-700">Port</label><input type="number" value={dbPort} onChange={e => setDbPort(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm" placeholder="5432"/></div>
                            <div className="space-y-2"><label className="block text-xs font-semibold text-gray-700">Username</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-gray-400" /></div><input type="text" value={dbUser} onChange={e => setDbUser(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm" placeholder="readonly_user"/></div></div>
                            <div className="space-y-2"><label className="block text-xs font-semibold text-gray-700">Password</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key className="h-4 w-4 text-gray-400" /></div><input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm" placeholder="password"/></div></div>
                            <div className="sm:col-span-2 space-y-2"><label className="block text-xs font-semibold text-gray-700">Database Name</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Database className="h-4 w-4 text-gray-400" /></div><input type="text" value={dbName} onChange={e => setDbName(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg border-gray-300 bg-white shadow-sm" placeholder="production_db"/></div></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-900">SQL Query</label>
                          <div className="relative">
                            <div className="absolute left-0 top-3 pl-3 pointer-events-none"><BookOpen className="h-4 w-4 text-gray-400" /></div>
                            <textarea value={dbQuery} onChange={e => setDbQuery(e.target.value)} rows={5} className="w-full pl-10 pr-3 py-2.5 rounded-lg border-gray-300 bg-white shadow-sm font-mono text-sm leading-relaxed" placeholder="SELECT * FROM my_table WHERE created_at > NOW() - INTERVAL '1 day';"/>
                          </div>
                        </div>
                        <PollingSection pollingInterval={pollingInterval} setPollingInterval={setPollingInterval} isPollingActive={isPollingActive} setIsPollingActive={setIsPollingActive} />
                      </div>
                    )}

                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                  <button type="button" className="px-4 py-2 text-sm font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-100" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</button>
                  {dataSource === 'CSV' ? (
                      <button type="button" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2" onClick={handleCsvUpload} disabled={isSaving || !selectedFile}>
                          {isSaving ? <><Loader2 className="animate-spin h-5 w-5"/><span>Uploading...</span></> : 'Save & Upload'}
                      </button>
                  ) : (
                      <button type="button" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2" onClick={handleSaveConfiguration} disabled={isSaving}>
                          {isSaving ? <><Loader2 className="animate-spin h-5 w-5"/><span>Saving...</span></> : 'Save Configuration'}
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