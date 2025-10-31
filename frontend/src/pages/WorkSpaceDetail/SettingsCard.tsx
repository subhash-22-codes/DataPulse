import React, { Fragment, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Workspace, DataUpload, AlertRule } from '../../types';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle, X, FileText, Users, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface SettingsCardProps {
  workspace: Workspace;
  isOwner: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ workspace, isOwner }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [isFetchingCounts, setIsFetchingCounts] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const fetchImpactCounts = async () => {
      setIsFetchingCounts(true);
      try {
        const [uploadsRes, alertsRes] = await Promise.all([
          api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get<AlertRule[]>(`/workspaces/${workspace.id}/alerts`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setUploadCount(uploadsRes.data.length);
        setAlertCount(alertsRes.data.length);
      } catch (error) {
        console.error(error);
        setUploadCount(0);
        setAlertCount(0);
      } finally {
        setIsFetchingCounts(false);
      }
    };
    fetchImpactCounts();
  }, [isModalOpen, workspace.id, token]);

  if (!isOwner) return null;

  const handleDeleteWorkspace = async () => {
    if (confirmationText !== workspace.name) {
      toast.error("The workspace name you entered is incorrect.");
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete(`/workspaces/${workspace.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Workspace deleted successfully. Redirecting...");
      setTimeout(() => navigate('/home'), 1500);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete workspace.");
      setIsDeleting(false);
    }
  };

  const isConfirmationMatch = confirmationText === workspace.name;

  return (
    <>
      {/* --- POLISHED DANGER ZONE CARD --- */}
      <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5"><div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Workspace</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">Permanently remove this workspace and all of its data. This action cannot be undone, so please proceed with caution.</p>
              <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors duration-150">
                <ShieldAlert className="w-4 h-4" />Delete this workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- POLISHED CONFIRMATION MODAL --- */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isDeleting && setIsModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
                  <div className="relative bg-red-600 px-6 py-8 text-white">
                    <button onClick={() => !isDeleting && setIsModalOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors" disabled={isDeleting}><X className="w-5 h-5" /></button>
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"><ShieldAlert className="w-7 h-7" /></div>
                      <div>
                        <Dialog.Title className="text-2xl font-bold mb-1">Delete this workspace?</Dialog.Title>
                        <p className="text-red-100 text-sm">Unexpected bad things will happen if you don’t read this!</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800 font-semibold mb-3">This action cannot be undone. This will permanently delete:</p>
                      {isFetchingCounts ? (
                        <div className="flex items-center justify-center p-2"><Loader2 className="h-5 w-5 animate-spin text-red-700" /></div>
                      ) : (
                        <ul className="text-sm text-red-900 space-y-2">
                          <li className="flex items-center gap-2"><FileText className="w-4 h-4 flex-shrink-0"/><span><strong>{uploadCount}</strong> Data Upload(s) and their files</span></li>
                          <li className="flex items-center gap-2"><Users className="w-4 h-4 flex-shrink-0"/><span><strong>{workspace.team_members?.length || 0}</strong> Team Member connection(s)</span></li>
                          <li className="flex items-center gap-2"><BellRing className="w-4 h-4 flex-shrink-0"/><span><strong>{alertCount}</strong> Smart Alert Rule(s)</span></li>
                        </ul>
                      )}
                    </div>
                    
                    <div>
                      <p className="font-fira text-sm text-gray-700 mb-3">Please type <code className="px-1.5 py-1 rounded bg-gray-100 text-gray-800 font-mono text-xs">{workspace.name}</code> to confirm.</p>
                      <div className="relative">
                        <input
                          type="text"
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          placeholder={workspace.name}
                          disabled={isDeleting}
                          autoFocus
                          className={`w-full px-4 py-3 text-sm border-2 rounded-lg transition-all duration-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed ${isConfirmationMatch ? 'border-green-400 bg-green-50/50' : 'border-gray-300'}`}
                        />
                        {isConfirmationMatch && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                    <button type="button" disabled={isDeleting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                    <button
                      type="button"
                      onClick={handleDeleteWorkspace}
                      disabled={!isConfirmationMatch || isDeleting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg disabled:opacity-40 hover:bg-red-700"
                    >
                      {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</> : 'I understand the consequences, delete this workspace'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};