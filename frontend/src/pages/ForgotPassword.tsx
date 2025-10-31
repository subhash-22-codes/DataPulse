import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {  Mail, Lock, Eye, EyeOff, ArrowLeft, Check,  KeyRound, Shield, RefreshCw } from 'lucide-react';
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


  // --- CHANGE 3: Get the functions from the useAuth hook ---
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
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...resetCode];
    newOtp[index] = value.slice(-1); // Only take the last character
    setResetCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !resetCode[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setResetCode(newOtp);
      // Focus the last input
      otpRefs.current[5]?.focus();
    }
  };

 // --- THIS IS THE NEW, UNIFIED FUNCTION WITH THE DELAY YOU WANTED ---
   // --- THIS IS THE NEW, UNIFIED FUNCTION for sending the code ---
 const handleSendCode = async (isResend = false) => {
    // This clean if/else block fixes the linter error
    if (isResend) {
      setIsResending(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      // Step 1: Call the API from our central AuthContext.
      // This happens instantly in the background.
      await sendPasswordReset(email);
      
      // --- THIS IS THE FIX YOU ASKED FOR: The 3-second artificial delay ---
      // We will wait for 3 seconds AFTER the API call has been sent.
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Now, after the wait, show the success message.
      toast.success(
        "Request received! If an account with that email exists, a reset code is on its way.",
        { duration: 5000 }
      );

      
      // Step 3: And move to the next step in the UI.
      setCurrentStep('verify');
      if (isResend) {
        setResetCode(['', '', '', '', '', '']); // Clear OTP on resend
      }
    } catch (error) {
      console.log(error);
      // The error toast is now handled globally and professionally by your AuthContext!
      // We don't need to do anything here.
    } finally {
      // Step 4: Turn off the loading spinner AFTER everything is done.
      if (isResend) {
        setIsResending(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // --- Wrapper for the main form submission ---
  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendCode(false);
  };
  
  // --- Wrapper for the resend button ---
  const handleResendCode = () => {
    handleSendCode(true);
  };

  // --- The new, cleaned-up verify function ---
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
      // AuthContext handles the error toast
    } finally {
      setIsLoading(false);
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'email': return 1;
      case 'verify': return 2;
      case 'reset': return 2;
      case 'success': return 3;
      default: return 1;
    }
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-center space-x-2 py-2">
      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors duration-300 ${
        getStepProgress() >= 1 ? 'bg-blue-600' : 'bg-slate-200'
      }`}></div>
      <div className={`w-6 sm:w-8 h-0.5 sm:h-1 rounded-full transition-colors duration-300 ${
        getStepProgress() >= 2 ? 'bg-blue-600' : 'bg-slate-200'
      }`}></div>
      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors duration-300 ${
        getStepProgress() >= 2 ? 'bg-blue-600' : 'bg-slate-200'
      }`}></div>
      <div className={`w-6 sm:w-8 h-0.5 sm:h-1 rounded-full transition-colors duration-300 ${
        getStepProgress() >= 3 ? 'bg-blue-600' : 'bg-slate-200'
      }`}></div>
      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors duration-300 ${
        getStepProgress() >= 3 ? 'bg-blue-600' : 'bg-slate-200'
      }`}></div>
    </div>
  );

  const renderEmailStep = () => (
    <form onSubmit={handleSendResetCode} className="space-y-4 sm:space-y-5">

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
          Email address
        </label>
        <div className="relative group">
          <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 sm:pl-12 pr-3 sm:pr-4 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
            placeholder="Enter your email address"
          />
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          We'll send a password reset code to this email address.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 hover:shadow-xl text-sm sm:text-base min-h-[44px] touch-target-44"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white mr-2 sm:mr-3"></div>
            <span className="text-sm sm:text-base">Sending reset code...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Send reset code
          </div>
        )}
      </button>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode} className="space-y-4 sm:space-y-5">

      <div className="bg-blue-50/80 border border-blue-200/80 text-blue-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium">
        We've sent a 6-digit reset code to <span className="font-semibold">{email}</span>
      </div>

      <div className="space-y-2">
        <label htmlFor="resetCode" className="block text-sm font-semibold text-slate-700">
          Reset code
        </label>
        <div className="flex justify-center space-x-2 sm:space-x-3">
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
              className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-mono font-bold border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900"
              placeholder="0"
            />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs sm:text-sm text-slate-500">
            Enter the 6-digit code from your email
          </p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending}
            className={`text-xs sm:text-sm font-medium ${
              isResending ? 'text-gray-500' : 'text-blue-600 hover:text-blue-700'
            } transition-colors duration-200 disabled:opacity-60 touch-target-44 flex items-center`}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${isResending ? 'animate-spin text-gray-500' : ''}`}
            />
            {isResending ? 'Resending…' : 'Resend'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700">
            New password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 sm:pl-12 pr-10 sm:pr-12 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors duration-200 touch-target-44"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
            Confirm new password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 sm:pl-12 pr-10 sm:pr-12 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors duration-200 touch-target-44"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || resetCode.some(digit => !digit)}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 hover:shadow-xl text-sm sm:text-base min-h-[44px] touch-target-44"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white mr-2 sm:mr-3"></div>
            <span className="text-sm sm:text-base">Resetting password...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Reset password
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 transition-colors duration-200 text-sm sm:text-base"
      >
        Use different email
      </button>

    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-4 sm:space-y-6">
      {/* Clear localStorage when showing success */}
      {(() => {
        localStorage.removeItem('forgot_password_step');
        localStorage.removeItem('forgot_password_email');
        return null;
      })()}
      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
          Password Reset Successful!
        </h3>
        <p className="text-slate-600 text-sm sm:text-base">
          Your password has been updated successfully. You can now sign in with your new password.
        </p>
      </div>

      <button
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 hover:shadow-xl text-sm sm:text-base min-h-[44px] touch-target-44"
        onClick={() => {
          // Clear localStorage before navigating
          localStorage.removeItem('forgot_password_step');
          localStorage.removeItem('forgot_password_email');
          navigate('/login');
        }}
      >
        Continue to sign in
      </button>
    </div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email': return 'Reset Password';
      case 'verify': return 'Verify & Set New Password';
      case 'success': return 'Password Updated';
      default: return 'Reset Password';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'email': return 'Enter your email to receive a reset code';
      case 'verify': return 'Enter the code and set your new password';
      case 'success': return 'Your password has been successfully updated';
      default: return 'Reset your password';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header with Branding - Only visible on mobile */}
      <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-6 safe-area-top">
        <div className="flex items-center justify-center space-x-3">
        <div className="bg-white p-2.5 rounded-xl shadow-sm">
          <img 
            src="/DPLogo2.png" 
            alt="Datapulse Logo" 
            className="h-6 w-6 object-contain"
          />
        </div>
          <div>
            <h1 className="text-xl font-bold text-white">DataPulse</h1>
            <p className="text-blue-100 text-xs">Secure password recovery</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen lg:min-h-screen">
        {/* Left Side - Reset Form (40% on desktop) */}
        <div className="w-full lg:w-2/5 flex flex-col">
          <div className="flex-1 flex flex-col justify-center py-4 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-md lg:max-w-lg xl:max-w-xl mx-auto lg:mx-0 w-full">
            <div className="w-full space-y-4 sm:space-y-6">
              {/* Back to Login - Compact on mobile */}
              <div className="flex justify-start">
                <Link 
                  to="/login" 
                  className="group inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-all duration-200 touch-target-44"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="sm:inline">Back to sign in</span>
                </Link>
              </div>

              {/* Logo and Header - Hidden on mobile since it's in the header */}
              <div className="space-y-3 hidden lg:block">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 p-3 rounded-xl shadow-lg shadow-blue-500/25">
                      <KeyRound className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {getStepTitle()}
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-base">
                      {getStepDescription()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile-optimized header */}
              <div className="space-y-2 lg:hidden text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {getStepTitle()}
                </h2>
                <p className="text-slate-600 text-sm">
                  {getStepDescription()}
                </p>
              </div>

              {/* Progress Indicator */}
              {renderProgressBar()}

              {/* Main Form */}
              <div className="space-y-4 sm:space-y-6">
                {currentStep === 'email' && renderEmailStep()}
                {currentStep === 'verify' && renderVerifyStep()}
                {currentStep === 'success' && renderSuccessStep()}

                {currentStep !== 'success' && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-blue-100/50">
                    <h3 className="font-semibold text-slate-900 flex items-center text-sm sm:text-base">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
                      Secure Password Reset
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Encrypted email verification process</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Time-limited security codes</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Enterprise-grade password protection</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sign Up Link - Compact on mobile */}
                <div className="text-center pt-3 sm:pt-4 border-t border-slate-100">
                  <p className="text-xs sm:text-sm text-slate-600">
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    >
                      Create one now
                    </Link>
                  </p>
                </div>
              </div>

              {/* Terms - Compact on mobile */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 leading-relaxed px-4 sm:px-0">
                  Password reset is secure and complies with our{' '}
                  <a href="#" className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Security Policy
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Footer Features - Only visible on mobile */}
          <div className="lg:hidden bg-slate-50 px-4 py-6 border-t border-slate-100">
            <div className="max-w-md mx-auto">
              <h3 className="text-center font-semibold text-slate-900 mb-4 text-sm">
                Secure account recovery
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <Shield className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium text-slate-700">Encrypted Reset</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <Mail className="h-5 w-5 mx-auto mb-2 text-green-600" />
                  <p className="text-xs font-medium text-slate-700">Email Verification</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <KeyRound className="h-5 w-5 mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs font-medium text-slate-700">Secure Codes</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <Lock className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs font-medium text-slate-700">New Password</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Desktop Branding (60% on desktop, Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="grid grid-cols-8 gap-4 h-full p-8 rotate-12 transform scale-150">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className="bg-white/20 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 xl:p-16">
            {/* Logo Section */}
            <div className="text-center mb-8 lg:mb-10 xl:mb-12">
              <div className="flex justify-center mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-6 rounded-3xl shadow-2xl">
                  <KeyRound className="h-16 w-16 text-white" />
                </div>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold mb-4">
                Secure Recovery
              </h1>
              <p className="text-xl xl:text-2xl text-blue-100 font-light leading-relaxed max-w-md">
                Your account security is our priority. Reset your password safely.
              </p>
            </div>

            {/* Security Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 max-w-lg xl:max-w-xl">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300 group">
                <Shield className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold mb-2">Encrypted Process</h3>
                <p className="text-sm text-blue-100">End-to-end encrypted password reset</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300 group">
                <Mail className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold mb-2">Email Verification</h3>
                <p className="text-sm text-blue-100">Secure code delivery to your inbox</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300 group">
                <KeyRound className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold mb-2">Secure Codes</h3>
                <p className="text-sm text-blue-100">Time-limited verification codes</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300 group">
                <Lock className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold mb-2">Password Security</h3>
                <p className="text-sm text-blue-100">Enterprise-grade password protection</p>
              </div>
            </div>

            {/* Additional Visual Element */}
            <div className="mt-8 lg:mt-10 xl:mt-12 text-center">
              <div className="flex items-center justify-center space-x-2 text-blue-100">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-blue-100 mt-3 font-light">
                Secure • Private • Encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80 text-center">
            <h2 className="text-lg font-semibold mb-4">Are you sure?</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Are you sure you want to go back and use a different email? 
            </p>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setCurrentStep('email');
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
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