import React, { Fragment, useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DataUpload } from '../../types';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, AlertCircle, BellRing, ChevronDown, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateAlertModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspaceId: string;
  onRuleCreated: () => void;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ isOpen, setIsOpen, workspaceId, onRuleCreated }) => {
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
        const res = await api.get<DataUpload[]>(`/workspaces/${workspaceId}/uploads`);

        const latestUpload = res.data[0];
        if (latestUpload && latestUpload.schema_info) {
          const numericCols = Object.entries(latestUpload.schema_info).reduce((acc, [col, type]) => {
            if (String(type).includes('int') || String(type).includes('float')) {
              acc.push(col);
            }
            return acc;
          }, [] as string[]);

          setAvailableColumns(numericCols);
          if (numericCols.length > 0) {
            setColumnName(numericCols[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch schema for alerts", error);
      } finally {
        setIsLoadingColumns(false);
      }
    };
    fetchLatestSchema();
  }, [isOpen, workspaceId]);

  const handleCreateRule = async () => {
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
      
      toast.success("Smart Alert created successfully!");
      onRuleCreated();
      setIsOpen(false);
    } catch (error) {
      console.log(error)
      toast.error("Failed to create alert rule.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-gray-100">
                
                {/* Header */}
                <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <BellRing className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 leading-none">
                            New Alert Rule
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 mt-1">Configure parameters to trigger notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={isSaving}
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                  {isLoadingColumns ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
                      <p className="text-sm text-gray-500">Scanning data schema...</p>
                    </div>
                  ) : availableColumns.length === 0 ? (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 mb-3 shadow-sm">
                        <AlertCircle className="w-6 h-6 text-orange-500" />
                      </div>
                      <h4 className="text-gray-900 font-medium">No Numeric Data Found</h4>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                        We couldn't find any numeric columns in your latest upload to track.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Section 1: The Target */}
                      <div>
                        <label htmlFor="column" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Target Column
                        </label>
                        <div className="relative">
                            <select
                            id="column"
                            value={columnName}
                            onChange={e => setColumnName(e.target.value)}
                            className="block w-full appearance-none rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-gray-900 focus:bg-white focus:ring-gray-900 sm:text-sm shadow-sm transition-all cursor-pointer hover:bg-gray-100 hover:border-gray-300"
                            >
                            {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 w-full" />

                      {/* Section 2: The Logic (Grid Layout) */}
                      <div className="grid grid-cols-2 gap-5">
                        
                        {/* Metric */}
                        <div>
                          <label htmlFor="metric" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Metric
                          </label>
                          <div className="relative">
                            <select
                                id="metric"
                                value={metric}
                                onChange={e => setMetric(e.target.value)}
                                className="block w-full appearance-none rounded-xl border-gray-200 px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm cursor-pointer"
                            >
                                <option value="mean">Average (Mean)</option>
                                <option value="min">Minimum</option>
                                <option value="max">Maximum</option>
                                <option value="count">Count</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Condition */}
                        <div>
                          <label htmlFor="condition" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Condition
                          </label>
                          <div className="relative">
                            <select
                                id="condition"
                                value={condition}
                                onChange={e => setCondition(e.target.value)}
                                className="block w-full appearance-none rounded-xl border-gray-200 px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm cursor-pointer"
                            >
                                <option value="greater_than">Is greater than</option>
                                <option value="less_than">Is less than</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Value Input */}
                      <div>
                        <label htmlFor="value" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Threshold Value
                        </label>
                        <div className="relative rounded-xl shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Activity className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                            type="number"
                            id="value"
                            value={value}
                            onChange={e => setValue(parseFloat(e.target.value))}
                            className="block w-full rounded-xl border-gray-200 pl-10 py-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-shadow"
                            step="any"
                            placeholder="0.00"
                            />
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-offset-1 focus:ring-gray-200 transition-all shadow-sm"
                    onClick={() => setIsOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0A3AFF] rounded-lg hover:bg-[#072FCC] active:bg-[#0627A8] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0A3AFF]/70 transition-all shadow-md shadow-[#0A3AFF]/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"

                    onClick={handleCreateRule}
                    disabled={isSaving || isLoadingColumns || availableColumns.length === 0}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Create Alert'
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