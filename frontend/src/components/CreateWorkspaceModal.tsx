import React, { Fragment, useState } from 'react';
import { api } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, Plus } from 'lucide-react';
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
      return toast.error("Workspace name required.");
    }
    setIsCreating(true);
    try {
      const res = await api.post<Workspace>('/workspaces/', { name });
      toast.success(`Created: ${name}`);
      onWorkspaceCreated(res.data);
      setName('');
      setIsOpen(false);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.detail || "Creation failed.");
      } else {
        toast.error("An error occurred.");
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

  const suggestions = ['Engineering', 'Marketing', 'Product', 'Sales'];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={handleClose}>
        
        {/* --- BACKDROP: Lighter, Less Heavy --- */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-2"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-md bg-white text-left align-middle shadow-lg transition-all border border-slate-200">
                
                {/* --- HEADER --- */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                  <Dialog.Title as="h3" className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    New Workspace
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-900 transition-colors"
                    onClick={handleClose}
                    disabled={isCreating}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* --- BODY --- */}
                <div className="p-6">
                  <div className="space-y-6">
                    
                    {/* Input */}
                    <div>
                      <label 
                        htmlFor="workspace-name" 
                        className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="workspace-name"
                        className={`
                          block w-full rounded-sm border border-slate-200 py-2 px-3 
                          text-slate-900 text-sm transition-all outline-none 
                          placeholder:text-slate-300
                          focus:border-slate-900 focus:ring-0
                          ${isCreating ? 'bg-slate-50 opacity-60' : 'bg-white'}
                        `}
                        placeholder="e.g. Analytics"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isCreating && name.trim() && handleCreate()}
                        disabled={isCreating}
                        autoFocus
                        autoComplete="off"
                      />
                    </div>

                    {/* Suggestions */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[10px] font-bold text-slate-300 uppercase mr-1">Suggestions:</span>
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setName(suggestion)}
                          disabled={isCreating}
                          type="button"
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors underline underline-offset-4 decoration-slate-200 hover:decoration-slate-900"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* --- ACTIONS --- */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
                    onClick={handleClose}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="
                      inline-flex items-center justify-center gap-2
                      rounded-sm 
                      bg-blue-700 
                      px-5 py-2 
                      text-[11px] font-bold text-white
                      uppercase tracking-widest
                      transition-all
                      hover:bg-blue-800
                      active:scale-[0.98]
                      disabled:opacity-50
                    "
                    onClick={handleCreate}
                    disabled={isCreating || !name.trim()}
                  >
                    {isCreating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    <span>Create</span>
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