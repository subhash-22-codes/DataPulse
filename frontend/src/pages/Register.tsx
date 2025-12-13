import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Mail, Lock, Eye, EyeOff, Check, BarChart3, BellRing, Database,ShieldCheck,UserIcon  } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Register: React.FC = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Load saved data on mount
  useEffect(() => {
    setIsInitializing(true);
    const savedStep = localStorage.getItem('register-step') as 'email' | 'otp' | null;
    const savedEmail = localStorage.getItem('register-email');
    const savedOtp = localStorage.getItem('register-otp');
    
    if (savedStep) {
      setStep(savedStep);
    }
    if (savedEmail) {
      setEmail(savedEmail);
    }
    if (savedOtp) {
      try {
        const parsedOtp = JSON.parse(savedOtp);
        if (Array.isArray(parsedOtp) && parsedOtp.length === 6) {
          setOtp(parsedOtp);
        }
      } catch (error) {
        console.error('Failed to parse saved OTP:', error);
        toast.error('Invalid saved OTP, please try again.'); // Notify user about invalid OTP
        // Invalid saved OTP, ignore
      }
    }
    
    // Small delay to prevent flash of loading state
    setTimeout(() => setIsInitializing(false), 100);
  }, []);

  // Save step and email to localStorage whenever they change
  useEffect(() => {
    if (isInitializing) return;
    
    if (step === 'otp') {
      localStorage.setItem('register-step', step);
    } else {
      localStorage.removeItem('register-step');
      localStorage.removeItem('register-otp'); // Clear OTP when going back to email step
    }
  }, [step,isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    
    if (email) {
      localStorage.setItem('register-email', email);
    } else {
      localStorage.removeItem('register-email');
    }
  }, [email,isInitializing]);

  // Save OTP to localStorage whenever it changes
  useEffect(() => {
    if (isInitializing) return;
    
    if (step === 'otp') {
      localStorage.setItem('register-otp', JSON.stringify(otp));
    }
  }, [otp, step, isInitializing]);
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Remove non-digits
    
    if (pastedData.length >= 6) {
      const newOtp = pastedData.slice(0, 6).split('');
      // Pad with empty strings if needed
      while (newOtp.length < 6) {
        newOtp.push('');
      }
      setOtp(newOtp);
      
      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(5, pastedData.length - 1);
      setTimeout(() => {
        otpRefs.current[lastFilledIndex]?.focus();
      }, 0);
    } else if (pastedData.length > 0) {
      // Handle partial paste
      const newOtp = [...otp];
      const availableSlots = 6 - index;
      const dataToPaste = pastedData.slice(0, availableSlots);
      
      for (let i = 0; i < dataToPaste.length; i++) {
        if (index + i < 6) {
          newOtp[index + i] = dataToPaste[i];
        }
      }
      setOtp(newOtp);
      
      // Focus next empty input or last filled
      const nextIndex = Math.min(5, index + dataToPaste.length);
      setTimeout(() => {
        otpRefs.current[nextIndex]?.focus();
      }, 0);
    }
  };
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

// Core OTP sending logic (no event handling here)
// src/pages/Register.tsx (Modified Functions)

// Core OTP sending logic (no event handling here)
const sendOtp = async (isFromResend = false) => {
    // 1. Set the correct loading state
    if (!isFromResend) { 
        setIsLoading(true);
    } else {
        setIsResending(true);
    }
    
    // Set success to false initially
    let success = false;

    try {
        // 2. Await the result from AuthContext
        console.log("--- 📞 Calling API. Global Loading: ON");
        success = await register(email); 

        if (success) {
            // 3. If API Succeeded, update UI and state
            console.log("--- ✅ API Success. Setting Step to 'otp'");
            toast.success(
                isFromResend
                    ? 'Request received! Your new OTP is on its way.'
                    : 'Request received! Your OTP is on its way.'
            );
            
            // 🔑 CRITICAL FIX: Only change the step on confirmed success.
            setStep('otp');
            setOtp(['', '', '', '', '', '']);
            
            // Clear email from local storage immediately to prevent conflicts
            localStorage.removeItem('register-email'); 
        }
    } catch (error) {
        // AuthContext handles the error toast, we just log it.
        console.error("Error during OTP process:", error);
    } finally {
        // 4. Always reset the loading state
        console.log("--- 🛑 Resetting local Loading state");
        if (!isFromResend) {
            // Add a small delay for visual feedback if the backend is ultra-fast
            setTimeout(() => setIsLoading(false), success ? 0 : 500);
        } else {
            setIsResending(false);
        }
    }
};

// For initial form submit
const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address.');
        return;
    }
    await sendOtp(false);
};

// For resend button
const handleResendOtp = () => {
    sendOtp(true);
};

const handleVerifyOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const otpCode = otp.join('');
  if (name.trim().length === 0) return toast.error('Please enter your full name');
  if (otpCode.length !== 6) return toast.error('Please enter the complete 6-digit OTP');
  if (password !== confirmPassword) return toast.error('Passwords do not match');
  if (password.length < 8) return toast.error('Password must be at least 8 characters long');

  setIsLoading(true);

  try {
    await verifyOtp(name, email, otpCode, password);
    
    // Clear persisted data
    localStorage.removeItem('register-step');
    localStorage.removeItem('register-email');
    localStorage.removeItem('register-otp');
    
    toast.success('Account created successfully! Redirecting to login...')
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  } catch (error) {
    console.log(error);
    // The error toast is handled by AuthContext, so we do nothing here.
  } finally {
    setIsLoading(false);
  }
};
  // Show loading state only during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header with Branding - Only visible on mobile */}
     <div className="lg:hidden px-4 py-4 bg-white">
        <div className="flex items-center space-x-1">
          
          <img 
            src="/DPLogo2.png" 
            alt="DataPulse Logo"
            className="h-8 w-8 object-contain"
          />

          <div className="flex flex-col">
            <h1 className="text-lg font-medium text-slate-900">DataPulse</h1>
          </div>

        </div>
      </div>


      <div className="flex min-h-screen lg:min-h-screen">
        {/* Left Side - Registration Form (40% on desktop) */}
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
                  <span className="sm:inline">Back to login</span>
                </Link>
              </div>

              {/* Logo and Header - Hidden on mobile since it's in the header */}
              <div className="space-y-3 hidden lg:block">
                <div className="flex items-center space-x-3">
                 <div className="relative">
                  <img 
                    src="/DPLogo2.png" 
                    alt="Datapulse Logo" 
                    className="h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 object-contain"
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      Join DataPulse
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-base">
                      {step === 'email' 
                        ? 'Create your account and unlock powerful analytics' 
                        : 'Verify your email and secure your account'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile-optimized header */}
              <div className="space-y-2 lg:hidden text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {step === 'email' ? 'Create Account' : 'Complete Setup'}
                </h2>
                <p className="text-slate-600 text-sm">
                  {step === 'email' 
                    ? 'Get started with powerful analytics' 
                    : 'Verify your email and set password'
                  }
                </p>
              </div>

              {/* Progress Indicator - More compact on mobile */}
              <div className="flex items-center justify-center space-x-2 py-2">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  step === 'email' ? 'bg-blue-600' : 'bg-green-500'
                }`}></div>
                <div className={`w-6 sm:w-8 h-0.5 sm:h-1 rounded-full transition-all duration-300 ${
                  step === 'email' ? 'bg-slate-200' : 'bg-blue-600'
                }`}></div>
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  step === 'otp' ? 'bg-blue-600' : 'bg-slate-200'
                }`}></div>
              </div>

              {/* Main Form */}
              <div className="space-y-4 sm:space-y-6">
                {step === 'email' && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Google Registration */}
                    <GoogleLoginButton />
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 sm:px-4 bg-white text-slate-500 font-medium">
                          Or continue with email
                        </span>
                      </div>
                    </div>

                    {/* Email Registration Form */}
                    <form onSubmit={handleSendOtp} className="space-y-4 sm:space-y-5">

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
                           className="
                              pl-10 sm:pl-12 pr-3 sm:pr-4 w-full
                              py-3 sm:py-3.5
                              border border-slate-200
                              rounded-xl
                              bg-slate-50/50
                              text-slate-900 placeholder:text-slate-400
                              text-sm sm:text-base

                              focus:bg-white
                              focus:border-gray-500
                              focus:outline-none
                              focus:ring-1 focus:ring-gray-400/60

                              transition-all duration-200
                            "
                            placeholder="Enter your email address"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 hover:shadow-xl text-sm sm:text-base min-h-[44px] touch-target-44"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white mr-2 sm:mr-3"></div>
                            <span className="text-sm sm:text-base">Sending code...</span>
                          </div>
                        ) : (
                          'Send verification code'
                        )}
                      </button>
                    </form>

                    {/* Benefits Section - Responsive layout */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-blue-100/50">
                    <h3 className="font-semibold text-slate-900 flex items-center text-sm sm:text-base">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
                      Why you’ll love starting with DataPulse
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Create your first dashboard in under <strong>5 minutes</strong></span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Access <strong>ready-to-use templates</strong> for instant insights</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Get <strong>guided onboarding</strong> to set up alerts & reports</span>
                      </div>
                      <div className="flex items-start text-xs sm:text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mr-2 sm:mr-3 flex-shrink-0 mt-1.5"></div>
                        <span>Enjoy <strong>free support</strong> during your first 365 days</span>
                      </div>
                    </div>
                  </div>

                  </div>
                )}

                {step === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 sm:space-y-6">
                    <div className="bg-blue-50/80 border border-blue-200/80 text-blue-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">
                          Code sent to <span className="font-semibold break-all">{email}</span>
                        </span>
                      </div>
                    </div>

                    {/* 6-Box OTP Input - Optimized for mobile */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700 text-center">
                        Enter verification code
                      </label>
                      <div className="flex justify-center space-x-2 sm:space-x-3 px-2">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (otpRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onPaste={(e) => handleOtpPaste(e, index)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-center text-lg sm:text-xl font-bold border-2 border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 touch-target-44"
                            placeholder="0"
                          />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 text-center flex items-center justify-center gap-1">
                      <span>Didn’t receive the code?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className={`text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {isResending ? (
                          <span className="flex items-center gap-1">
                            <svg
                              className="animate-spin h-3.5 w-3.5 text-blue-600"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              ></path>
                            </svg>
                            Resending...
                          </span>
                        ) : (
                          'Resend'
                        )}
                      </button>
                    </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                        Your Full Name
                      </label>
                      <div className="relative group">
                        <UserIcon className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 sm:pl-12 pr-3 sm:pr-4 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
                          placeholder="Enter your Username"
                        />
                      </div>
                    </div>

                    {/* Password Fields - Compact on mobile */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                          Create password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 sm:pl-12 pr-10 sm:pr-12 w-full py-3 sm:py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors duration-200 touch-target-44"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                          Confirm password
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
                            placeholder="Confirm your password"
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

                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                      <button
                      type="button"
                      onClick={() => setShowConfirm(true)} // open modal instead of going back
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:ring-offset-2 text-sm sm:text-base min-h-[44px] touch-target-44"
                    >
                      Back
                    </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 hover:shadow-xl text-sm sm:text-base min-h-[44px] touch-target-44"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white mr-2 sm:mr-3"></div>
                            <span className="text-sm sm:text-base">Creating...</span>
                          </div>
                        ) : (
                          'Create account'
                        )}
                      </button>
                    </div>
                  </form>
                )}
  

                {/* Sign In Link - Compact on mobile */}
                <div className="text-center pt-3 sm:pt-4 border-t border-slate-100">
                  <p className="text-xs sm:text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link 
                      to="/login" 
                      className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </div>

              {/* Terms - Compact on mobile */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 leading-relaxed px-4 sm:px-0">
                  By creating an account, you agree to our{' '}
                  <Link to="/legal" className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/legal" className="font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Footer Features - Only visible on mobile */}
          <div className="lg:hidden bg-slate-50 px-4 py-6 border-t border-slate-100">
            <div className="max-w-md mx-auto">
              <h3 className="text-center font-semibold text-slate-900 mb-4 text-sm">
                Trusted by data teams worldwide
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <BarChart3 className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium text-slate-700">Real-time Analytics</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <Database className="h-5 w-5 mx-auto mb-2 text-green-600" />
                  <p className="text-xs font-medium text-slate-700">Data Ingestion</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <BellRing className="h-5 w-5 mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs font-medium text-slate-700">Smart Alerting</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs font-medium text-slate-700">Enterprise-Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>

       {/* Right Side - Desktop Branding (60% on desktop, Hidden on mobile) */}
<div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">


  <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 xl:p-16">
    
    {/* Logo Section */}
    <div className="text-center mb-8 lg:mb-10 xl:mb-12">
      <div className="flex justify-center mb-6">
        <div className="bg-white/20 backdrop-blur-sm p-6 rounded-3xl shadow-2xl hover:scale-105 transition-transform">
          <Activity className="h-16 w-16 text-white" />
        </div>
      </div>
      <h1 className="text-4xl xl:text-5xl font-bold mb-4">
        DataPulse
      </h1>
      <p className="text-xl xl:text-2xl text-blue-100 font-light leading-relaxed max-w-md">
        Transform your <span className="text-white font-medium">data</span> into 
        <span className="text-white font-medium"> actionable insights</span> 
        with <span className="text-white font-medium">powerful analytics</span>
      </p>
    </div>

    {/* Features Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 max-w-lg xl:max-w-xl">
      {[
        { icon: BarChart3, title: "Real-time Analytics", desc: "Live metric tracking and anomaly detection" },
        { icon: Database, title: "Data Ingestion", desc: "Import from CSV, APIs, and databases" },
        { icon: BellRing, title: "Smart Alerting", desc: "Instant alerts on thresholds and anomalies" },
        { icon: ShieldCheck, title: "Enterprise-Ready", desc: "Scalable, secure, and integration friendly" }
      ].map((f, i) => {
        const Icon = f.icon;
        return (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center 
            hover:bg-white/20 hover:scale-105 transition-all duration-300 group shadow-lg"
          >
            <Icon className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-blue-100">{f.desc}</p>
          </div>
        );
      })}
    </div>

    {/* Additional Visual Element */}
    <div className="mt-8 lg:mt-10 xl:mt-12 text-center">
      <div className="flex items-center justify-center space-x-2 text-blue-100">
        <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <p className="text-sm text-blue-100 mt-3 font-light">
        DataPulse is designed for data teams of all sizes, from startups to enterprises.
      </p>
    </div>
  </div>
</div>

      </div>

          {showConfirm && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    {/* Modal box with scale animation */}
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center transform transition-all duration-300 scale-95 animate-fade-in">
                      <h2 className="text-lg font-bold text-gray-800 mb-2">
                        Are you sure?
                      </h2>
                      <p className="text-sm text-gray-600 mb-4">
                        You’ll lose your OTP and passcode progress if you go back.
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => setShowConfirm(false)}
                          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setStep("email");
                            setOtp(["", "", "", "", "", ""]);
                            setShowConfirm(false);
                          }}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all"
                        >
                          Yes, Go Back
                        </button>
                      </div>
                    </div>
                  </div>
                )}
    </div>

    
  );
};

export default Register;