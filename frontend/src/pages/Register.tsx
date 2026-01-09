import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, Check, BarChart3, BellRing, Database, ShieldCheck, UserIcon, Loader2 } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import GitHubButton from '../components/GitHubButton'; // Added Import
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
 import axios from 'axios';
const Register: React.FC = () => {
  // ... [All states preserved exactly]
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
  const [resendTimer, setResendTimer] = useState(0);
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const passwordRequirements = [
    { label: '8+ characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'One special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  const isStrong = passwordRequirements.every(req => req.test(password));
  const isMatching = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    setIsInitializing(true);
    const savedStep = localStorage.getItem('register-step') as 'email' | 'otp' | null;
    const savedEmail = localStorage.getItem('register-email');
    const savedOtp = localStorage.getItem('register-otp');
    if (savedStep) setStep(savedStep);
    if (savedEmail) setEmail(savedEmail);
    if (savedOtp) {
      try {
        const parsedOtp = JSON.parse(savedOtp);
        if (Array.isArray(parsedOtp) && parsedOtp.length === 6) setOtp(parsedOtp);
      } catch (e) { console.error(e); }
    }
    setTimeout(() => setIsInitializing(false), 100);
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (step === 'otp') localStorage.setItem('register-step', step);
    else { localStorage.removeItem('register-step'); localStorage.removeItem('register-otp'); }
  }, [step, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    if (email) localStorage.setItem('register-email', email);
    else localStorage.removeItem('register-email');
  }, [email, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    if (step === 'otp') localStorage.setItem('register-otp', JSON.stringify(otp));
  }, [otp, step, isInitializing]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1 || !/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); 
    if (pastedData.length >= 6) {
      const newOtp = pastedData.slice(0, 6).split('');
      while (newOtp.length < 6) newOtp.push('');
      setOtp(newOtp);
      setTimeout(() => otpRefs.current[Math.min(5, pastedData.length - 1)]?.focus(), 0);
    } else if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) { if (index + i < 6) newOtp[index + i] = pastedData[i]; }
      setOtp(newOtp);
      setTimeout(() => otpRefs.current[Math.min(5, index + pastedData.length)]?.focus(), 0);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const sendOtp = async (isFromResend = false) => {
    if (isFromResend && resendTimer > 0) return;
    if (!isFromResend) setIsLoading(true); 
    else setIsResending(true);

    const startTime = Date.now();
    try { 
      const success = await register(email); 

      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, 2000 - elapsed);
      if (waitTime > 0) await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (success) {
        toast.success(isFromResend ? 'New OTP on its way.' : 'OTP on its way.');
        setStep('otp'); 
        setOtp(['', '', '', '', '', '']);
        localStorage.removeItem('register-email'); 
        setResendTimer(60); 
      }
    } catch (err: unknown) { 
      let detail = "Failed to send OTP";
      let status: number | undefined;

      if (axios.isAxiosError(err)) {
        status = err.response?.status;
        detail = err.response?.data?.detail || detail;
      }

      if (status === 429) {
        toast.error(detail);
        setResendTimer(60); 
      } else {
        toast.error(detail);
      }
    } finally {
      if (!isFromResend) setIsLoading(false); 
      else setIsResending(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) { toast.error('Valid email required.'); return; }
    await sendOtp(false);
  };

  const handleBackToLogin = () => {
    localStorage.removeItem('register-step');
    localStorage.removeItem('register-email');
    localStorage.removeItem('register-otp');
    navigate('/login');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (name.trim().length === 0) return toast.error('Enter full name');
    if (otpCode.length !== 6) return toast.error('Enter 6-digit OTP');
    if (password !== confirmPassword) return toast.error('Passwords mismatch');
    if (!isStrong) return toast.error('Password does not meet requirements');

    setIsLoading(true);
    try {
      await verifyOtp(name, email, otpCode, password);
      
      localStorage.removeItem('register-step');
      localStorage.removeItem('register-email');
      localStorage.removeItem('register-otp');
      
      toast.success('Account created! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) { 
      let detail = "Verification failed";
      let status: number | undefined;
      if (axios.isAxiosError(err)) {
        status = err.response?.status;
        detail = err.response?.data?.detail || detail;
      }

      if (status === 403) {
        toast.error(detail);
        setStep('email');
        setOtp(['', '', '', '', '', '']); 
      } else if (status === 401) {
        toast.error(detail);
        setOtp(['', '', '', '', '', '']); 
        otpRefs.current[0]?.focus(); 
      } else {
        toast.error(detail);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      
      {/* LEFT SIDE - FORM (40% Width - PRESERVED) */}
      <div className="w-full lg:w-[40%] flex flex-col px-6 py-8 sm:px-8 lg:px-12 bg-white z-10 border-r border-slate-100 h-screen overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-sm mx-auto flex flex-col my-auto py-8">
        <div className="w-full max-w-sm mx-auto flex flex-col">


          {/* MOBILE HEADER (Preserved EXACTLY) */}
          <div className="lg:hidden flex items-center gap-2 font-poppins">
            <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-auto object-contain" />
          </div>

          <div className="hidden lg:flex items-center gap-2 font-poppins">
            <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-auto object-contain" />
          </div>

          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {step === 'email' ? 'Create Account' : 'Complete Setup'}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 'email'
                ? 'Start using DataPulse today. No credit card required.'
                : 'Verify your email and set your password.'}
            </p>
          </div>
          {/* STEP 1: EMAIL ENTRY */}
          {step === 'email' && (
            <div className="space-y-5">
              
              {/* SOCIAL BUTTONS (GitHub Added) */}
              <div className="flex flex-col gap-3">
                <GoogleLoginButton />
                <GitHubButton /> 
              </div>

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
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors" placeholder="name@example.com" />
                  </div>
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
                    text-[11px] sm:text-[12px] font-manrope font-bold tracking-widest
                    shadow-sm 
                    transition-all active:scale-[0.98]
                    disabled:opacity-20 disabled:cursor-not-allowed
                  "
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending code...</span>
                    </div>
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">After you sign up</p>
                <div className="space-y-2">
                    {["Create your first workspace", "Upload a CSV or connect a data source", "View live metrics and trends"].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="h-3.5 w-3.5 text-blue-600" /> <span>{benefit}</span>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OTP (Preserved exactly as you wrote it) */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-0.5 text-slate-700">
                <div className="flex items-center gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Code sent to <span className="font-medium">{email}</span>
                  </span>
                </div>

                <span className="text-[11px] leading-tight text-slate-500">
                  Didn't receive it? Check spam or promotions.
                </span>
              </div>


              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide text-center">Verification Code</label>
                  <div className="flex justify-between gap-1">
                    {otp.map((digit, index) => (
                      <input key={index} ref={(el) => (otpRefs.current[index] = el)} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onPaste={(e) => handleOtpPaste(e, index)} onKeyDown={(e) => handleOtpKeyDown(index, e)} className="w-full aspect-square text-center text-lg font-bold rounded-md border border-slate-300 text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors" placeholder="•" />
                    ))}
                  </div>
                  <div className="text-center">
                     <button 
                        type="button" 
                        onClick={() => sendOtp(true)} 
                        disabled={isResending || resendTimer > 0} 
                        className="text-xs font-bold font-manrope text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isResending ? (
                          'Resending code...'
                        ) : resendTimer > 0 ? (
                          `Try again in ${resendTimer}s`
                        ) : (
                          "Didn't receive code? Resend"
                        )}
                      </button>
                  </div>
                </div>
                <div className="h-px bg-slate-100 my-2"></div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors" placeholder="John Doe" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="block w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-0 transition-colors" 
                      placeholder="••••••••" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Smooth Transition Checklist: Vanishes when isStrong is true */}
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${password.length > 0 && !isStrong ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {passwordRequirements.map((req, i) => {
                        const met = req.test(password);
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Confirm Password</label>
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
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Smooth Transition Status: Mismatch to Match */}
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
               <div className="grid grid-cols-2 gap-3 pt-4">
                  {/* BACK: Neutral Maintenance Action */}
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(true)} 
                    className="
                      flex items-center justify-center
                      h-10 sm:h-11
                      bg-white border border-slate-200
                      rounded-sm 
                      text-[10px] sm:text-[11px] font-bold text-slate-400 font-manrope tracking-widest
                      hover:text-slate-900 hover:border-slate-300
                      transition-all active:scale-[0.98]
                    "
                  >
                    Back
                  </button>

                  {/* CREATE: Primary Growth Action */}
                  <button
                    type="submit"
                    disabled={isLoading || !isStrong || !isMatching}
                    className="
                      flex items-center justify-center gap-2
                      h-10 sm:h-11
                      bg-blue-600 hover:bg-blue-700 
                      text-white 
                      rounded-sm 
                      text-[10px] sm:text-[11px] font-manrope font-bold tracking-widest
                      shadow-sm 
                      transition-all active:scale-[0.98]
                      disabled:opacity-20 disabled:cursor-not-allowed
                    "
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="text-center pt-6 pb-2 text-sm text-slate-600">
            Already have an account?{' '}
            <button 
              onClick={handleBackToLogin} 
              className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Sign in
            </button>
          </div>
          <div className="text-center pt-4 border-t border-slate-100 mt-4 text-xs text-slate-400">
             By creating an account, you agree to our <Link to="/legal" className="underline hover:text-slate-600">Terms</Link> and <Link to="/legal" className="underline hover:text-slate-600">Privacy</Link>.
          </div>
        </div>
      </div>
      </div>

      {/* RIGHT SIDE - BRANDING (60% - PRESERVED EXACTLY) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
        <div className="relative z-10 w-full max-w-2xl text-white space-y-12">
           <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 rounded-lg bg-blue-500/10 px-4 py-2 border border-blue-400/20 backdrop-blur-sm">
                 <Activity className="h-5 w-5 text-blue-200" /> <span className="font-semibold text-sm">DataPulse</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight"> Understand <span className="text-blue-200">your data, clearly.</span></h2>
              <p className="text-xl text-blue-100/90 leading-relaxed font-light max-w-xl">A simple way to monitor your data and stay informed when something changes.</p>
           </div>
           <div className="grid grid-cols-2 gap-x-8 gap-y-10">
             {[
                { icon: BarChart3, title: "Live metrics", desc: "View metrics and trends as your data updates over time." },
                { icon: Database, title: "Data sources", desc: "Upload CSV files or connect APIs and databases securely." },
                { icon: BellRing, title: "Smart alerts", desc: "Receive alerts when monitored values change or reach set conditions." },
                { icon: ShieldCheck, title: "Private workspaces", desc: "Keep projects organized with isolated, private workspaces." }
             ].map((f, i) => (
                <div key={i} className="flex flex-col gap-2">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10"><f.icon className="h-5 w-5 text-blue-200" /></div>
                      <h3 className="font-semibold text-white text-base">{f.title}</h3>
                   </div>
                   <p className="text-sm text-blue-100/70 leading-relaxed pl-12">{f.desc}</p>
                </div>
             ))}
           </div>
           <div className="pt-8 border-t border-white/10 flex justify-between items-center text-xs text-blue-200/60">
             <p>© 2025 DataPulse. Built with care and transparency.</p>
             <div className="flex gap-4"><span>v1.1.0</span><span>System Normal</span></div>
           </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL (PRESERVED EXACTLY) */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center border border-slate-100 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Cancel account creation?
            </h2>

            <p className="text-sm text-slate-600 mb-6">
              If you <strong>go back</strong>, your current verification code will be invalidated and you’ll need to request a new one.
            </p>

            <div className="flex gap-2 w-full pt-2">
              {/* SAFE ACTION: Keep going */}
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="
                  flex-1 
                  h-10 sm:h-11
                  rounded-sm border border-slate-200 
                  bg-white
                  text-[10px] sm:text-[11px] font-manrope font-bold text-slate-400  tracking-widest 
                  hover:text-slate-900 hover:border-slate-300
                  transition-all active:scale-[0.98]
                "
              >
                No, keep going
              </button>

              {/* DESTRUCTIVE ACTION: Cancel/Reset */}
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('register-step');
                  localStorage.removeItem('register-email');
                  localStorage.removeItem('register-otp');
                  setStep("email");
                  setOtp(["", "", "", "", "", ""]);
                  setShowConfirm(false);
                }}
                className="
                  flex-1 
                  h-10 sm:h-11
                  bg-red-600 hover:bg-red-700 
                  rounded-sm 
                  text-[10px] sm:text-[11px] font-manrope font-bold text-white tracking-widest 
                  shadow-sm transition-all active:scale-[0.98]
                "
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Register;