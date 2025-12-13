import React, { Fragment, useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Workspace, DataUpload, AlertRule } from '../../types';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, CheckCircle2, Info, Trash2 } from 'lucide-react'; 
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
    // Defined inside useEffect to fix dependency warning
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
      // Reset state when modal closes
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

  // --- HANDLERS ---
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
      toast.success("Verification code sent to email");
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
      await api.delete(`/workspaces/${workspace.id}/confirm`, {
        data: { otp: otp } 
      });
      
      setStep('success');
      
      setTimeout(() => {
        setIsModalOpen(false);
        navigate('/home');
        toast.success("Workspace moved to Trash");
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
      <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="border-b border-gray-200 pb-5 mb-8">
          <h2 className="text-2xl font-semibold leading-tight text-gray-900">General Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your workspace configuration and danger zone actions.
          </p>
        </div>

        {/* Minimal Danger Zone Card */}
        <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="px-6 py-6 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
              <div className="flex-1 max-w-2xl">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-gray-400" />
                  Delete Workspace
                </h3>
                <div className="mt-3 text-sm leading-relaxed text-gray-500">
                  <p>
                    Move <span className="font-semibold text-gray-900">{workspace.name}</span> to the trash. 
                    Resources will be inaccessible immediately but can be restored within <span className="font-medium text-gray-900">30 days</span>. 
                    After that, the data is permanently deleted.
                  </p>
                </div>
                
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    Move to trash
                  </button>
                </div>
              </div>
              
              {/* Illustration */}
              <div className="flex-shrink-0 self-center sm:self-start">
                <img 
                  src="/images/Delete.png" 
                  alt="Delete workspace illustration" 
                  className="h-28 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PRODUCTION LEVEL MODAL --- */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isLoading && setIsModalOpen(false)}>
          
          {/* Backdrop with Blur */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-100">
                  
                  {/* SUCCESS STATE */}
                  {step === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="rounded-full bg-green-50 p-3 mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Moved to Trash</h3>
                      <p className="text-sm text-gray-500 mt-2">You can restore this from Settings for 30 days.</p>
                    </div>
                  ) : (
                    /* FORM STATE */
                    <>
                      {/* Modal Header */}
                      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          {step === 'confirm_name' ? 'Move to Trash' : 'Security Verification'}
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none transition-colors"
                          onClick={() => !isLoading && setIsModalOpen(false)}
                        >
                          <span className="sr-only">Close</span>
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="px-6 py-6 sm:py-8">
                        {step === 'confirm_name' ? (
                          <div className="space-y-6">
                            {/* Warning Box */}
                            <div className="rounded-lg bg-amber-50 p-4 border border-amber-100">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <Info className="h-5 w-5 text-amber-600" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-amber-800">30-Day Recovery Period</h3>
                                  <div className="mt-1 text-sm text-amber-700/80">
                                    <p>
                                      The workspace <strong>{workspace.name}</strong> (containing {uploadCount} uploads and {alertCount} alerts) will be disabled immediately. 
                                      You have 30 days to restore it before it is permanently deleted.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Input Group */}
                            <div>
                              <label htmlFor="confirm-name" className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                                Type <span className="font-mono text-gray-600 bg-gray-100 px-1 py-0.5 rounded text-xs select-all">{workspace.name}</span> to confirm
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  name="confirm-name"
                                  id="confirm-name"
                                  value={confirmationText}
                                  onChange={(e) => {
                                    setConfirmationText(e.target.value);
                                    setInputError(false);
                                  }}
                                  // Added pr-10 to prevent text from overlapping the green check icon
                                  className={`block w-full rounded-lg border py-3 pl-4 pr-10 text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 transition-colors ${
                                    inputError 
                                      ? 'border-red-300 focus:border-red-500 bg-red-50/10' 
                                      : 'border-gray-200 focus:border-gray-900'
                                  }`}
                                  placeholder={workspace.name}
                                  autoComplete="off"
                                />
                                
                                {/* GREEN TICK MARK IMPLEMENTATION */}
                                {confirmationText === workspace.name && (
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none animate-in fade-in zoom-in duration-200">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                                  </div>
                                )}
                              </div>
                              {inputError && (
                                <p className="mt-2 text-sm text-red-600 animate-pulse">
                                  {errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                             <div>
                                <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                                  Enter 6-digit verification code
                                </label>
                                <p className="text-sm text-gray-500 mb-4">
                                  For security, we sent a one-time password to your email address associated with this account.
                                </p>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={otp}
                                  onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, ''));
                                    setInputError(false);
                                  }}
                                  className={`block w-full rounded-lg border py-3 px-4 text-center text-lg tracking-[0.5em] font-mono text-gray-900 shadow-sm focus:ring-0 sm:leading-6 transition-colors ${
                                    inputError 
                                      ? 'border-red-300 focus:border-red-500 bg-red-50/10' 
                                      : 'border-gray-200 focus:border-gray-900'
                                  }`}
                                  placeholder="000000"
                                />
                                {inputError && (
                                  <p className="mt-2 text-sm text-center text-red-600">
                                    {errorMessage}
                                  </p>
                                )}
                             </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="bg-gray-50/50 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-100">
                        {step === 'confirm_name' ? (
                          <button
                            type="button"
                            onClick={handleRequestOTP}
                            disabled={isLoading || confirmationText === ''}
                            className="inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none"
                          >
                            {isLoading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                            I understand, continue
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleFinalDelete}
                            disabled={isLoading || otp.length !== 6}
                            className="inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none"
                          >
                            {isLoading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                            Confirm Move to Trash
                          </button>
                        )}
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all focus:outline-none"
                          onClick={() => !isLoading && setIsModalOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
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