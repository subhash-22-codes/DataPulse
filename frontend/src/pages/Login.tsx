import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import GitHubLoginButton from '../components/GitHubButton';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // SaaS Logic: Where to go after login (defaults to /home)
  const from = location.state?.from?.pathname || '/home';
  useEffect(() => {
    const errorCode = searchParams.get('error');
    
    if (errorCode) {
      const errorMap: Record<string, string> = {
        'access_denied': 'GitHub login was cancelled.',
        'email_not_verified': 'Please verify your primary email on GitHub first.',
        'invalid_token': 'The GitHub session expired. Please try again.',
        'server_error': 'Internal server error.',
      };

      const message = errorMap[errorCode] || errorCode.replace(/_/g, ' ');
      
      toast.error(message, {
        id: 'auth-error',
        style: { fontSize: '13px', background: '#334155', color: '#fff' }
      });
      
      setError(message);

      // OPTIONAL: Clean the URL so the error doesn't stay there if they refresh
      navigate(location.pathname, { replace: true });
    }
  }, [searchParams, navigate, location.pathname]);
  // --- Logic: Handle Login ---
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Logic: login() will hit the backend. 
      // The backend sets the HttpOnly cookies automatically.
      await login(email, password); 
      
      toast.success('Welcome back to DataPulse!', {
        style: { fontSize: '13px', background: '#334155', color: '#fff' }
      });
      
      navigate(from, { replace: true });
    } catch (err: any) {
       // Robust Error Handling for SaaS
       const errorMessage = err.response?.data?.detail || "Invalid email or password. Please try again.";
       setError(errorMessage);
       console.error("Login attempt failed:", err);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-blue-100">
      
      {/* LEFT SIDE - FORM (40% Width - PRESERVED & SCROLLABLE) */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-12 bg-white z-10 border-r border-slate-100 h-screen overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-sm mx-auto flex flex-col my-auto py-8">
        <div className="w-full max-w-sm mx-auto flex flex-col">
        
          {/* Mobile Header (Preserved EXACTLY) */}
          <div className="lg:hidden flex items-center gap-2 font-poppins">
            <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-auto object-contain" />
          </div>

          <div className="hidden lg:flex items-center gap-2 font-poppins">
            <img src="/DPLogo2.png" alt="DataPulse" className="h-8 w-auto object-contain" />
          </div>

          {/* Header Texts */}
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Good to see you again
            </h1>
            <p className="text-slate-500 text-sm font-light">
              Log in to your DataPulse workspace.
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-5">
            
            {/* Social Authentication Stack */}
            <div className="flex flex-col gap-3">
              <GoogleLoginButton />
              <GitHubLoginButton />
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white text-slate-400 font-medium">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              
              {/* Robust Error UI (Preserved) */}
              {error && (
                <div className="rounded-md bg-red-50 p-3 border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-xs font-medium text-red-800">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800/5 transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800/5 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </Link>
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
                    <span>Signing in…</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

            </form>

            {/* Signup Link */}
            <div className="text-center pt-2">
               <p className="text-sm text-slate-600">
                 New to DataPulse?{' '}
                 <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                   Create an account
                 </Link>
               </p>
            </div>

            {/* Legal Links (Preserved) */}
            <div className="text-center pt-6 border-t border-slate-100 mt-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                  By signing in, you agree to our{' '}
                  <Link to="/legal" className="underline hover:text-slate-600">Terms of Service</Link> and{' '}
                  <Link to="/legal" className="underline hover:text-slate-600">Privacy Policy</Link>.
                </p>
            </div>

          </div>
        </div>
      </div>
      </div>

      {/* RIGHT SIDE - BRANDING (60% Width - PRESERVED EXACTLY) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden items-center justify-center p-16">
        
        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
        
        <div className="relative z-10 w-full max-w-2xl text-white space-y-12">
            
           {/* Branding Header Section */}
           <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 rounded-lg bg-blue-500/10 px-4 py-2 border border-blue-400/20 backdrop-blur-sm">
                 <Activity className="h-5 w-5 text-blue-200" />
                 <span className="font-semibold tracking-wide text-white text-sm">DataPulse</span>
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
                 Continue <span className="text-blue-200 font-extrabold italic">where you left off.</span>
              </h2>
              <p className="text-xl text-blue-100/90 leading-relaxed font-light max-w-xl">
               Secure access to your existing workspaces and data.
              </p>
           </div>

           {/* Preserved Features Grid */}
           <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-3 text-blue-100/80 text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Workspaces remain isolated and secure</span>
              </div>

              <div className="flex items-center gap-3 text-blue-100/80 text-sm">
                <Lock className="h-4 w-4" />
                <span>Your data stays private and encrypted </span>
              </div>
            </div>
           {/* Brand Footer Section */}
           <div className="pt-8 border-t border-white/10 flex justify-between items-center text-[11px] text-blue-200/60 tracking-wide">
            <p>© 2025 DataPulse</p>

            <div className="flex items-center gap-4">
              <span>v1.1.0</span>

              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;