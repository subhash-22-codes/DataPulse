import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check, KeyRound, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

type Step = 'email' | 'verify' | 'reset' | 'success';

const ForgotPassword: React.FC = () => {
  // Initialize state from localStorage to persist across page reloads
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    return (localStorage.getItem('forgot_password_step') as Step) || 'email';
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('forgot_password_email') || '';
  });
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { sendPasswordReset, resetPassword } = useAuth();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('forgot_password_step', currentStep);
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem('forgot_password_email', email);
  }, [email]);

  // Clear localStorage when component unmounts or on success
  useEffect(() => {
    return () => {
      if (currentStep === 'success') {
        localStorage.removeItem('forgot_password_step');
        localStorage.removeItem('forgot_password_email');
      }
    };
  }, [currentStep]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...resetCode];
    newOtp[index] = value.slice(-1); 
    setResetCode(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !resetCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setResetCode(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  // --- LOGIC: Sending Code with 3-Second Delay ---
  const handleSendCode = async (isResend = false) => {
    if (isResend) setIsResending(true);
    else setIsLoading(true);
    
    try {
      await sendPasswordReset(email);
      
      // Artificial Delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      toast.success(
        "Request received! If an account with that email exists, a reset code is on its way.",
        { duration: 5000 }
      );
      
      setCurrentStep('verify');
      if (isResend) {
        setResetCode(['', '', '', '', '', '']); 
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (isResend) setIsResending(false);
      else setIsLoading(false);
    }
  };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendCode(false);
  };
  
  const handleResendCode = () => {
    handleSendCode(true);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = resetCode.join('');
    if (otpString.length !== 6) return toast.error('Please enter the complete 6-digit code.');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters long.');

    setIsLoading(true);
    try {
      await resetPassword(email, otpString, newPassword);
      setCurrentStep('success');
      localStorage.removeItem('forgot_password_step');
      localStorage.removeItem('forgot_password_email');
      toast.success('Password reset successfully!');
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email': return 'Reset Password';
      case 'verify': return 'Verify & Set Password';
      case 'success': return 'Password Updated';
      default: return 'Reset Password';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'email': return 'Enter your email to receive a reset code.';
      case 'verify': return 'Enter the code and set your new password.';
      case 'success': return 'Your password has been successfully updated.';
      default: return 'Reset your password.';
    }
  };

  // --- RENDER HELPERS ---

  const renderEmailStep = () => (
    <form onSubmit={handleSendResetCode} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
            placeholder="name@example.com"
          />
        </div>
        <p className="text-xs text-slate-500 pt-1">
          We'll send a 6-digit code to this address.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
            Sending Code...
          </>
        ) : (
          'Send Reset Code'
        )}
      </button>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode} className="space-y-5">
      
      {/* Email Badge */}
      <div className="bg-blue-50 border border-blue-100 text-blue-800 px-3 py-2 rounded-md flex items-center gap-2">
         <Mail className="h-4 w-4 shrink-0" />
         <span className="text-xs font-medium truncate">Code sent to <b>{email}</b></span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide text-center">
          Verification Code
        </label>
        <div className="flex justify-between gap-1">
          {resetCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (otpRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              onPaste={handleOtpPaste}
              className="w-full aspect-square text-center text-lg font-bold rounded-md border border-slate-300 text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
              placeholder="•"
            />
          ))}
        </div>
        
        {/* Resend Link */}
        <div className="text-center pt-1">
            <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending}
            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? 'Resending...' : 'Resend Code'}
            </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="flex justify-center items-center py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold shadow-sm transition-all text-sm"
          >
            Change Email
          </button>
          <button
            type="submit"
            disabled={isLoading || resetCode.some(digit => !digit)}
            className="flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
      </div>

    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      {/* Clear localStorage when showing success */}
      {(() => {
        localStorage.removeItem('forgot_password_step');
        localStorage.removeItem('forgot_password_email');
        return null;
      })()}
      
      <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      
      <div className="space-y-2">
        <p className="text-slate-600 text-sm leading-relaxed">
          Your password has been updated successfully. You can now use your new credentials to access your account.
        </p>
      </div>

      <button
        className="w-full flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm transition-all text-sm"
        onClick={() => {
          localStorage.removeItem('forgot_password_step');
          localStorage.removeItem('forgot_password_email');
          navigate('/login');
        }}
      >
        Sign In Now
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-blue-100">
      
      {/* LEFT SIDE - FORM (40% Width) */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-12 bg-white z-10 border-r border-slate-100 h-screen overflow-y-auto custom-scrollbar">
        
        <div className="w-full max-w-sm mx-auto flex flex-col">
          
          {/* Back Navigation */}
          <div className="mb-6 lg:mb-8">
             <Link 
                to="/login" 
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wide"
              >
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Back to login
              </Link>
          </div>

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex items-center gap-2 mb-6 font-poppins">
             <img src="/DPLogo2.png" alt="DataPulse" className="h-6 w-6 object-contain" />
             <span className="text-lg font-bold text-slate-900">DataPulse</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 mb-6 font-poppins">
             <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-8 object-contain" />
             <span className="font-bold text-xl text-slate-900 tracking-tight">DataPulse</span>
          </div>

          {/* Main Header */}
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {getStepTitle()}
            </h1>
            <p className="text-slate-500 text-sm">
              {getStepDescription()}
            </p>
          </div>

          {/* Steps */}
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'verify' && renderVerifyStep()}
          {currentStep === 'success' && renderSuccessStep()}

          {/* Footer Section (Hidden on success step) */}
          {currentStep !== 'success' && (
            <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-md p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-blue-600" />
                        Secure Recovery
                    </h3>
                    <div className="space-y-1.5">
                        {[
                            "Encrypted verification process",
                            "Time-limited security codes",
                            "Secure password hashing"
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                <Check className="h-3 w-3 text-green-600" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDE - BRANDING (60% Width) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden items-center justify-center p-16">
        
        {/* Subtle Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
        
        {/* Content Container */}
        <div className="relative z-10 w-full max-w-2xl text-white space-y-12">
           
           {/* Header Section */}
           <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 rounded-lg bg-blue-500/10 px-4 py-2 border border-blue-400/20 backdrop-blur-sm">
                 <KeyRound className="h-5 w-5 text-blue-200" />
                 <span className="font-semibold tracking-wide text-white text-sm">Account Recovery</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
                 Safe & Secure <br/><span className="text-blue-200">Reset Process.</span>
              </h2>
              <p className="text-xl text-blue-100/90 leading-relaxed font-light max-w-xl">
                We use industry-standard encryption to ensure your account details and new credentials remain private.
              </p>
           </div>

           {/* Features Grid */}
           <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { icon: Shield, title: "End-to-End Encryption", desc: "Your request is encrypted from start to finish." },
                { icon: Mail, title: "Email Verification", desc: "We verify you own the email before proceeding." },
                { icon: KeyRound, title: "Secure Codes", desc: "One-time use codes that expire quickly." },
                { icon: Lock, title: "Password Protection", desc: "New passwords are salted and hashed securely." }
              ].map((f, i) => (
                <div key={i} className="flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10">
                        <f.icon className="h-5 w-5 text-blue-200" />
                      </div>
                      <h3 className="font-semibold text-white text-base">{f.title}</h3>
                   </div>
                   <p className="text-sm text-blue-100/70 leading-relaxed pl-12">{f.desc}</p>
                </div>
              ))}
           </div>

           {/* Footer Note */}
           <div className="pt-8 border-t border-white/10 flex justify-between items-center text-xs text-blue-200/60">
             <p>© 2025 DataPulse. Secure & Reliable.</p>
             <div className="flex gap-4">
               <span>v1.0.0</span>
               <span>System Normal</span>
             </div>
           </div>

        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center border border-slate-100 transform transition-all animate-fade-in">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Use different email?
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Going back will cancel the current reset process and require you to start over.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setCurrentStep('email');
                  setResetCode(['', '', '', '', '', '']);
                }}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
                Yes, Skip
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ForgotPassword;