import React, { Fragment, useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Workspace } from '../../types';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, X, CheckCircle2, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react'; 
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
      if (!isModalOpen || !workspace?.id) return;

      const fetchImpactCounts = async () => {
        try {
          const [uploadsRes, alertsRes] = await Promise.all([
            api.get<{ count: number }>(
              `/workspaces/${workspace.id}/uploads/count`
            ),
            api.get<{ count: number }>(
              `/workspaces/${workspace.id}/alerts/count`
            )
          ]);

          setUploadCount(uploadsRes.data.count);
          setAlertCount(alertsRes.data.count);

        } catch (error) {
          console.error("Failed to fetch counts", error);
        }
      };

      fetchImpactCounts();

    }, [isModalOpen, workspace?.id]);


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
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Layout */}
          <div className="px-6 py-6 sm:p-8 flex flex-col-reverse sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">

            {/* Left Content */}
            <div className="flex-1 w-full text-center sm:text-left">
              
              {/* Title */}
              <h3 className="text-base font-semibold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                Delete workspace
              </h3>

              {/* Description */}
              <div className="mt-2 max-w-2xl mx-auto sm:mx-0 space-y-2 text-[11px] sm:text-sm leading-relaxed text-slate-500">
                <p>
                  This action will schedule{" "}
                  <span className="font-medium text-slate-800">
                    {workspace.name}
                  </span>{" "}
                  for deletion and immediately disable access.
                </p>

                <div className="inline-flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] sm:text-xs text-slate-600">
                  <span className="font-medium">Note:</span>
                  <span>
                    Deleted workspaces can be recovered for 30 days before permanent removal.
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 flex justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-md
                    border border-red-200
                    bg-white

                    px-2.5 py-1
                    text-[13px] sm:text-sm
                    font-medium text-red-600

                    shadow-sm
                    hover:bg-red-50
                    hover:border-red-300
                    hover:text-red-700

                    outline-none
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-red-500/30
                    focus-visible:ring-offset-2

                    disabled:opacity-60
                    disabled:cursor-not-allowed
                  "
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Delete workspace
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex-shrink-0 opacity-80 sm:opacity-90">
              <img
                src="/images/Delete.png"
                alt="Delete workspace illustration"
                className="
                  h-16 sm:h-24 md:h-28
                  w-auto
                  object-contain
                  pointer-events-none
                  select-none
                "
                draggable={false}
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
                    <div className="flex flex-col items-center justify-center px-6 py-8 bg-white animate-in fade-in duration-200">

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>

                      {/* Title */}
                      <h3 className="mt-3 text-sm font-semibold text-slate-900">
                        Workspace scheduled for deletion
                      </h3>

                      {/* Subtitle */}
                      <p className="mt-1 text-xs text-slate-500 text-center max-w-xs">
                        Access has been disabled. Redirecting…
                      </p>

                    </div>

                  ) : (
                    /* FORM STATE */
                    <>
  {/* Modal Header - Professional & Centered */}
  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 border border-slate-200">
        <ShieldAlert className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {step === 'confirm_name' ? 'Confirm Deletion' : 'Security Check'}
        </h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
          Workspace Management
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={() => !isLoading && setIsModalOpen(false)}
      className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors outline-none"
    >
      <X className="h-4 w-4" />
    </button>
  </div>

  {/* Modal Body - High Breathing Room */}
  <div className="p-6 bg-white">
    {step === 'confirm_name' ? (
      <div className="space-y-6">
        {/* Simplified Warning Component */}
        <div className="rounded-lg border-l-4 border-rose-500 bg-rose-50/50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-900">Immediate access revocation</p>
              <p className="text-xs text-rose-700 leading-relaxed">
                This workspace contains <span className="font-bold">{uploadCount} datasets</span> and <span className="font-bold">{alertCount} active alerts</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Input Group - Clean & Professional */}
        <div className="space-y-2">
          <label htmlFor="confirm-name" className="block text-xs font-semibold text-slate-500 uppercase tracking-tight">
            Verify workspace name
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
              className={`block w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-all outline-none
                ${inputError 
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' 
                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-500/5'
                }`}
              placeholder={workspace.name}
              autoComplete="off"
              autoFocus
            />
            {confirmationText === workspace.name && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            )}
          </div>
          {inputError && (
            <p className="text-xs text-rose-600 font-medium mt-1">{errorMessage}</p>
          )}
        </div>
      </div>
    ) : (
      /* STEP 2: SECURITY CHECK (OTP) */
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">Verify your identity</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mx-auto">
            We've sent a 6-digit verification code to your registered email address.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''));
              setInputError(false);
            }}
            className={`block w-full rounded-lg border px-4 py-3 text-center text-lg font-mono tracking-[0.5em] transition-all outline-none
              ${inputError 
                ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' 
                : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-500/5'
              }`}
            placeholder="000000"
            autoFocus
          />
          {inputError && (
            <p className="text-xs text-rose-600 text-center font-medium">{errorMessage}</p>
          )}
        </div>
      </div>
    )}
  </div>

  {/* Modal Footer - Professional Responsive Buttons */}
  <div className="bg-slate-50/50 px-6 py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100">
    <button
      type="button"
      onClick={() => !isLoading && setIsModalOpen(false)}
      disabled={isLoading}
      className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
    >
      Cancel
    </button>
    
    {step === 'confirm_name' ? (
      <button
        type="button"
        onClick={handleRequestOTP}
        disabled={isLoading || confirmationText !== workspace.name}
        className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-all min-w-[140px]"
      >
        {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
        Next Step
      </button>
    ) : (
      <button
        type="button"
        onClick={handleFinalDelete}
        disabled={isLoading || otp.length !== 6}
        className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 transition-all min-w-[140px]"
      >
        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="w-4 h-4" />}
        Confirm Delete
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