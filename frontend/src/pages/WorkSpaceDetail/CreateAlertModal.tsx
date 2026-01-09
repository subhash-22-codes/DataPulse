import React, { Fragment, useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, ChevronDown, Hash, GitCompare, Terminal, Plus, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios'; 

interface CreateAlertModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspaceId: string;
  onRuleCreated: () => void;
  activeAlertsCount: number;
}

interface SchemaResponse {
  schema: Record<string, string>; // e.g., { "Eggs_count": "int64" }
  has_data: boolean;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ isOpen, setIsOpen, workspaceId, onRuleCreated, activeAlertsCount }) => {
  const [columnName, setColumnName] = useState('');
  const [metric, setMetric] = useState('mean');
  const [condition, setCondition] = useState('greater_than');
  const [value, setValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // State for the dynamic column dropdown
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLatestSchema = async () => {
      setIsLoadingColumns(true);
      try {
          const res = await api.get<SchemaResponse>(`/workspaces/${workspaceId}/schema`);
          console.log("Response Data:", res.data);

          // 1. Access the 'schema' key directly from the response object
          const schema = res.data.schema; 

          if (schema) {
            // 2. Map through the entries of that schema object
            const numericCols = Object.entries(schema).reduce((acc, [col, type]) => {
              const typeStr = String(type).toLowerCase();
              
              // 3. Robust check for int/float
              if (typeStr.includes('int') || typeStr.includes('float')) {
                acc.push(col);
              }
              return acc;
            }, [] as string[]);

            console.log("Final Numeric Columns:", numericCols);
            setAvailableColumns(numericCols);
            
            if (numericCols.length > 0) {
              setColumnName(numericCols[0]);
            }
          }
        }catch (error) {
        console.error("Failed to fetch schema for alerts", error);
      } finally {
        setIsLoadingColumns(false);
      }
    };
    fetchLatestSchema();
  }, [isOpen, workspaceId]);

  const handleCreateRule = async () => {
    if (activeAlertsCount >= 10) {
      toast.error("Limit reached: Maximum 10 active alerts allowed.", {
        style: { fontSize: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        column_name: columnName,
        metric,
        condition,
        value,
      };
      await api.post('/alerts/', payload);
      
      toast.success("Alert rule created", {
         style: { fontSize: '13px', background: '#334155', color: '#fff', borderRadius: '4px' }
      });
      onRuleCreated();
      setIsOpen(false);
    } catch (error: unknown) {
        let errorMessage = "Failed to create alert rule";

        // This is the "Type Guard" that makes the linter happy
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.detail || errorMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        toast.error(errorMessage, {
            style: { 
                fontSize: '12px', 
                background: '#fee2e2', 
                color: '#991b1b', 
                border: '1px solid #fecaca' 
            }
        });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 font-sans" onClose={() => !isSaving && setIsOpen(false)}>
        {/* Backdrop: Darker, more professional dimming */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-[440px] transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-2xl transition-all border border-slate-200">
                
                {/* Header: Minimalist, Text-First */}
                <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between bg-white">
                  <div>
                      <Dialog.Title as="h3" className="text-sm font-semibold text-slate-900 leading-none">
                          Create Alert Rule
                      </Dialog.Title>
                  </div>
                  <button
                    onClick={() => !isSaving && setIsOpen(false)}
                    disabled={isSaving}
                    className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all focus:outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-5 py-6 bg-white">
                  {isLoadingColumns ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                      <p className="text-xs text-slate-500 font-medium">Analyzing schema...</p>
                    </div>
                  ) : availableColumns.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white border border-slate-200 mb-2 shadow-sm">
                        <Table2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <h4 className="text-slate-900 font-medium text-xs">No Numeric Data</h4>
                      <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto mt-1 leading-relaxed">
                        Alerts require numeric columns (Integer/Float). None were found in your dataset.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5 animate-in fade-in duration-300">
                      
                      {/* Section 1: The Target */}
                      <div>
                        <label htmlFor="column" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Target Column
                        </label>
                        <div className="relative group">
                            <select
                            id="column"
                            value={columnName}
                            onChange={e => setColumnName(e.target.value)}
                            className="block w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm font-medium focus:border-slate-400 focus:ring-4 focus:ring-slate-100 shadow-sm transition-all cursor-pointer"
                            >
                            {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Section 2: Logic Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        
                        {/* Metric */}
                        <div>
                          <label htmlFor="metric" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Hash className="w-3 h-3" /> Metric
                          </label>
                          <div className="relative group">
                            <select
                                id="metric"
                                value={metric}
                                onChange={e => setMetric(e.target.value)}
                                className="block w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm font-medium focus:border-slate-400 focus:ring-4 focus:ring-slate-100 shadow-sm transition-all cursor-pointer"
                            >
                                <option value="mean">Average</option>
                                <option value="50%">Median (50th %)</option>
                                <option value="min">Minimum</option>
                                <option value="max">Maximum</option>
                                <option value="count">Count</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Condition */}
                        <div>
                          <label htmlFor="condition" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <GitCompare className="w-3 h-3" /> Condition
                          </label>
                          <div className="relative group">
                            <select
                                id="condition"
                                value={condition}
                                onChange={e => setCondition(e.target.value)}
                                className="block w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm font-medium focus:border-slate-400 focus:ring-4 focus:ring-slate-100 shadow-sm transition-all cursor-pointer"
                            >
                                <option value="greater_than">Greater than</option>
                                <option value="less_than">Less than</option>
                                <option value="equals">Equal to</option>
                                <option value="not_equals">Not equal</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Value Input */}
                      <div>
                        <label htmlFor="value" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" /> Threshold Value
                        </label>
                        <div className="relative">
                            <input
                            type="number"
                            id="value"
                            value={value}
                            onChange={e => setValue(parseFloat(e.target.value))}
                            className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm font-mono focus:border-slate-400 focus:ring-4 focus:ring-slate-100 shadow-sm transition-all placeholder:text-slate-300"
                            step="any"
                            placeholder="0.00"
                            />
                        </div>
                      </div>

                    </div>
                  )}
                </div>
                {/* Usage Indicator */}
                <div className="mb-2 ml-3 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-500">
                    Limit
                  </span>

                  <span
                    className={`text-[10px] font-semibold tabular-nums ${
                      activeAlertsCount >= 9
                        ? 'text-amber-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {activeAlertsCount}/10
                  </span>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 px-4 pb-4 bg-white">
                  {/* SECONDARY: Minimal and safe */}
                  <button
                    type="button"
                    onClick={() => !isSaving && setIsOpen(false)}
                    disabled={isSaving}
                    className="
                      w-full sm:w-auto 
                      px-5 py-2 
                      text-[11px] font-bold text-slate-500 font-manrope tracking-widest
                      hover:text-slate-900 hover:bg-slate-100 
                      rounded-sm transition-all
                      disabled:opacity-20
                    "
                  >
                    Cancel
                  </button>

                  {/* PRIMARY: SaaS Blue - Growth Action */}
                  <button
                    type="button"
                    onClick={handleCreateRule}
                    disabled={isSaving || isLoadingColumns || availableColumns.length === 0 || activeAlertsCount >= 10}
                    className="
                      w-full sm:w-auto 
                      min-w-[140px] 
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
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Rule</span>
                      </>
                    )}
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};