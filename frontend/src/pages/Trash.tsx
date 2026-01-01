import React, { useEffect, useState, Fragment } from 'react';
import { api } from '../services/api';
import { Workspace } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import { 
  Trash2, 
  RotateCcw, 
  Loader2, 
  AlertOctagon, 
  Calendar, 
  Archive,
  ArrowLeft,
  Info,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const Trash: React.FC = () => {
  const navigate = useNavigate();
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTrash = async () => {
    try {
      const [trashRes, workspacesRes] = await Promise.all([
        api.get<Workspace[]>('/workspaces/trash'),
        api.get<Workspace[]>('/workspaces')
      ]);
      setDeletedWorkspaces(trashRes.data);
      setActiveCount(workspacesRes.data.length);
    } catch (error) {
      console.error("Fetch failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (workspaceId: string) => {
    setIsRestoring(workspaceId);
    try {
      await api.post(`/workspaces/${workspaceId}/restore`);
      toast.success("Workspace restored");
      setDeletedWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      setActiveCount(prev => prev + 1);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        toast.error("Plan limit reached. Delete an active workspace first.");
      } else {
        toast.error("Restoration failed");
      }
    } finally {
      setIsRestoring(null);
    }
  };

  const openDeleteModal = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteModalOpen(true);
  };

  const confirmDeleteForever = async () => {
    if (!selectedWorkspace) return;
    setIsDeleting(true);
    try {
      await api.delete(`/workspaces/${selectedWorkspace.id}/permanently`);
      toast.success("Deleted permanently");
      setDeletedWorkspaces(prev => prev.filter(w => w.id !== selectedWorkspace.id));
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Deletion failed", error);
      toast.error("Deletion failed");
    } finally {
      setIsDeleting(false);
      setSelectedWorkspace(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        <span className="text-[11px] font-medium text-slate-400">Loading trash...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 relative z-10">
      
      {/* --- NAVIGATION --- */}
      <button 
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 text-[12px] font-semibold text-slate-400 hover:text-slate-900 transition-colors mb-8 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
        Back to Home
      </button>

      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trash</h1>
          <p className="text-[13px] text-slate-500 mt-1 font-medium leading-relaxed">
            Resources are kept for 30 days before they are permanently deleted.
          </p>
        </div>

        {/* --- MINIMAL QUOTA INDICATOR --- */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors ${activeCount >= 3 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
          <Info className={`w-3.5 h-3.5 ${activeCount >= 3 ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className="text-[11px] font-bold uppercase tracking-tight">
             Usage: {activeCount} / 3 active
          </span>
        </div>
      </div>

      {/* --- FORMAL DISCLAIMER (ONLY SHOWS WHEN 3/3) --- */}
      {activeCount >= 3 && deletedWorkspaces.length > 0 && (
        <div className="mb-8 flex items-center gap-3 px-4 py-3 bg-white border border-amber-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[12px] font-medium text-slate-600">
            <span className="font-bold text-slate-900">Capacity Full:</span> Delete an active workspace to enable the restoration of items from trash.
          </p>
        </div>
      )}

      {/* --- CONTENT --- */}
      {deletedWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border border-slate-100 rounded-lg">
          <Archive className="w-8 h-8 text-slate-200 mb-2" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-900">No items in trash</p>
          <p className="text-xs text-slate-400 mt-0.5">Your deleted workspaces will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-50">
            {deletedWorkspaces.map((workspace) => (
              <div key={workspace.id} className="group p-5 sm:p-6 transition-colors hover:bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-[14px] font-semibold text-slate-900 truncate">
                        {workspace.name}
                      </h3>
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase border border-red-100/50">
                        Deleted
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                        {workspace.deleted_at ? new Date(workspace.deleted_at).toLocaleDateString() : 'Date unknown'}
                      </span>
                      <p className="truncate opacity-80 italic">
                        {workspace.description || "No description provided"}
                      </p>
                    </div>
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <button
                      onClick={() => handleRestore(workspace.id)}
                      disabled={!!isRestoring || activeCount >= 3}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm"
                    >
                      {isRestoring === workspace.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Restore
                    </button>
                    
                    <button
                      onClick={() => openDeleteModal(workspace)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="Delete Forever"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MINIMAL DELETE MODAL --- */}
      <Transition appear show={deleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => !isDeleting && setDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
          >
            <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-xl bg-white p-6 shadow-2xl border border-slate-100">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                      <AlertOctagon className="w-6 h-6 text-red-600" />
                    </div>
                    <Dialog.Title as="h3" className="text-[16px] font-bold text-slate-900">
                      Delete permanently?
                    </Dialog.Title>
                    <p className="text-[13px] text-slate-500 mt-2 px-2">
                      You are about to delete <span className="font-bold text-slate-900">"{selectedWorkspace?.name}"</span>. 
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                      onClick={() => setDeleteModalOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-lg shadow-red-100"
                      onClick={confirmDeleteForever}
                      disabled={isDeleting}
                    >
                      {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Delete forever
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- FOOTER --- */}
      <div className="mt-12 pt-6 border-t border-slate-50 flex items-center justify-between opacity-30">
         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trash Recovery Module</p>
      </div>
    </div>
  );
};