import React, { Fragment, useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Workspace, DataUpload, AlertRule } from '../../types';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, CheckCircle2, Trash2, ShieldAlert, ArrowRight, AlertTriangle } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// --- TYPES ---
interface SettingsCardProps {
  workspace: Workspace;
  isOwner: boolean;
}

interface AxiosErrorType {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ workspace, isOwner }) => {
  const navigate = useNavigate();
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<'confirm_name' | 'verify_otp' | 'success'>('confirm_name');
  const [confirmationText, setConfirmationText] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Error state
  const [inputError, setInputError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Stats
  const [uploadCount, setUploadCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchImpactCounts = async () => {
      try {
        const [uploadsRes, alertsRes] = await Promise.all([
          api.get<DataUpload[]>(`/workspaces/${workspace.id}/uploads`),
          api.get<AlertRule[]>(`/workspaces/${workspace.id}/alerts`)
        ]);
        setUploadCount(uploadsRes.data.length);
        setAlertCount(alertsRes.data.length);
      } catch (error) {
        console.error("Failed to fetch counts", error);
      }
    };

    if (!isModalOpen) {
      const timer = setTimeout(() => {
        setStep('confirm_name');
        setConfirmationText('');
        setOtp('');
        setIsLoading(false);
        setInputError(false);
        setErrorMessage('');
      }, 200);
      return () => clearTimeout(timer);
    } else {
      fetchImpactCounts();
    }
  }, [isModalOpen, workspace.id]); 

  if (!isOwner) return null;

  const handleRequestOTP = async () => {
    setInputError(false);
    setErrorMessage('');

    if (confirmationText !== workspace.name) {
      setInputError(true);
      setErrorMessage('Workspace name does not match.');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post(`/workspaces/${workspace.id}/request-delete-otp`);
      toast.success("Verification code sent to email", { style: { fontSize: '13px', background: '#334155', color: '#fff' }});
      setStep('verify_otp');
    } catch (error) {
      const err = error as AxiosErrorType;
      console.error(err);
      toast.error("Network error, please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalDelete = async () => {
    setInputError(false);
    setErrorMessage('');

    if (otp.length !== 6) {
      setInputError(true);
      setErrorMessage('Code must be 6 digits.');
      return;
    }

    setIsLoading(true);
    try {
      await api.delete(`/workspaces/${workspace.id}/confirm`, { data: { otp: otp } });
      setStep('success');
      setTimeout(() => {
        setIsModalOpen(false);
        navigate('/home');
        toast.success("Workspace moved to Trash", { style: { fontSize: '13px', background: '#334155', color: '#fff' }});
      }, 2000);
    } catch (error) {
      const err = error as AxiosErrorType;
      console.error(err);
      const msg = err.response?.data?.detail || "Invalid code provided.";
      setInputError(true);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto font-sans animate-in fade-in duration-300">
        
        <div className="border-b border-slate-200 pb-5 mb-8">
          <h2 className="text-lg font-bold leading-tight text-slate-900">General Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your workspace configuration and administrative actions.
          </p>
        </div>

        {/* Danger Zone Card */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            {/* MOBILE LAYOUT FIX: 
               Used `flex-col-reverse` on mobile so content is below image, 
               but shifted to `flex-row` on desktop (`sm:`).
            */}
            <div className="px-6 py-6 sm:p-8 flex flex-col-reverse sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
                
                {/* Left Content */}
                <div className="flex-1 w-full text-center sm:text-left">
                    <h3 className="text-base font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                        Delete Workspace
                    </h3>
                    <div className="mt-2 text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto sm:mx-0">
                        <p className="mb-3">
                            Permanently delete <span className="font-semibold text-slate-900">{workspace.name}</span> and all of its resources ({uploadCount} datasets, {alertCount} alerts).
                        </p>
                        <p className="text-xs bg-slate-50 text-slate-600 p-2.5 rounded-md border border-slate-100 inline-block text-left">
                            <span className="font-semibold">Note:</span> Deleted workspaces are recoverable for 30 days before permanent removal.
                        </p>
                    </div>
                    
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 border border-slate-200 shadow-sm hover:bg-red-50 hover:border-red-100 hover:text-red-700 transition-all active:scale-95 w-full sm:w-auto justify-center"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete this workspace
                        </button>
                    </div>
                </div>

                {/* Right Illustration - Visible on Mobile & Desktop */}
                <div className="flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity">
                    <img 
                        src="/images/Delete.png" 
                        alt="Delete workspace" 
                        // Mobile: h-24, Desktop: h-32. Contained neatly.
                        className="h-24 sm:h-32 w-auto object-contain pointer-events-none select-none" 
                    />
                </div>
            </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 font-sans" onClose={() => !isLoading && setIsModalOpen(false)}>
          
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
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
                <Dialog.Panel className="w-full max-w-[480px] transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-2xl transition-all border border-slate-100">
                  
                  {/* SUCCESS STATE */}
                  {step === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-12 px-8 bg-white animate-in zoom-in duration-300">
                       <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                          <CheckCircle2 className="h-7 w-7 text-green-600" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-900">Workspace Deleted</h3>
                       <p className="text-sm text-slate-500 mt-2 text-center">
                         Resources moved to trash. Redirecting...
                       </p>
                       <div className="mt-6 w-full max-w-[200px] bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 animate-[progress_2s_ease-in-out]"></div>
                       </div>
                    </div>
                  ) : (
                    /* FORM STATE */
                    <>
                      {/* Modal Header */}
                      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                {step === 'confirm_name' ? <ShieldAlert className="h-5 w-5 text-slate-500" /> : <ShieldAlert className="h-5 w-5 text-slate-500" />}
                            </div>
                            <div>
                                <Dialog.Title as="h3" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                {step === 'confirm_name' ? 'Confirm Deletion' : 'Security Check'}
                                </Dialog.Title>
                            </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none"
                          onClick={() => !isLoading && setIsModalOpen(false)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="px-6 py-6 bg-white">
                        {step === 'confirm_name' ? (
                          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-red-50/50 border border-red-100 p-3 rounded-lg flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                                <p className="text-xs text-red-800 leading-relaxed font-medium">
                                    Unexpected bad things will happen if you don't read this! This action cannot be undone immediately.
                                </p>
                            </div>

                            {/* Input Group */}
                            <div>
                              <label htmlFor="confirm-name" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Type <span className="normal-case text-slate-900 select-all">{workspace.name}</span> to confirm
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  id="confirm-name"
                                  value={confirmationText}
                                  onChange={(e) => {
                                    setConfirmationText(e.target.value);
                                    setInputError(false);
                                  }}
                                  className={`block w-full rounded-lg border py-2.5 pl-4 pr-10 text-slate-900 text-sm shadow-sm placeholder:text-slate-300 transition-all focus:ring-4 focus:ring-slate-100 ${
                                    inputError 
                                      ? 'border-red-300 focus:border-red-500' 
                                      : 'border-slate-300 focus:border-slate-500'
                                  }`}
                                  placeholder={workspace.name}
                                  autoComplete="off"
                                  autoFocus
                                />
                                
                                {/* Live Verification Icon */}
                                {confirmationText === workspace.name && (
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none animate-in zoom-in duration-200">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                  </div>
                                )}
                              </div>
                              {inputError && (
                                <p className="mt-2 text-xs font-medium text-red-600 animate-pulse">
                                    {errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                  Verification Code
                                </label>
                                <div className="mb-4">
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Enter the 6-digit code sent to your email to verify your identity.
                                    </p>
                                </div>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={otp}
                                  onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, ''));
                                    setInputError(false);
                                  }}
                                  className={`block w-full rounded-lg border py-3 px-4 text-center text-xl tracking-[0.5em] font-mono font-medium text-slate-900 shadow-sm transition-all focus:ring-4 focus:ring-slate-100 ${
                                    inputError 
                                      ? 'border-red-300 focus:border-red-500' 
                                      : 'border-slate-300 focus:border-slate-900'
                                  }`}
                                  placeholder="000000"
                                  autoFocus
                                />
                                {inputError && (
                                  <p className="mt-2 text-xs font-semibold text-center text-red-600">
                                    {errorMessage}
                                  </p>
                                )}
                             </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                          type="button"
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                          onClick={() => !isLoading && setIsModalOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                        
                        {step === 'confirm_name' ? (
                          <button
                            type="button"
                            onClick={handleRequestOTP}
                            disabled={isLoading || confirmationText !== workspace.name}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                          >
                            {isLoading && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                            Verify Identity <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleFinalDelete}
                            disabled={isLoading || otp.length !== 6}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                          >
                            {isLoading ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete Workspace
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};