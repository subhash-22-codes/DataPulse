import React, { Fragment, useState } from 'react';
import { api } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, LayoutGrid, Sparkles  } from 'lucide-react';
import toast from 'react-hot-toast';
import { Workspace } from '../types';
import { AxiosError } from "axios";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onWorkspaceCreated: (newWorkspace: Workspace) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, setIsOpen, onWorkspaceCreated }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      return toast.error("Workspace name cannot be empty.");
    }
    setIsCreating(true);
    try {
      const res = await api.post<Workspace>('/workspaces/', { name });
      
      toast.success(`Workspace '${name}' created!`);
      onWorkspaceCreated(res.data);
      setName('');
      setIsOpen(false);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.detail || "Failed to create workspace.");
      } else {
        toast.error("Failed to create workspace.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setIsOpen(false);
    }
  };

  const suggestions = ['Engineering', 'Q4 Marketing', 'Product Analytics', 'Sales Data'];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        
        {/* Overlay - No Blur for max performance */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-gray-100">
                
                {/* --- HEADER --- */}
                <div className="px-6 pt-6 pb-4 flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200 shadow-sm">
                            <LayoutGrid className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                            <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 leading-6">
                                New Workspace
                            </Dialog.Title>
                            <p className="mt-1 text-xs text-gray-500">
                                Create a dedicated space for your data & team.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        onClick={handleClose}
                        disabled={isCreating}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* --- BODY --- */}
                <div className="px-6 py-2">
                  <div className="space-y-5">
                    
                    {/* Input Field */}
                    <div>
                      <label htmlFor="workspace-name" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        id="workspace-name"
                        className={`block w-full rounded-xl border-gray-300 py-3 px-4 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 sm:text-sm transition-all outline-none ${
                          isCreating ? 'bg-gray-50 opacity-70 cursor-wait' : 'bg-white'
                        }`}
                        placeholder="Ex: Engineering Team"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isCreating && name.trim() && handleCreate()}
                        disabled={isCreating}
                        autoFocus
                        autoComplete="off"
                      />
                    </div>

                    {/* Quick Suggestions */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <p className="text-xs font-semibold text-gray-500">Suggestions</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setName(suggestion)}
                            disabled={isCreating}
                            type="button"
                            className="inline-flex items-center rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 transition-all active:scale-95"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="mt-6 bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none transition-all"
                    onClick={handleClose}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-70"
                    onClick={handleCreate}
                    disabled={isCreating || !name.trim()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <span>Create</span>
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