import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Check, KeyRound, Shield, RefreshCw, Loader2 } from 'lucide-react';
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
  const passwordRequirements = [
    { label: '8+ characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'Uppercase', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'Special char', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];
  const isStrong = passwordRequirements.every(req => req.test(newPassword));
  const isMatching = newPassword === confirmPassword && confirmPassword.length > 0;

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

  const handleBackToLogin = () => {
    localStorage.removeItem('forgot_password_step');
    localStorage.removeItem('forgot_password_email');
    navigate('/login');
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
        className="
          w-full 
          flex justify-center items-center
          h-10 sm:h-11 
          bg-blue-600 hover:bg-blue-700 
          text-white 
          rounded-sm 
          text-[11px] sm:text-[12px] font-bold font-manrope tracking-widest
          shadow-sm 
          transition-all active:scale-[0.98]
          disabled:opacity-20 disabled:cursor-not-allowed
        "
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Sending Code...</span>
          </div>
        ) : (
          'Send Reset Code'
        )}
      </button>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode} className="space-y-5">
      
      {/* Email Badge */}
      <div className="flex flex-col gap-0.5 text-slate-700">
        <div className="flex items-center gap-1.5 text-xs">
          <Mail className="h-3.5 w-3.5 text-slate-500" />
              <span>
                Code sent to <span className="font-medium">{email}</span>
              </span>
        </div>
    
            <span className="text-[11px] leading-tight text-slate-500">
                 Didn’t receive it? Check spam or promotions.
              </span>
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
            className="inline-flex items-center text-xs font-bold font-manrope text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

          {/* Smooth Transition Checklist */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${newPassword.length > 0 && !isStrong ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {passwordRequirements.map((req, i) => {
                const met = req.test(newPassword);
                return (
                  <div key={i} className="flex items-center gap-1 transition-colors duration-300">
                    <Check className={`h-3 w-3 transition-colors duration-300 ${met ? 'text-green-600' : 'text-slate-300'}`} />
                    <span className={`text-[10px] font-medium transition-colors duration-300 ${met ? 'text-green-700' : 'text-slate-500'}`}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
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
              type={showConfirmPassword ? 'text' : 'password'}
              required
              disabled={!isStrong}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`block w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors ${!isStrong ? 'bg-slate-50 cursor-not-allowed opacity-60' : 'bg-white'}`}
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

          {/* Smooth Transition Status */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out 
            ${isStrong && confirmPassword.length > 0 && !isMatching 
              ? 'max-h-10 opacity-100 mt-2' 
              : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex items-center gap-1 pl-1">
              {/* We only need the "Passwords do not match yet" logic here now, 
                because if they DO match, the parent div collapses (max-h-0).
              */}
              {!isMatching && (
                <div className="animate-in slide-in-from-left-1 duration-300">
                  <p className="text-[10px] text-red-500 font-medium italic">
                    Passwords do not match yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
  
      </div>

     <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-4">
        {/* SECONDARY: Neutral Maintenance Action */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="
            flex justify-center items-center
            h-10 sm:h-11
            bg-white border border-slate-200
            rounded-sm 
            text-[10px] sm:text-[11px] font-bold text-slate-400 font-manrope tracking-widest
            hover:text-slate-900 hover:border-slate-400
            transition-all active:scale-[0.98]
          "
        >
          Edit Email
        </button>

        {/* PRIMARY: SaaS Blue Growth Action */}
        <button
          type="submit"
          disabled={isLoading || !isStrong || !isMatching || resetCode.some(digit => !digit)}
          className="
            flex justify-center items-center
            h-10 sm:h-11
            bg-blue-600 hover:bg-blue-700 
            text-white 
            rounded-sm 
            text-[10px] sm:text-[11px] font-bold font-manrope tracking-widest
            shadow-sm 
            transition-all active:scale-[0.98]
            disabled:opacity-20 disabled:cursor-not-allowed
          "
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Resetting...</span>
            </div>
          ) : (
            'Reset Password'
          )}
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
        type="button"
        onClick={() => {
          localStorage.removeItem('forgot_password_step');
          localStorage.removeItem('forgot_password_email');
          navigate('/login');
        }}
        className="
          w-full 
          flex justify-center items-center
          h-10 sm:h-11 
          bg-blue-600 hover:bg-blue-700 
          text-white 
          rounded-sm 
          text-[11px] sm:text-[12px] font-bold font-manrope tracking-widest
          shadow-sm 
          transition-all active:scale-[0.98]
        "
      >
        Sign In Now
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-blue-100">
      
      {/* LEFT SIDE - FORM (40% Width) */}
      <div className="w-full lg:w-[40%] flex flex-col px-6 py-8 sm:px-8 lg:px-12 bg-white z-10 border-r border-slate-100 h-screen overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-sm mx-auto flex flex-col my-auto py-10">
        <div className="w-full max-w-sm mx-auto flex flex-col">

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex items-center gap-2 font-poppins">
            <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-auto object-contain" />
          </div>

          <div className="hidden lg:flex items-center gap-2 font-poppins">
            <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-auto object-contain" />
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

          {currentStep !== 'success' && (
            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{' '}
              <button 
                type="button"
                onClick={handleBackToLogin}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors underline-offset-4 hover:underline"
              >
                Sign In
              </button>
            </p>
          )}

          {/* Footer Section (Hidden on success step) */}
          {currentStep !== 'success' && (
            <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-md p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-blue-600" />
                         Password recovery
                    </h3>
                    <div className="space-y-1.5">
                        {[
                            "Confirm your email address",
                            "Enter the one-time code we send",
                            "Create a new password"
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
                 <span className="font-semibold tracking-wide text-white text-sm">Password Recovery</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
                Reset your access, <br/><span className="text-blue-200">securely</span>
              </h2>
              <p className="text-xl text-blue-100/90 leading-relaxed font-light max-w-xl">
                Follow a simple verification step to regain access to your account.
              </p>
           </div>

           {/* Features Grid */}
           <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { icon: Mail, title: "Email confirmation", desc: "We send a verification code to confirm it’s you." },
                { icon: KeyRound, title: "One-time code", desc: "Use the code to securely reset your password." },
                { icon: Lock, title: "Set a new password", desc: "Choose a new password to regain access." },
                { icon: Shield, title: "Account safety", desc: "Your account remains protected throughout the process." }
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
              <p>© 2026 DataPulse</p>
              <div className="flex gap-4">
                <span>v1.1.0</span>
                <span>Account services available</span>
              </div>
            </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center border border-slate-100 transform transition-all animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Use different email?
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Going back will cancel the current reset process and require you to start over.
            </p>
            <div className="flex gap-2 w-full pt-4">
              {/* SAFE ACTION: Stay on current step */}
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="
                  flex-1 
                  h-10 sm:h-11
                  rounded-sm border border-slate-200 
                  bg-white
                  text-[10px] sm:text-[11px] font-bold text-slate-400 font-manrope tracking-widest 
                  hover:text-slate-900 hover:border-slate-300
                  transition-all active:scale-[0.98]
                "
              >
                Cancel
              </button>

              {/* DESTRUCTIVE ACTION: Clear progress and edit email */}
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('forgot_password_step');
                  setShowConfirm(false);
                  setCurrentStep('email');
                  setResetCode(['', '', '', '', '', '']);
                }}
                className="
                  flex-1 
                  h-10 sm:h-11
                  bg-red-600 hover:bg-red-700 
                  rounded-sm 
                  text-[10px] sm:text-[11px] font-bold text-white font-manrope tracking-widest 
                  shadow-sm transition-all active:scale-[0.98]
                "
              >
                Yes, Edit Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ForgotPassword;