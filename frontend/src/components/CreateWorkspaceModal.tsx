import React, { Fragment, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Workspace } from '../types';
import { AxiosError } from "axios";


interface CreateWorkspaceModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onWorkspaceCreated: (newWorkspace: Workspace) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, setIsOpen, onWorkspaceCreated }) => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      return toast.error("Workspace name cannot be empty.");
    }
    setIsCreating(true);
    try {
      const res = await api.post<Workspace>('/workspaces/', { name }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    }
 finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setIsOpen(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-lg transition-all">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                      Create New Workspace
                    </Dialog.Title>
                    <button
                      onClick={handleClose}
                      disabled={isCreating}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Set up a new workspace to organize your projects
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div>
                    <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace Name
                    </label>
                    <input
                      id="workspace-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter workspace name..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                      onKeyPress={(e) => e.key === 'Enter' && !isCreating && name.trim() && handleCreate()}
                      disabled={isCreating}
                      autoFocus
                    />
                  </div>
                  
                  {/* Quick suggestions */}
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Marketing Analytics', 'Sales Dashboard', 'Product Metrics'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setName(suggestion)}
                          disabled={isCreating}
                          className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isCreating || !name.trim()}
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 min-w-[100px] flex items-center justify-center"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4 mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Workspace'
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