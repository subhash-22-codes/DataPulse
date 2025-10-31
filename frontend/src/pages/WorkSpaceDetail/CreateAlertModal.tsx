import React, { Fragment, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DataUpload } from '../../types';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateAlertModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspaceId: string;
  onRuleCreated: () => void; // Function to refresh the list in the parent
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ isOpen, setIsOpen, workspaceId, onRuleCreated }) => {
  const { token } = useAuth();
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
        const res = await api.get<DataUpload[]>(`/workspaces/${workspaceId}/uploads`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
  }, [isOpen, workspaceId, token]);

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
      await api.post('/alerts/', payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Smart Alert created successfully!");
      onRuleCreated(); // Tell the parent to refresh its list
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
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-900/50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                <div className="border-b border-gray-200 px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                        Create Smart Alert
                      </Dialog.Title>
                      <p className="text-sm text-gray-600 mt-1.5">
                        Get notified when your data hits a specific threshold
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      disabled={isSaving}
                      className="ml-3 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5">
                  {isLoadingColumns ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                    </div>
                  ) : availableColumns.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
                        <AlertCircle className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 max-w-xs mx-auto">
                        No numeric columns found in your latest data upload to create an alert for
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="column" className="block text-sm font-medium text-gray-800 mb-2">
                          Column
                        </label>
                        <select
                          id="column"
                          value={columnName}
                          onChange={e => setColumnName(e.target.value)}
                          className="block w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                        >
                          {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="metric" className="block text-sm font-medium text-gray-800 mb-2">
                          Metric
                        </label>
                        <select
                          id="metric"
                          value={metric}
                          onChange={e => setMetric(e.target.value)}
                          className="block w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                        >
                          <option value="mean">Average (mean)</option>
                          <option value="min">Minimum</option>
                          <option value="max">Maximum</option>
                          <option value="count">Count</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="condition" className="block text-sm font-medium text-gray-800 mb-2">
                          Condition
                        </label>
                        <select
                          id="condition"
                          value={condition}
                          onChange={e => setCondition(e.target.value)}
                          className="block w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                        >
                          <option value="greater_than">is greater than</option>
                          <option value="less_than">is less than</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="value" className="block text-sm font-medium text-gray-800 mb-2">
                          Value
                        </label>
                        <input
                          type="number"
                          id="value"
                          value={value}
                          onChange={e => setValue(parseFloat(e.target.value))}
                          className="block w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                          step="any"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setIsOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    onClick={handleCreateRule}
                    disabled={isSaving || isLoadingColumns || availableColumns.length === 0}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
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