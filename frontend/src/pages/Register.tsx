import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Mail, Lock, Eye, EyeOff, Check, BarChart3, BellRing, Database, ShieldCheck, UserIcon, AlertCircle } from 'lucide-react';
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

  // --------------------------------------------------------------------------
  // LOGIC PRESERVED
  // --------------------------------------------------------------------------

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
      }
    }
    setTimeout(() => setIsInitializing(false), 100);
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (step === 'otp') {
      localStorage.setItem('register-step', step);
    } else {
      localStorage.removeItem('register-step');
      localStorage.removeItem('register-otp'); 
    }
  }, [step, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    if (email) {
      localStorage.setItem('register-email', email);
    } else {
      localStorage.removeItem('register-email');
    }
  }, [email, isInitializing]);

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
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); 
    if (pastedData.length >= 6) {
      const newOtp = pastedData.slice(0, 6).split('');
      while (newOtp.length < 6) newOtp.push('');
      setOtp(newOtp);
      const lastFilledIndex = Math.min(5, pastedData.length - 1);
      setTimeout(() => otpRefs.current[lastFilledIndex]?.focus(), 0);
    } else if (pastedData.length > 0) {
      const newOtp = [...otp];
      const availableSlots = 6 - index;
      const dataToPaste = pastedData.slice(0, availableSlots);
      for (let i = 0; i < dataToPaste.length; i++) {
        if (index + i < 6) newOtp[index + i] = dataToPaste[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(5, index + dataToPaste.length);
      setTimeout(() => otpRefs.current[nextIndex]?.focus(), 0);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // UPDATED: Logic with 3-second delay
  const sendOtp = async (isFromResend = false) => {
    if (!isFromResend) setIsLoading(true);
    else setIsResending(true);

    const startTime = Date.now();
    let success = false;

    try {
        console.log("--- 📞 Calling API...");
        success = await register(email); 
    } catch (error) {
        console.error("Error during OTP process:", error);
    }

    // INTENTIONAL DELAY: Calculate remaining time to hit 3 seconds
    // Only apply this strictly to the main 'Verify Email' action, or both if preferred.
    // Here we apply it to the main action to ensure the user waits for the email.
    if (!isFromResend) {
        const elapsedTime = Date.now() - startTime;
        const minimumLoadTime = 3000; // 3000ms = 3 seconds
        const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);
        
        if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
    }

    // Now process the state updates
    if (success) {
        console.log("--- ✅ API Success. Setting Step to 'otp'");
        toast.success(
            isFromResend
                ? 'Request received! Your new OTP is on its way.'
                : 'Request received! Your OTP is on its way.'
        );
        
        setStep('otp');
        setOtp(['', '', '', '', '', '']);
        localStorage.removeItem('register-email'); 
    }

    // Reset Loading States
    if (!isFromResend) {
        setIsLoading(false);
    } else {
        setIsResending(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address.');
        return;
    }
    await sendOtp(false);
  };

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
      localStorage.removeItem('register-step');
      localStorage.removeItem('register-email');
      localStorage.removeItem('register-otp');
      toast.success('Account created successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

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
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-blue-100">
      
      {/* LEFT SIDE - FORM (40% Width) */}
      {/* Added 'custom-scrollbar' class here as requested */}
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
              {step === 'email' ? 'Create Account' : 'Complete Setup'}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 'email' 
                 ? 'Start your unlimited free trial. No credit card required.' 
                 : 'Verify your email and set your password.'
              }
            </p>
          </div>

          {/* STEP 1: EMAIL ENTRY */}
          {step === 'email' && (
            <div className="space-y-5">
              
              <GoogleLoginButton />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-white text-slate-400 font-medium">Or email</span>
                </div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
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
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                      Sending code...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </form>

              {/* Benefits Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">Included with account</p>
                <div className="space-y-2">
                    {[
                        "Real-time analytics dashboard",
                        "Unlimited data ingestion",
                        "24/7 Support access"
                    ].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="h-3.5 w-3.5 text-blue-600" />
                            <span>{benefit}</span>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OTP & DETAILS */}
          {step === 'otp' && (
            <div className="space-y-5">
              
              {/* Badge for Email */}
              <div className="bg-blue-50 border border-blue-100 text-blue-800 px-3 py-2 rounded-md flex items-center gap-2">
                 <Mail className="h-4 w-4 shrink-0" />
                 <span className="text-xs font-medium truncate">Code sent to <b>{email}</b></span>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                
                {/* OTP Inputs */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide text-center">
                    Verification Code
                  </label>
                  <div className="flex justify-between gap-1">
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
                        className="w-full aspect-square text-center text-lg font-bold rounded-md border border-slate-300 text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
                        placeholder="•"
                      />
                    ))}
                  </div>
                  {/* Resend Link */}
                  <div className="text-center">
                     <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {isResending ? 'Resending code...' : "Didn't receive code? Resend"}
                     </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-2"></div>

                {/* Name Input */}
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
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

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button
                     type="button"
                     onClick={() => setShowConfirm(true)}
                     className="flex justify-center items-center py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold shadow-sm transition-all text-sm"
                   >
                     Back
                   </button>
                   <button
                     type="submit"
                     disabled={isLoading}
                     className="flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                   >
                     {isLoading ? 'Creating...' : 'Create Account'}
                   </button>
                </div>

              </form>
            </div>
          )}

          {/* Footer Login Link */}
          <div className="text-center pt-6 pb-2">
             <p className="text-sm text-slate-600">
               Already have an account?{' '}
               <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                 Sign in
               </Link>
             </p>
          </div>

          {/* Terms */}
          <div className="text-center pt-4 border-t border-slate-100 mt-4">
              <p className="text-xs text-slate-400">
                By creating an account, you agree to our{' '}
                <Link to="/legal" className="underline hover:text-slate-600">Terms of Service</Link> and{' '}
                <Link to="/legal" className="underline hover:text-slate-600">Privacy Policy</Link>.
              </p>
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
                 <Activity className="h-5 w-5 text-blue-200" />
                 <span className="font-semibold tracking-wide text-white text-sm">DataPulse</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
                 Join the <span className="text-blue-200">revolution.</span>
              </h2>
              <p className="text-xl text-blue-100/90 leading-relaxed font-light max-w-xl">
                Start your journey with DataPulse today. Powerful analytics, simplified for everyone.
              </p>
           </div>

           {/* Features Grid */}
           <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { icon: BarChart3, title: "Real-time analytics", desc: "Track basic metrics and trends as data updates." },
                { icon: Database, title: "Data ingestion", desc: "Upload CSV files and work with structured datasets." },
                { icon: BellRing, title: "Alerts", desc: "Get notified when values cross defined limits." },
                { icon: ShieldCheck, title: "Private workspaces", desc: "Simple access control for shared projects." }
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
              Go back to step 1?
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              You will lose your OTP and progress if you go back to the email entry screen.
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
                  setStep("email");
                  setOtp(["", "", "", "", "", ""]);
                  setShowConfirm(false);
                }}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Register;