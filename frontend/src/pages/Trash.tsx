import React, { useEffect, useState, Fragment } from 'react';
import { api } from '../services/api';
import { Workspace } from '../types';
import { Dialog, Transition } from '@headlessui/react'; // Using Headless UI for the modal
import { 
  Trash2, 
  RotateCcw, 
  Loader2, 
  AlertOctagon, 
  Calendar, 
  Archive,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const Trash: React.FC = () => {
  const navigate = useNavigate();
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Action States
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  
  // Modal States for "Delete Forever"
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- 1. FETCH DATA ---
  const fetchTrash = async () => {
    try {
      const response = await api.get<Workspace[]>('/workspaces/trash');
      setDeletedWorkspaces(response.data);
    } catch (error) {
      console.error("Failed to fetch trash", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  // --- 2. RESTORE ACTION ---
  const handleRestore = async (workspaceId: string) => {
    setIsRestoring(workspaceId);
    try {
      await api.post(`/workspaces/${workspaceId}/restore`);
      toast.success("Workspace restored.", { position: 'bottom-center' });
      setDeletedWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    } catch (error) {
      console.error(error);
      toast.error("Restore failed.");
    } finally {
      setIsRestoring(null);
    }
  };

  // --- 3. DELETE FOREVER (Open Modal) ---
  const openDeleteModal = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteModalOpen(true);
  };

  // --- 4. CONFIRM DELETE (API Call) ---
  const confirmDeleteForever = async () => {
    if (!selectedWorkspace) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/workspaces/${selectedWorkspace.id}/permanently`);
      toast.success("Permanently deleted.", { position: 'bottom-center', icon: '🗑️' });
      setDeletedWorkspaces(prev => prev.filter(w => w.id !== selectedWorkspace.id));
      setDeleteModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Delete failed.");
    } finally {
      setIsDeleting(false);
      setSelectedWorkspace(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      
      {/* --- HEADER: Minimal & Functional --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gray-400" />
            Trash
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Items are retained for 30 days before permanent removal.
          </p>
        </div>
        <button 
           onClick={() => navigate('/home')}
           className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </button>
      </div>

      {/* --- EMPTY STATE: Clean, No Cartoons --- */}
      {deletedWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          <Archive className="w-10 h-10 text-gray-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-900">Trash is empty</p>
          <p className="text-xs text-gray-500 mt-1">No deleted items found.</p>
        </div>
      ) : (
        /* --- LIST LAYOUT (Table for Desktop, Stack for Mobile) --- */
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {deletedWorkspaces.map((workspace) => (
              <li key={workspace.id} className="group hover:bg-gray-50 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-4">
                  
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {workspace.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
                        Deleted
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {workspace.deleted_at ? new Date(workspace.deleted_at).toLocaleDateString() : 'Unknown'}
                      </div>
                      <span className="hidden sm:inline text-gray-300">|</span>
                      <p className="truncate max-w-[200px] sm:max-w-md">
                        {workspace.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 mt-2 sm:mt-0">
                    <button
                      onClick={() => handleRestore(workspace.id)}
                      disabled={!!isRestoring}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-gray-900 focus:outline-none transition-all"
                    >
                      {isRestoring === workspace.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Restore
                    </button>
                    
                    <button
                      onClick={() => openDeleteModal(workspace)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-transparent rounded hover:bg-red-100 hover:text-red-800 transition-all"
                    >
                      Delete Forever
                    </button>
                  </div>

                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- PROFESSIONAL DELETE MODAL --- */}
      <Transition appear show={deleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isDeleting && setDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" />
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
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all border border-red-100">
                  
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertOctagon className="w-5 h-5 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Dialog.Title as="h3" className="text-base font-semibold text-gray-900">
                        Delete permanently?
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 leading-relaxed">
                          You are about to delete <span className="font-semibold text-gray-900">"{selectedWorkspace?.name}"</span>. 
                          <br/><br/>
                          This action is <span className="font-semibold text-red-600">irreversible</span>. All data, files, and chat history will be lost forever.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setDeleteModalOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={confirmDeleteForever}
                      disabled={isDeleting}
                    >
                      {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Yes, delete forever
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
};